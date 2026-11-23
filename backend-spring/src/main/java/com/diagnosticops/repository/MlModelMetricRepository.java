package com.diagnosticops.repository;

import com.diagnosticops.entity.MlModelMetric;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MlModelMetricRepository extends JpaRepository<MlModelMetric, Long> {
    List<MlModelMetric> findByOrderByEvaluatedAtDesc();
}
