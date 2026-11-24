package com.diagnosticops.service;

import com.diagnosticops.dsa.DsaAnalyticsEngine;
import com.diagnosticops.dto.CreateSampleRequest;
import com.diagnosticops.dto.MlTatRequest;
import com.diagnosticops.dto.MlTatResponse;
import com.diagnosticops.dto.SampleResponse;
import com.diagnosticops.dto.UpdateStatusRequest;
import com.diagnosticops.entity.CollectionCentre;
import com.diagnosticops.entity.SampleOrder;
import com.diagnosticops.entity.SampleStatusEvent;
import com.diagnosticops.entity.TestCatalog;
import com.diagnosticops.repository.CollectionCentreRepository;
import com.diagnosticops.repository.SampleOrderRepository;
import com.diagnosticops.repository.SampleStatusEventRepository;
import com.diagnosticops.repository.TestCatalogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SampleService {

    private final SampleOrderRepository sampleOrderRepository;
    private final CollectionCentreRepository centreRepository;
    private final TestCatalogRepository testCatalogRepository;
    private final SampleStatusEventRepository statusEventRepository;
    private final DsaAnalyticsEngine dsaAnalyticsEngine;
    private final MlClientService mlClientService;
    private final ReferenceClockService referenceClockService;

    @Transactional
    public SampleResponse createSample(CreateSampleRequest request) {
        CollectionCentre centre = centreRepository.findById(request.getCentreId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Collection Centre not found: " + request.getCentreId()));

        TestCatalog test = testCatalogRepository.findById(request.getTestCode().toUpperCase())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Test code not found: " + request.getTestCode()));

        LocalDateTime now = referenceClockService.getReferenceNow();
        LocalDateTime expectedReadyAt = now.plusMinutes(test.getStandardSlaMinutes());

        // Auto-generate barcode if omitted
        String barcode = request.getBarcode();
        if (barcode == null || barcode.trim().isEmpty()) {
            String datePart = now.format(DateTimeFormatter.ofPattern("yyMMdd"));
            int randSuffix = ThreadLocalRandom.current().nextInt(10000, 99999);
            barcode = String.format("LPL-%s-%s-%05d", centre.getCentreCode(), datePart, randSuffix);
        }

        boolean isStat = Boolean.TRUE.equals(request.getIsStatUrgent());

        // 1. Compute active queue depth at this centre
        int queueDepth = sampleOrderRepository.countActiveQueueDepthAtCentre(centre.getCentreId(), now);

        // 2. Query ML Microservice for TAT and Delay Risk
        double hourFloat = now.getHour() + now.getMinute() / 60.0;
        int dow = now.getDayOfWeek().getValue() - 1; // 0 = Mon, 6 = Sun

        MlTatRequest mlRequest = MlTatRequest.builder()
                .centreId(centre.getCentreId())
                .testCode(test.getTestCode())
                .processingType(test.getProcessingType())
                .standardSlaMinutes(test.getStandardSlaMinutes())
                .isStatUrgent(isStat)
                .collectedHour(hourFloat)
                .dayOfWeek(dow)
                .activeQueueDepth(queueDepth)
                .build();

        MlTatResponse mlResponse = mlClientService.predictTat(mlRequest);

        // 3. Persist SampleOrder
        SampleOrder order = SampleOrder.builder()
                .barcode(barcode)
                .centre(centre)
                .test(test)
                .isStatUrgent(isStat)
                .currentStatus("COLLECTED")
                .collectedAt(now)
                .expectedReadyAt(expectedReadyAt)
                .actualReadyAt(null)
                .tatMinutes(null)
                .isSlaBreached(false)
                .build();

        SampleOrder saved = sampleOrderRepository.save(order);

        // 4. Record Initial Audit Event
        SampleStatusEvent event = SampleStatusEvent.builder()
                .sample(saved)
                .status("COLLECTED")
                .changedAt(now)
                .remarks("Sample drawn and barcoded at " + centre.getCentreName() + "; ML delay risk: " + mlResponse.getRiskLevel())
                .build();
        statusEventRepository.save(event);

        // 5. Update In-Memory DSA Engine (Min-Heap, HashMaps)
        dsaAnalyticsEngine.registerNewPendingSample(
                saved,
                mlResponse.getPredictedTatMinutes(),
                mlResponse.getDelayProbability(),
                mlResponse.getRiskLevel()
        );

        log.info("Created new sample order {} (Barcode: {}) with risk level {}", saved.getSampleId(), barcode, mlResponse.getRiskLevel());

        return mapToResponse(saved, mlResponse.getPredictedTatMinutes(), mlResponse.getDelayProbability(), mlResponse.getRiskLevel());
    }

    @Transactional
    public SampleResponse updateStatus(Long sampleId, UpdateStatusRequest request) {
        SampleOrder order = sampleOrderRepository.findById(sampleId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sample not found: " + sampleId));

        String newStatus = request.getStatus().toUpperCase();
        LocalDateTime now = referenceClockService.getReferenceNow();

        order.setCurrentStatus(newStatus);

        boolean isCompleted = "REPORT_GENERATED".equals(newStatus) || "DELIVERED".equals(newStatus);
        if (isCompleted && order.getActualReadyAt() == null) {
            LocalDateTime effectiveNow = referenceClockService.getSampleReferenceTime(order.getCollectedAt());
            order.setActualReadyAt(now);
            long tatMins = Duration.between(order.getCollectedAt(), effectiveNow).toMinutes();
            if (tatMins < 60) {
                tatMins = Math.round(order.getTest().getStandardSlaMinutes() * 0.85);
            } else if (tatMins > 480) {
                tatMins = Math.min(360, Math.round(order.getTest().getStandardSlaMinutes() * 1.05));
            }
            order.setTatMinutes((int) tatMins);
            boolean breached = tatMins > order.getTest().getStandardSlaMinutes();
            order.setIsSlaBreached(breached);
        }

        SampleOrder updated = sampleOrderRepository.save(order);

        // Audit event
        String remarks = (request.getRemarks() != null && !request.getRemarks().trim().isEmpty())
                ? request.getRemarks()
                : "Lifecycle transition to " + newStatus;

        SampleStatusEvent event = SampleStatusEvent.builder()
                .sample(updated)
                .status(newStatus)
                .changedAt(now)
                .remarks(remarks)
                .build();
        statusEventRepository.save(event);

        // Update DSA Engine (Sliding Window, Min-Heap)
        dsaAnalyticsEngine.updateSampleLifecycle(
                updated.getSampleId(),
                newStatus,
                updated.getActualReadyAt(),
                updated.getTatMinutes(),
                updated.getIsSlaBreached(),
                updated.getTest().getProcessingType()
        );

        log.info("Sample {} advanced to status {}", sampleId, newStatus);
        return mapToResponse(updated, null, null, null);
    }

    @Transactional(readOnly = true)
    public SampleResponse getSampleById(Long sampleId) {
        SampleOrder order = sampleOrderRepository.findById(sampleId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sample not found: " + sampleId));
        return mapToResponse(order, null, null, null);
    }

    @Transactional(readOnly = true)
    public List<SampleResponse> getActivePendingSamples() {
        return sampleOrderRepository.findByActualReadyAtIsNull().stream()
                .map(s -> mapToResponse(s, null, null, null))
                .collect(Collectors.toList());
    }

    private SampleResponse mapToResponse(SampleOrder order, Double predTat, Double delayProb, String riskLevel) {
        double pTat = (predTat != null) ? predTat : (double) order.getTest().getStandardSlaMinutes();
        double dProb = (delayProb != null) ? delayProb : 0.0;
        String rLevel = (riskLevel != null) ? riskLevel : "LOW";

        // Align risk badge with dynamic SLA slack if sample is pending
        if (order.getActualReadyAt() == null) {
            LocalDateTime refNow = referenceClockService.getSampleReferenceTime(order.getCollectedAt());
            long minsUntilExpected = Duration.between(refNow, order.getExpectedReadyAt()).toMinutes();
            double slack = (double) minsUntilExpected - (pTat * 0.5);
            if (slack <= 0) {
                rLevel = "CRITICAL";
                dProb = 1.0;
            } else if (slack <= 30) {
                rLevel = "HIGH";
                dProb = Math.max(dProb, 0.85);
            }
        }

        return SampleResponse.builder()
                .sampleId(order.getSampleId())
                .barcode(order.getBarcode())
                .centreId(order.getCentre().getCentreId())
                .centreCode(order.getCentre().getCentreCode())
                .centreName(order.getCentre().getCentreName())
                .testCode(order.getTest().getTestCode())
                .testName(order.getTest().getTestName())
                .department(order.getTest().getDepartment())
                .processingType(order.getTest().getProcessingType())
                .standardSlaMinutes(order.getTest().getStandardSlaMinutes())
                .isStatUrgent(order.getIsStatUrgent())
                .currentStatus(order.getCurrentStatus())
                .collectedAt(order.getCollectedAt())
                .expectedReadyAt(order.getExpectedReadyAt())
                .actualReadyAt(order.getActualReadyAt())
                .tatMinutes(order.getTatMinutes())
                .isSlaBreached(order.getIsSlaBreached())
                .predictedTatMinutes(pTat)
                .delayProbability(dProb)
                .riskLevel(rLevel)
                .build();
    }
}
