package com.diagnosticops.controller;

import com.diagnosticops.dsa.DispatchSimulationResult;
import com.diagnosticops.dsa.DsaAnalyticsEngine;
import com.diagnosticops.dto.DashboardKpiResponse;
import com.diagnosticops.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;
    private final DsaAnalyticsEngine dsaAnalyticsEngine;

    @GetMapping("/dashboard")
    public ResponseEntity<DashboardKpiResponse> getDashboard() {
        return ResponseEntity.ok(analyticsService.getDashboardKpi());
    }

    @GetMapping("/simulation")
    public ResponseEntity<List<DispatchSimulationResult>> getDispatchSimulation(
            @RequestParam(defaultValue = "30") int limit
    ) {
        return ResponseEntity.ok(analyticsService.runDispatchSimulation(limit));
    }

    @GetMapping("/benchmark")
    public ResponseEntity<Map<String, Object>> getLatencyBenchmark() {
        return ResponseEntity.ok(dsaAnalyticsEngine.benchmarkTriageRetrievalLatency());
    }
}
