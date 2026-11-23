package com.diagnosticops.service;

import com.diagnosticops.dto.MlDemandRequest;
import com.diagnosticops.dto.MlDemandResponse;
import com.diagnosticops.dto.MlTatRequest;
import com.diagnosticops.dto.MlTatResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;

@Slf4j
@Service
@RequiredArgsConstructor
public class MlClientService {

    private final WebClient mlWebClient;

    public MlTatResponse predictTat(MlTatRequest request) {
        try {
            return mlWebClient.post()
                    .uri("/ml/predict-tat")
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(MlTatResponse.class)
                    .timeout(Duration.ofSeconds(3))
                    .onErrorResume(e -> {
                        log.warn("ML Service /ml/predict-tat unavailable or timed out: {}. Using deterministic fallback.", e.getMessage());
                        return Mono.just(buildFallbackTat(request));
                    })
                    .block();
        } catch (Exception e) {
            log.warn("Failed to contact ML Service: {}. Using heuristic fallback.", e.getMessage());
            return buildFallbackTat(request);
        }
    }

    public MlDemandResponse forecastDemand(MlDemandRequest request) {
        try {
            return mlWebClient.post()
                    .uri("/ml/forecast-demand")
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(MlDemandResponse.class)
                    .timeout(Duration.ofSeconds(4))
                    .onErrorResume(e -> {
                        log.warn("ML Service /ml/forecast-demand unavailable: {}. Returning empty forecast payload.", e.getMessage());
                        return Mono.just(MlDemandResponse.builder()
                                .centreId(request.getCentreId())
                                .processingType(request.getProcessingType())
                                .horizonDays(request.getHorizonDays())
                                .modelUsed("Fallback-Baseline")
                                .forecasts(java.util.Collections.emptyList())
                                .build());
                    })
                    .block();
        } catch (Exception e) {
            log.warn("Exception during /ml/forecast-demand call: {}", e.getMessage());
            return MlDemandResponse.builder()
                    .centreId(request.getCentreId())
                    .processingType(request.getProcessingType())
                    .horizonDays(request.getHorizonDays())
                    .modelUsed("Fallback-Baseline")
                    .forecasts(java.util.Collections.emptyList())
                    .build();
        }
    }

    private MlTatResponse buildFallbackTat(MlTatRequest req) {
        double standard = (req.getStandardSlaMinutes() != null) ? req.getStandardSlaMinutes() : 240.0;
        double predicted = standard * 0.85;
        if (Boolean.TRUE.equals(req.getIsStatUrgent())) {
            predicted *= 0.75;
        }
        return MlTatResponse.builder()
                .predictedTatMinutes(Math.round(predicted * 10.0) / 10.0)
                .delayProbability(0.15)
                .riskLevel("LOW")
                .modelUsed("Deterministic-RuleEngine-Fallback")
                .standardSlaMinutes((int) standard)
                .isBreachPredicted(false)
                .build();
    }
}
