package com.diagnosticops.repository;

import com.diagnosticops.entity.MlDemandForecast;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface MlDemandForecastRepository extends JpaRepository<MlDemandForecast, Long> {
    List<MlDemandForecast> findByCentreCentreIdAndProcessingTypeAndForecastDateGreaterThanEqualOrderByForecastDateAsc(
            Integer centreId, String processingType, LocalDate fromDate
    );

    List<MlDemandForecast> findTop30ByOrderByCreatedAtDesc();
}
