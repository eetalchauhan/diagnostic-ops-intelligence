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
public class MlTatResponse {

    @JsonProperty("predicted_tat_minutes")
    private Double predictedTatMinutes;

    @JsonProperty("delay_probability")
    private Double delayProbability;

    @JsonProperty("risk_level")
    private String riskLevel;

    @JsonProperty("model_used")
    private String modelUsed;

    @JsonProperty("standard_sla_minutes")
    private Integer standardSlaMinutes;

    @JsonProperty("is_breach_predicted")
    private Boolean isBreachPredicted;
}
