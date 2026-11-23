package com.diagnosticops.dsa;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DispatchSimulationResult {
    private Long sampleId;
    private String barcode;
    private String centreCode;
    private String testCode;
    private String processingType;
    private boolean isStatUrgent;
    private boolean isSlaBreached;
    private LocalDateTime expectedReadyAt;
    private int batchSequence;
    private String recommendation;
}
