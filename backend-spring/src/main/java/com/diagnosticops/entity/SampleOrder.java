package com.diagnosticops.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "sample_orders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SampleOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "sample_id")
    private Long sampleId;

    @Column(name = "barcode", unique = true, nullable = false, length = 100)
    private String barcode;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "centre_id", nullable = false)
    private CollectionCentre centre;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "test_code", nullable = false)
    private TestCatalog test;

    @Column(name = "is_stat_urgent", nullable = false)
    private Boolean isStatUrgent;

    @Column(name = "current_status", nullable = false, length = 50)
    private String currentStatus;

    @Column(name = "collected_at", nullable = false)
    private LocalDateTime collectedAt;

    @Column(name = "expected_ready_at", nullable = false)
    private LocalDateTime expectedReadyAt;

    @Column(name = "actual_ready_at")
    private LocalDateTime actualReadyAt;

    @Column(name = "tat_minutes")
    private Integer tatMinutes;

    @Column(name = "is_sla_breached", nullable = false)
    private Boolean isSlaBreached;
}
