package com.diagnosticops.dto;

import com.diagnosticops.dsa.SampleTriageNode;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardKpiResponse {
    private long totalOrdersToday;
    private int activePendingCount;
    private double rollingAvgTatMinutes;
    private double rollingBreachRatePercentage;
    private double congestionVelocityPerHour;
    private long inHouseCount;
    private long externalHubCount;
    private double inHousePercentage;
    private double externalHubPercentage;
    private Map<String, Integer> topTestFrequencies;
    private List<Map<String, Object>> hourlyIntakeDistribution;
    private List<SampleTriageNode> topAtRiskSamples;
    private Map<String, Object> latencyBenchmark;
}
