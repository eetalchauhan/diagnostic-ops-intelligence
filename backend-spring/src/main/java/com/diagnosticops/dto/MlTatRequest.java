package com.diagnosticops.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MlTatRequest {

    @JsonProperty("centre_id")
    private Integer centreId;

    @JsonProperty("test_code")
    private String testCode;

    @JsonProperty("processing_type")
    private String processingType;

    @JsonProperty("standard_sla_minutes")
    private Integer standardSlaMinutes;

    @JsonProperty("is_stat_urgent")
    private Boolean isStatUrgent;

    @JsonProperty("collected_hour")
    private Double collectedHour;

    @JsonProperty("day_of_week")
    private Integer dayOfWeek;

    @JsonProperty("active_queue_depth")
    private Integer activeQueueDepth;
}
