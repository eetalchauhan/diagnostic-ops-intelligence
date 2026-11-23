package com.diagnosticops.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "collection_centres")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CollectionCentre {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "centre_id")
    private Integer centreId;

    @Column(name = "centre_code", unique = true, nullable = false, length = 50)
    private String centreCode;

    @Column(name = "centre_name", nullable = false, length = 150)
    private String centreName;

    @Column(name = "city", nullable = false, length = 100)
    private String city;

    @Column(name = "hub_courier_cutoff_hour", nullable = false)
    private Integer hubCourierCutoffHour;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;
}
