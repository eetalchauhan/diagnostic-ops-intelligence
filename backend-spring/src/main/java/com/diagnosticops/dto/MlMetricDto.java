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
public class MlMetricDto {
    private Long metricId;
    private String taskName;
    private String modelName;
    private Double mae;
    private Double rmse;
    private Double mape;
    private Double r2OrF1;
    private LocalDateTime evaluatedAt;
}
