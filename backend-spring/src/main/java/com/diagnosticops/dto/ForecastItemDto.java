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
public class ForecastItemDto {

    @JsonProperty("forecast_date")
    private String forecastDate;

    @JsonProperty("centre_id")
    private Integer centreId;

    @JsonProperty("processing_type")
    private String processingType;

    @JsonProperty("predicted_volume")
    private Integer predictedVolume;

    @JsonProperty("lower_bound")
    private Integer lowerBound;

    @JsonProperty("upper_bound")
    private Integer upperBound;

    @JsonProperty("model_name")
    private String modelName;
}
