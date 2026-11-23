package com.diagnosticops.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "test_catalog")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TestCatalog {

    @Id
    @Column(name = "test_code", length = 50)
    private String testCode;

    @Column(name = "test_name", nullable = false, length = 150)
    private String testName;

    @Column(name = "department", nullable = false, length = 100)
    private String department;

    @Column(name = "processing_type", nullable = false, length = 50)
    private String processingType; // IN_HOUSE or EXTERNAL_HUB

    @Column(name = "standard_sla_minutes", nullable = false)
    private Integer standardSlaMinutes;

    @Column(name = "price_inr", nullable = false, precision = 10, scale = 2)
    private BigDecimal priceInr;
}
