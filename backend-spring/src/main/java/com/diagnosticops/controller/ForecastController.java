package com.diagnosticops.controller;

import com.diagnosticops.service.ForecastService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/forecasts")
@RequiredArgsConstructor
public class ForecastController {

    private final ForecastService forecastService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getForecasts(
            @RequestParam(required = false, defaultValue = "1") Integer centreId,
            @RequestParam(required = false, defaultValue = "IN_HOUSE") String processingType,
            @RequestParam(required = false, defaultValue = "7") Integer horizonDays
    ) {
        return ResponseEntity.ok(forecastService.getForecastAndMetrics(centreId, processingType, horizonDays));
    }
}
