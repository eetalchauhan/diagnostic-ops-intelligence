package com.diagnosticops.dsa;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Node for the Min-Heap PriorityQueue.
 * Orders pending samples by lowest dynamic SLA slack:
 * Dynamic Slack = minutesUntilSLA - predictedRemainingTat
 * Urgent STAT samples receive highest triage dispatch priority.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SampleTriageNode implements Comparable<SampleTriageNode> {

    private Long sampleId;
    private String barcode;
    private Integer centreId;
    private String centreCode;
    private String testCode;
    private String testName;
    private String department;
    private String processingType;
    private boolean isStatUrgent;
    private String currentStatus;
    private LocalDateTime collectedAt;
    private LocalDateTime expectedReadyAt;
    private double predictedTatMinutes;
    private double delayProbability;
    private String riskLevel;       // LOW, MEDIUM, HIGH
    private double slaSlackMinutes; // Negative = breached / severely delayed

    @Override
    public int compareTo(SampleTriageNode other) {
        // 1. STAT Emergency samples always prioritized
        if (this.isStatUrgent != other.isStatUrgent) {
            return this.isStatUrgent ? -1 : 1;
        }

        // 2. Lowest/most negative SLA slack (most critical breach risk first)
        int slackComp = Double.compare(this.slaSlackMinutes, other.slaSlackMinutes);
        if (slackComp != 0) {
            return slackComp;
        }

        // 3. Fallback: earliest collectedAt FIFO tiebreaker
        return this.collectedAt.compareTo(other.collectedAt);
    }
}
