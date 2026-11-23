package com.diagnosticops.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MlDemandResponse {

    @JsonProperty("centre_id")
    private Integer centreId;

    @JsonProperty("centre_code")
    private String centreCode;

    @JsonProperty("processing_type")
    private String processingType;

    @JsonProperty("horizon_days")
    private Integer horizonDays;

    @JsonProperty("model_used")
    private String modelUsed;

    @JsonProperty("forecasts")
    private List<ForecastItemDto> forecasts;
}
