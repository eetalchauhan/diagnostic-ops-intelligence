package com.diagnosticops.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SampleResponse {
    private Long sampleId;
    private String barcode;
    private Integer centreId;
    private String centreCode;
    private String centreName;
    private String testCode;
    private String testName;
    private String department;
    private String processingType;
    private Integer standardSlaMinutes;
    private Boolean isStatUrgent;
    private String currentStatus;
    private LocalDateTime collectedAt;
    private LocalDateTime expectedReadyAt;
    private LocalDateTime actualReadyAt;
    private Integer tatMinutes;
    private Boolean isSlaBreached;

    // ML Predictive Metadata
    private Double predictedTatMinutes;
    private Double delayProbability;
    private String riskLevel;
}
