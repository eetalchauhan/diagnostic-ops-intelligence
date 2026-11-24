package com.diagnosticops.dsa;

import com.diagnosticops.entity.CollectionCentre;
import com.diagnosticops.entity.SampleOrder;
import com.diagnosticops.entity.TestCatalog;
import com.diagnosticops.service.ReferenceClockService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class DsaAnalyticsEngineTest {

    private DsaAnalyticsEngine engine;
    private CollectionCentre centre;
    private TestCatalog cbcTest;
    private TestCatalog vitdTest;
    private LocalDateTime fixedNow;

    @BeforeEach
    void setUp() {
        fixedNow = LocalDateTime.now();
        ReferenceClockService clockService = new ReferenceClockService(null) {
            @Override
            public LocalDateTime getReferenceNow() {
                return fixedNow;
            }
        };
        engine = new DsaAnalyticsEngine(null, clockService);

        centre = CollectionCentre.builder()
                .centreId(1)
                .centreCode("DL-LP-01")
                .centreName("Lajpat Nagar Collection Centre")
                .city("New Delhi")
                .hubCourierCutoffHour(13)
                .build();

        cbcTest = TestCatalog.builder()
                .testCode("CBC")
                .testName("Complete Blood Count")
                .department("Hematology")
                .processingType("IN_HOUSE")
                .standardSlaMinutes(180)
                .priceInr(new BigDecimal("350.00"))
                .build();

        vitdTest = TestCatalog.builder()
                .testCode("VITD")
                .testName("25-OH Vitamin D")
                .department("Immunoassay")
                .processingType("EXTERNAL_HUB")
                .standardSlaMinutes(720)
                .priceInr(new BigDecimal("1400.00"))
                .build();
    }

    @Test
    @DisplayName("Min-Heap: Emergency STAT samples should always be prioritized first")
    void testMinHeapStatPriorityOrdering() {
        LocalDateTime now = fixedNow;

        // Sample 1: Non-STAT with negative slack (already near breach)
        SampleOrder normalOrder = SampleOrder.builder()
                .sampleId(101L)
                .barcode("LPL-01-101")
                .centre(centre)
                .test(cbcTest)
                .isStatUrgent(false)
                .currentStatus("ACCESSIONED")
                .collectedAt(now.minusMinutes(120))
                .expectedReadyAt(now.plusMinutes(60))
                .build();

        // Sample 2: STAT Urgent sample with ample slack
        SampleOrder statOrder = SampleOrder.builder()
                .sampleId(102L)
                .barcode("LPL-01-102")
                .centre(centre)
                .test(cbcTest)
                .isStatUrgent(true)
                .currentStatus("COLLECTED")
                .collectedAt(now.minusMinutes(10))
                .expectedReadyAt(now.plusMinutes(170))
                .build();

        engine.registerNewPendingSample(normalOrder, 150.0, 0.40, "MEDIUM");
        engine.registerNewPendingSample(statOrder, 90.0, 0.10, "LOW");

        assertEquals(2, engine.getActivePendingCount());

        // Min-heap peek should return the STAT urgent sample
        SampleTriageNode highestRisk = engine.peekHighestRiskSample();
        assertNotNull(highestRisk);
        assertEquals(102L, highestRisk.getSampleId());
        assertTrue(highestRisk.isStatUrgent());
    }

    @Test
    @DisplayName("Min-Heap: Orders samples by lowest dynamic SLA slack when STAT status is identical")
    void testMinHeapSlaSlackOrdering() {
        LocalDateTime now = fixedNow;

        // Sample 1: Healthy SLA slack (expected in 120 mins, tat predicted 60 mins -> slack ~ 90 mins)
        SampleOrder healthyOrder = SampleOrder.builder()
                .sampleId(201L)
                .barcode("LPL-01-201")
                .centre(centre)
                .test(cbcTest)
                .isStatUrgent(false)
                .currentStatus("COLLECTED")
                .collectedAt(now.minusMinutes(10))
                .expectedReadyAt(now.plusMinutes(120))
                .build();

        // Sample 2: Critical SLA breach risk (already past expected SLA -> negative slack)
        SampleOrder breachedOrder = SampleOrder.builder()
                .sampleId(202L)
                .barcode("LPL-01-202")
                .centre(centre)
                .test(cbcTest)
                .isStatUrgent(false)
                .currentStatus("IN_HOUSE_PROCESSING")
                .collectedAt(now.minusMinutes(200))
                .expectedReadyAt(now.minusMinutes(20))
                .build();

        engine.registerNewPendingSample(healthyOrder, 60.0, 0.05, "LOW");
        engine.registerNewPendingSample(breachedOrder, 180.0, 0.95, "HIGH");

        List<SampleTriageNode> atRisk = engine.getTopAtRiskSamples(10);
        assertEquals(2, atRisk.size());
        assertEquals(202L, atRisk.get(0).getSampleId(), "Most negative slack sample must be ranked first");
        assertEquals(201L, atRisk.get(1).getSampleId());
    }

    @Test
    @DisplayName("Sliding Window: Correctly computes rolling 4-hour moving average TAT and evicts expired records")
    void testSlidingWindowEvictionAndAverages() {
        LocalDateTime baseTime = fixedNow;

        // Sample completed 60 minutes ago: 100 min TAT (non-breached)
        engine.recordSampleCompletion(301L, baseTime.minusMinutes(60), 100, false, "IN_HOUSE");

        // Sample completed 30 minutes ago: 200 min TAT (breached)
        engine.recordSampleCompletion(302L, baseTime.minusMinutes(30), 200, true, "IN_HOUSE");

        // Rolling Average should be (100 + 200) / 2 = 150.0
        assertEquals(150.0, engine.getRollingAverageTatMinutes(), 0.01);

        // Breach percentage should be 1 / 2 = 50.0%
        assertEquals(50.0, engine.getRollingBreachPercentage(), 0.01);

        // Record a third sample completed 250 minutes in future (which makes samples 301 and 302 older than 240 mins)
        LocalDateTime futureTime = baseTime.plusMinutes(250);
        engine.recordSampleCompletion(303L, futureTime, 120, false, "IN_HOUSE");

        // Previous entries evicted, only 303 remains
        assertEquals(120.0, engine.getRollingAverageTatMinutes(), 0.01);
        assertEquals(0.0, engine.getRollingBreachPercentage(), 0.01);
    }

    @Test
    @DisplayName("HashMaps: O(1) frequency counters accurately update test-code and processing-type counts")
    void testHashMapFrequencyCounters() {
        engine.recordSampleIntake("CBC", "IN_HOUSE");
        engine.recordSampleIntake("CBC", "IN_HOUSE");
        engine.recordSampleIntake("HBA1C", "IN_HOUSE");
        engine.recordSampleIntake("VITD", "EXTERNAL_HUB");

        Map<String, Integer> freqs = engine.getTestCodeFrequencies();
        assertEquals(2, freqs.get("CBC"));
        assertEquals(1, freqs.get("HBA1C"));
        assertEquals(1, freqs.get("VITD"));

        Map<String, Long> procCounts = engine.getProcessingTypeCounts();
        assertEquals(3L, procCounts.get("IN_HOUSE"));
        assertEquals(1L, procCounts.get("EXTERNAL_HUB"));
    }

    @Test
    @DisplayName("Queue + Comparator: Correctly sequences batch dispatch simulation")
    void testChainedComparatorSimulation() {
        LocalDateTime now = fixedNow;

        SampleOrder breachedOrder = SampleOrder.builder()
                .sampleId(401L)
                .barcode("LPL-01-401")
                .centre(centre)
                .test(cbcTest)
                .isStatUrgent(false)
                .isSlaBreached(true)
                .currentStatus("IN_HOUSE_PROCESSING")
                .expectedReadyAt(now.minusMinutes(10))
                .build();

        SampleOrder statOrder = SampleOrder.builder()
                .sampleId(402L)
                .barcode("LPL-01-402")
                .centre(centre)
                .test(cbcTest)
                .isStatUrgent(true)
                .isSlaBreached(false)
                .currentStatus("COLLECTED")
                .expectedReadyAt(now.plusMinutes(120))
                .build();

        SampleOrder normalOrder = SampleOrder.builder()
                .sampleId(403L)
                .barcode("LPL-01-403")
                .centre(centre)
                .test(vitdTest)
                .isStatUrgent(false)
                .isSlaBreached(false)
                .currentStatus("ACCESSIONED")
                .expectedReadyAt(now.plusMinutes(600))
                .build();

        List<SampleOrder> pendingList = Arrays.asList(normalOrder, statOrder, breachedOrder);
        List<DispatchSimulationResult> results = engine.simulateBatchDispatchQueue(pendingList);

        assertEquals(3, results.size());
        assertEquals(401L, results.get(0).getSampleId(), "Breached sample must be dispatched first");
        assertEquals(402L, results.get(1).getSampleId(), "STAT urgent sample must be dispatched second");
        assertEquals(403L, results.get(2).getSampleId(), "Normal sample dispatched third");
    }

    @Test
    @DisplayName("Lifecycle Update: Departing delivered samples should be evicted from Min-Heap")
    void testLifecycleDepartureFromMinHeap() {
        LocalDateTime now = fixedNow;

        SampleOrder order = SampleOrder.builder()
                .sampleId(501L)
                .barcode("LPL-01-501")
                .centre(centre)
                .test(cbcTest)
                .isStatUrgent(false)
                .currentStatus("COLLECTED")
                .collectedAt(now.minusMinutes(30))
                .expectedReadyAt(now.plusMinutes(150))
                .build();

        engine.registerNewPendingSample(order, 120.0, 0.1, "LOW");
        assertEquals(1, engine.getActivePendingCount());

        // Advance to ACCESSIONED
        engine.updateSampleLifecycle(501L, "ACCESSIONED", null, null, false, "IN_HOUSE");
        assertEquals(1, engine.getActivePendingCount());

        // Advance to DELIVERED
        engine.updateSampleLifecycle(501L, "DELIVERED", now, 45, false, "IN_HOUSE");
        assertEquals(0, engine.getActivePendingCount(), "Delivered sample must be evicted from pending triage heap");
    }
}
