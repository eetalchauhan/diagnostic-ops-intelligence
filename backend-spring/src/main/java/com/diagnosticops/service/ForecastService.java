package com.diagnosticops.service;

import com.diagnosticops.dto.ForecastItemDto;
import com.diagnosticops.dto.MlDemandRequest;
import com.diagnosticops.dto.MlDemandResponse;
import com.diagnosticops.dto.MlMetricDto;
import com.diagnosticops.entity.MlDemandForecast;
import com.diagnosticops.entity.MlModelMetric;
import com.diagnosticops.repository.MlDemandForecastRepository;
import com.diagnosticops.repository.MlModelMetricRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ForecastService {

    private final MlDemandForecastRepository forecastRepository;
    private final MlModelMetricRepository metricRepository;
    private final MlClientService mlClientService;

    public Map<String, Object> getForecastAndMetrics(Integer centreId, String processingType, Integer horizonDays) {
        int cid = (centreId != null) ? centreId : 1;
        String pType = (processingType != null) ? processingType.toUpperCase() : "IN_HOUSE";
        int horizon = (horizonDays != null && horizonDays > 0) ? horizonDays : 7;

        // 1. Try to trigger forecast from ML service
        MlDemandRequest request = MlDemandRequest.builder()
                .centreId(cid)
                .processingType(pType)
                .horizonDays(horizon)
                .build();

        MlDemandResponse mlResponse = mlClientService.forecastDemand(request);
        List<ForecastItemDto> forecastList = mlResponse.getForecasts();

        // 2. If ML service returned empty list, read latest from PostgreSQL table ml_demand_forecasts
        if (forecastList == null || forecastList.isEmpty()) {
            List<MlDemandForecast> dbForecasts = forecastRepository
                    .findByCentreCentreIdAndProcessingTypeAndForecastDateGreaterThanEqualOrderByForecastDateAsc(
                            cid, pType, LocalDate.now().minusDays(1)
                    );

            forecastList = dbForecasts.stream().map(f -> ForecastItemDto.builder()
                    .forecastDate(f.getForecastDate().toString())
                    .centreId(f.getCentre().getCentreId())
                    .processingType(f.getProcessingType())
                    .predictedVolume(f.getPredictedVolume())
                    .lowerBound(f.getLowerBound())
                    .upperBound(f.getUpperBound())
                    .modelName(f.getModelName())
                    .build()
            ).collect(Collectors.toList());
        }

        // 3. Fetch ML Model Benchmark Metrics from PostgreSQL
        List<MlModelMetric> dbMetrics = metricRepository.findByOrderByEvaluatedAtDesc();
        List<MlMetricDto> metricDtos = dbMetrics.stream().map(m -> MlMetricDto.builder()
                .metricId(m.getMetricId())
                .taskName(m.getTaskName())
                .modelName(m.getModelName())
                .mae(m.getMae())
                .rmse(m.getRmse())
                .mape(m.getMape())
                .r2OrF1(m.getR2OrF1())
                .evaluatedAt(m.getEvaluatedAt())
                .build()
        ).collect(Collectors.toList());

        Map<String, Object> response = new HashMap<>();
        response.put("centreId", cid);
        response.put("processingType", pType);
        response.put("horizonDays", horizon);
        response.put("modelUsed", mlResponse.getModelUsed());
        response.put("forecasts", forecastList);
        response.put("modelMetrics", metricDtos);

        return response;
    }
}
