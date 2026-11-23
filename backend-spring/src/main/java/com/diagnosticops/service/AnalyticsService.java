package com.diagnosticops.service;

import com.diagnosticops.dsa.DispatchSimulationResult;
import com.diagnosticops.dsa.DsaAnalyticsEngine;
import com.diagnosticops.dsa.SampleTriageNode;
import com.diagnosticops.dto.DashboardKpiResponse;
import com.diagnosticops.entity.SampleOrder;
import com.diagnosticops.repository.SampleOrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final DsaAnalyticsEngine dsaAnalyticsEngine;
    private final SampleOrderRepository sampleOrderRepository;

    public DashboardKpiResponse getDashboardKpi() {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = startOfDay.plusDays(1);

        long totalOrdersToday = sampleOrderRepository.countByCollectedAtBetween(startOfDay, endOfDay);
        int activePending = dsaAnalyticsEngine.getActivePendingCount();
        double rollingTat = Math.round(dsaAnalyticsEngine.getRollingAverageTatMinutes() * 10.0) / 10.0;
        double rollingBreach = Math.round(dsaAnalyticsEngine.getRollingBreachPercentage() * 10.0) / 10.0;
        double velocity = Math.round(dsaAnalyticsEngine.getHourlyThroughputVelocity() * 10.0) / 10.0;

        Map<String, Long> procCounts = dsaAnalyticsEngine.getProcessingTypeCounts();
        long inHouse = procCounts.getOrDefault("IN_HOUSE", 0L);
        long extHub = procCounts.getOrDefault("EXTERNAL_HUB", 0L);
        long totalProc = inHouse + extHub;

        double inHousePct = totalProc > 0 ? Math.round(((double) inHouse / totalProc) * 1000.0) / 10.0 : 0.0;
        double extHubPct = totalProc > 0 ? Math.round(((double) extHub / totalProc) * 1000.0) / 10.0 : 0.0;

        Map<String, Integer> testFreqs = dsaAnalyticsEngine.getTestCodeFrequencies();
        List<SampleTriageNode> topAtRisk = dsaAnalyticsEngine.getTopAtRiskSamples(15);
        Map<String, Object> latencyBench = dsaAnalyticsEngine.benchmarkTriageRetrievalLatency();

        // Hourly intake distribution today
        List<Object[]> hourlyDb = sampleOrderRepository.findHourlyIntakeDistribution(startOfDay.minusDays(1));
        List<Map<String, Object>> hourlyList = new ArrayList<>();
        for (Object[] row : hourlyDb) {
            Map<String, Object> item = new HashMap<>();
            Number hr = (Number) row[0];
            Number cnt = (Number) row[1];
            item.put("hour", hr != null ? hr.intValue() : 0);
            item.put("volume", cnt != null ? cnt.longValue() : 0);
            hourlyList.add(item);
        }

        return DashboardKpiResponse.builder()
                .totalOrdersToday(totalOrdersToday)
                .activePendingCount(activePending)
                .rollingAvgTatMinutes(rollingTat)
                .rollingBreachRatePercentage(rollingBreach)
                .congestionVelocityPerHour(velocity)
                .inHouseCount(inHouse)
                .externalHubCount(extHub)
                .inHousePercentage(inHousePct)
                .externalHubPercentage(extHubPct)
                .topTestFrequencies(testFreqs)
                .hourlyIntakeDistribution(hourlyList)
                .topAtRiskSamples(topAtRisk)
                .latencyBenchmark(latencyBench)
                .build();
    }

    public List<DispatchSimulationResult> runDispatchSimulation(int limit) {
        List<SampleOrder> pendingOrders = sampleOrderRepository.findByActualReadyAtIsNull();
        if (limit > 0 && pendingOrders.size() > limit) {
            pendingOrders = pendingOrders.subList(0, limit);
        }
        return dsaAnalyticsEngine.simulateBatchDispatchQueue(pendingOrders);
    }
}
