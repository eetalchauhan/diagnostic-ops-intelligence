package com.diagnosticops.dsa;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Entry for the ArrayDeque sliding-window average turnaround calculation.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TatWindowEntry {
    private Long sampleId;
    private LocalDateTime completedAt;
    private int tatMinutes;
    private boolean isBreached;
    private String processingType;
}
