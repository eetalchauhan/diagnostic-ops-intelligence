package com.diagnosticops.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "ml_model_metrics")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MlModelMetric {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "metric_id")
    private Long metricId;

    @Column(name = "task_name", nullable = false, length = 100)
    private String taskName;

    @Column(name = "model_name", nullable = false, length = 100)
    private String modelName;

    @Column(name = "mae", nullable = false)
    private Double mae;

    @Column(name = "rmse", nullable = false)
    private Double rmse;

    @Column(name = "mape", nullable = false)
    private Double mape;

    @Column(name = "r2_or_f1", nullable = false)
    private Double r2OrF1;

    @Column(name = "evaluated_at", insertable = false, updatable = false)
    private LocalDateTime evaluatedAt;
}
