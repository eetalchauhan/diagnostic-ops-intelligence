package com.diagnosticops.dsa;

import com.diagnosticops.entity.SampleOrder;
import com.diagnosticops.repository.SampleOrderRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

/**
 * Stateful in-memory DSA Analytics & Triage Engine.
 * Implements:
 * 1. Min-Heap PriorityQueue for real-time SLA breach triage.
 * 2. Sliding Window ArrayDeque for rolling 4-hour moving average TAT and congestion velocity.
 * 3. Concurrent HashMaps for O(1) hot frequency lookups without SQL GROUP BY.
 * 4. Queue + Comparator for FIFO dispatch simulation and multi-tier prioritization.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DsaAnalyticsEngine {

    private final SampleOrderRepository sampleOrderRepository;

    // 1. Min-Heap for real-time pending sample SLA triage
    private final PriorityQueue<SampleTriageNode> slaTriageMinHeap = new PriorityQueue<>();
    private final Map<Long, SampleTriageNode> activeNodeLookup = new ConcurrentHashMap<>();
    private final Object heapLock = new Object();

    // 2. Sliding-Window ArrayDeque (4 hours = 240 minutes)
    private static final int WINDOW_DURATION_MINUTES = 240;
    private final ArrayDeque<TatWindowEntry> tatSlidingWindow = new ArrayDeque<>();
    private long runningTatSumMinutes = 0;
    private int runningBreachedCount = 0;
    private final Object windowLock = new Object();

    // 3. O(1) Frequency & Category HashMaps
    private final ConcurrentHashMap<String, AtomicInteger> testCodeFrequencyMap = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, AtomicLong> processingTypeCountMap = new ConcurrentHashMap<>();

    // 4. FIFO Dispatch Queue simulation storage
    private final Queue<SampleOrder> fifoDispatchQueue = new LinkedList<>();
    private final Object queueLock = new Object();

    @PostConstruct
    public void initializeFromDatabase() {
        log.info("Initializing DsaAnalyticsEngine state from PostgreSQL...");
        long startTime = System.currentTimeMillis();

        // A. Hydrate active pending samples into Min-Heap
        List<SampleOrder> pendingSamples = sampleOrderRepository.findByActualReadyAtIsNull();
        LocalDateTime now = LocalDateTime.now();

        synchronized (heapLock) {
            slaTriageMinHeap.clear();
            activeNodeLookup.clear();

            for (SampleOrder order : pendingSamples) {
                SampleTriageNode node = buildTriageNode(order, now, null, null, null);
                slaTriageMinHeap.offer(node);
                activeNodeLookup.put(order.getSampleId(), node);
            }
        }
        log.info("Hydrated {} pending samples into Min-Heap PriorityQueue.", pendingSamples.size());

        // B. Hydrate completed samples into Sliding Window (latest completed within window)
        List<SampleOrder> recentCompleted = sampleOrderRepository.findTop150ByActualReadyAtIsNotNullOrderByActualReadyAtDesc();
        synchronized (windowLock) {
            tatSlidingWindow.clear();
            runningTatSumMinutes = 0;
            runningBreachedCount = 0;

            // Ingest in chronological order
            List<SampleOrder> chronological = new ArrayList<>(recentCompleted);
            Collections.reverse(chronological);

            for (SampleOrder order : chronological) {
                if (order.getActualReadyAt() != null && order.getTatMinutes() != null) {
                    TatWindowEntry entry = TatWindowEntry.builder()
                            .sampleId(order.getSampleId())
                            .completedAt(order.getActualReadyAt())
                            .tatMinutes(order.getTatMinutes())
                            .isBreached(Boolean.TRUE.equals(order.getIsSlaBreached()))
                            .processingType(order.getTest().getProcessingType())
                            .build();

                    tatSlidingWindow.addLast(entry);
                    runningTatSumMinutes += entry.getTatMinutes();
                    if (entry.isBreached()) {
                        runningBreachedCount++;
                    }
                }
            }
            evictExpiredWindowEntries(now);
        }
        log.info("Hydrated {} completed samples into ArrayDeque sliding window.", tatSlidingWindow.size());

        // C. Hydrate Frequency HashMaps
        testCodeFrequencyMap.clear();
        processingTypeCountMap.clear();

        List<Object[]> testCounts = sampleOrderRepository.findTestCodeCounts();
        for (Object[] row : testCounts) {
            String code = (String) row[0];
            Number cnt = (Number) row[1];
            testCodeFrequencyMap.put(code, new AtomicInteger(cnt.intValue()));
        }

        List<Object[]> procCounts = sampleOrderRepository.findProcessingTypeCounts();
        for (Object[] row : procCounts) {
            String proc = (String) row[0];
            Number cnt = (Number) row[1];
            processingTypeCountMap.put(proc, new AtomicLong(cnt.longValue()));
        }

        long elapsed = System.currentTimeMillis() - startTime;
        log.info("DsaAnalyticsEngine initialized successfully in {} ms.", elapsed);

        // Run startup benchmark comparison
        benchmarkTriageRetrievalLatency();
    }

    // =========================================================================
    // 1. Min-Heap PriorityQueue Operations (SLA Triage)
    // =========================================================================

    public void registerNewPendingSample(SampleOrder order, Double predictedTat, Double delayProb, String riskLevel) {
        LocalDateTime now = LocalDateTime.now();
        SampleTriageNode node = buildTriageNode(order, now, predictedTat, delayProb, riskLevel);

        synchronized (heapLock) {
            slaTriageMinHeap.offer(node);
            activeNodeLookup.put(order.getSampleId(), node);
        }

        // Increment HashMap counters in O(1)
        recordSampleIntake(order.getTest().getTestCode(), order.getTest().getProcessingType());
    }

    public void updateSampleLifecycle(Long sampleId, String newStatus, LocalDateTime actualReadyAt, Integer tatMinutes, Boolean isBreached, String processingType) {
        synchronized (heapLock) {
            SampleTriageNode existing = activeNodeLookup.get(sampleId);
            if (existing != null) {
                slaTriageMinHeap.remove(existing); // O(n) remove for re-balance or departure
                if ("DELIVERED".equals(newStatus) || "REPORT_GENERATED".equals(newStatus)) {
                    activeNodeLookup.remove(sampleId);
                } else {
                    existing.setCurrentStatus(newStatus);
                    slaTriageMinHeap.offer(existing); // Re-insert updated node
                }
            }
        }

        // If completed, register into Sliding Window
        if (actualReadyAt != null && tatMinutes != null) {
            recordSampleCompletion(sampleId, actualReadyAt, tatMinutes, Boolean.TRUE.equals(isBreached), processingType);
        }
    }

    public SampleTriageNode peekHighestRiskSample() {
        synchronized (heapLock) {
            return slaTriageMinHeap.peek(); // O(1) peek
        }
    }

    public List<SampleTriageNode> getTopAtRiskSamples(int limit) {
        synchronized (heapLock) {
            // Re-evaluate slack with current timestamp
            LocalDateTime now = LocalDateTime.now();
            List<SampleTriageNode> snapshot = new ArrayList<>(slaTriageMinHeap);
            for (SampleTriageNode node : snapshot) {
                node.setSlaSlackMinutes(calculateSlack(node.getExpectedReadyAt(), node.getPredictedTatMinutes(), now));
            }
            // Sort according to SampleTriageNode comparator
            Collections.sort(snapshot);
            return snapshot.stream().limit(limit).collect(Collectors.toList());
        }
    }

    public int getActivePendingCount() {
        synchronized (heapLock) {
            return slaTriageMinHeap.size();
        }
    }

    // =========================================================================
    // 2. Sliding Window Operations (4-Hour Rolling Average TAT)
    // =========================================================================

    public void recordSampleCompletion(Long sampleId, LocalDateTime completedAt, int tatMinutes, boolean isBreached, String processingType) {
        synchronized (windowLock) {
            TatWindowEntry entry = TatWindowEntry.builder()
                    .sampleId(sampleId)
                    .completedAt(completedAt)
                    .tatMinutes(tatMinutes)
                    .isBreached(isBreached)
                    .processingType(processingType)
                    .build();

            tatSlidingWindow.addLast(entry);
            runningTatSumMinutes += tatMinutes;
            if (isBreached) {
                runningBreachedCount++;
            }
            evictExpiredWindowEntries(completedAt);
        }
    }

    private void evictExpiredWindowEntries(LocalDateTime referenceTime) {
        LocalDateTime cutoff = referenceTime.minusMinutes(WINDOW_DURATION_MINUTES);
        while (!tatSlidingWindow.isEmpty() && tatSlidingWindow.peekFirst().getCompletedAt().isBefore(cutoff)) {
            TatWindowEntry expired = tatSlidingWindow.pollFirst();
            runningTatSumMinutes -= expired.getTatMinutes();
            if (expired.isBreached()) {
                runningBreachedCount--;
            }
        }
        if (runningTatSumMinutes < 0) runningTatSumMinutes = 0;
        if (runningBreachedCount < 0) runningBreachedCount = 0;
    }

    public double getRollingAverageTatMinutes() {
        synchronized (windowLock) {
            evictExpiredWindowEntries(LocalDateTime.now());
            if (tatSlidingWindow.isEmpty()) {
                return 0.0;
            }
            return (double) runningTatSumMinutes / tatSlidingWindow.size();
        }
    }

    public double getRollingBreachPercentage() {
        synchronized (windowLock) {
            evictExpiredWindowEntries(LocalDateTime.now());
            if (tatSlidingWindow.isEmpty()) {
                return 0.0;
            }
            return ((double) runningBreachedCount / tatSlidingWindow.size()) * 100.0;
        }
    }

    public double getHourlyThroughputVelocity() {
        synchronized (windowLock) {
            evictExpiredWindowEntries(LocalDateTime.now());
            // Samples processed per hour over 4-hour window
            return tatSlidingWindow.size() / 4.0;
        }
    }

    // =========================================================================
    // 3. Hot-Lookup Frequency HashMaps
    // =========================================================================

    public void recordSampleIntake(String testCode, String processingType) {
        testCodeFrequencyMap.computeIfAbsent(testCode, k -> new AtomicInteger(0)).incrementAndGet();
        processingTypeCountMap.computeIfAbsent(processingType, k -> new AtomicLong(0)).incrementAndGet();
    }

    public Map<String, Integer> getTestCodeFrequencies() {
        Map<String, Integer> result = new LinkedHashMap<>();
        testCodeFrequencyMap.entrySet().stream()
                .sorted((a, b) -> Integer.compare(b.getValue().get(), a.getValue().get()))
                .forEach(e -> result.put(e.getKey(), e.getValue().get()));
        return result;
    }

    public Map<String, Long> getProcessingTypeCounts() {
        Map<String, Long> result = new HashMap<>();
        processingTypeCountMap.forEach((k, v) -> result.put(k, v.get()));
        return result;
    }

    // =========================================================================
    // 4. FIFO Dispatch Queue & Chained Comparator Simulation
    // =========================================================================

    public List<DispatchSimulationResult> simulateBatchDispatchQueue(List<SampleOrder> pendingOrders) {
        synchronized (queueLock) {
            fifoDispatchQueue.clear();
            fifoDispatchQueue.addAll(pendingOrders);

            // Chained comparator prioritizing:
            // 1. Is SLA Breached (breached samples first)
            // 2. Is STAT Urgent (urgent emergencies first)
            // 3. Expected Ready Time (earliest SLA deadline first)
            // 4. Centre ID
            Comparator<SampleOrder> chainedComparator = Comparator
                    .comparing(SampleOrder::getIsSlaBreached, Comparator.reverseOrder())
                    .thenComparing(SampleOrder::getIsStatUrgent, Comparator.reverseOrder())
                    .thenComparing(SampleOrder::getExpectedReadyAt)
                    .thenComparing(s -> s.getCentre().getCentreId());

            List<SampleOrder> sortedOrders = new ArrayList<>(fifoDispatchQueue);
            sortedOrders.sort(chainedComparator);

            List<DispatchSimulationResult> results = new ArrayList<>();
            int seq = 1;
            for (SampleOrder order : sortedOrders) {
                String recommendation;
                if (Boolean.TRUE.equals(order.getIsSlaBreached())) {
                    recommendation = "CRITICAL: Immediate express batch dispatch / analyzer escalation";
                } else if (Boolean.TRUE.equals(order.getIsStatUrgent())) {
                    recommendation = "HIGH: STAT priority - schedule next analyzer cycle";
                } else {
                    recommendation = "NORMAL: Standard batch schedule";
                }

                results.add(DispatchSimulationResult.builder()
                        .sampleId(order.getSampleId())
                        .barcode(order.getBarcode())
                        .centreCode(order.getCentre().getCentreCode())
                        .testCode(order.getTest().getTestCode())
                        .processingType(order.getTest().getProcessingType())
                        .isStatUrgent(Boolean.TRUE.equals(order.getIsStatUrgent()))
                        .isSlaBreached(Boolean.TRUE.equals(order.getIsSlaBreached()))
                        .expectedReadyAt(order.getExpectedReadyAt())
                        .batchSequence(seq++)
                        .recommendation(recommendation)
                        .build());
            }
            return results;
        }
    }

    // =========================================================================
    // 5. Latency Benchmark: In-Memory DSA vs Database Query
    // =========================================================================

    public Map<String, Object> benchmarkTriageRetrievalLatency() {
        // Measure in-memory Min-Heap retrieval time
        long dsaStart = System.nanoTime();
        List<SampleTriageNode> dsaResults = getTopAtRiskSamples(15);
        long dsaNanos = System.nanoTime() - dsaStart;
        double dsaMs = dsaNanos / 1_000_000.0;

        // Measure database JPA query retrieval time
        long dbStart = System.nanoTime();
        List<SampleOrder> dbResults = sampleOrderRepository.findByActualReadyAtIsNull();
        long dbNanos = System.nanoTime() - dbStart;
        double dbMs = dbNanos / 1_000_000.0;

        double speedup = (dsaNanos > 0) ? ((double) dbNanos / dsaNanos) : 1.0;

        Map<String, Object> benchmark = new LinkedHashMap<>();
        benchmark.put("dsaTriageLatencyNanos", dsaNanos);
        benchmark.put("dsaTriageLatencyMs", Math.round(dsaMs * 1000.0) / 1000.0);
        benchmark.put("databaseQueryLatencyNanos", dbNanos);
        benchmark.put("databaseQueryLatencyMs", Math.round(dbMs * 1000.0) / 1000.0);
        benchmark.put("speedupMultiplier", Math.round(speedup * 10.0) / 10.0);
        benchmark.put("activePendingSamplesCount", dsaResults.size());

        log.info("LATENCY BENCHMARK: In-Memory Min-Heap: {} ms ({} ns) vs DB Query: {} ms ({} ns) -> Speedup: {}x",
                benchmark.get("dsaTriageLatencyMs"), dsaNanos, benchmark.get("databaseQueryLatencyMs"), dbNanos, benchmark.get("speedupMultiplier"));

        return benchmark;
    }

    // =========================================================================
    // Helper Methods
    // =========================================================================

    private SampleTriageNode buildTriageNode(SampleOrder order, LocalDateTime now, Double predictedTat, Double delayProb, String riskLevel) {
        double predTat = (predictedTat != null) ? predictedTat : (double) order.getTest().getStandardSlaMinutes();
        double prob = (delayProb != null) ? delayProb : 0.0;
        String risk = (riskLevel != null) ? riskLevel : "LOW";
        double slack = calculateSlack(order.getExpectedReadyAt(), predTat, now);

        return SampleTriageNode.builder()
                .sampleId(order.getSampleId())
                .barcode(order.getBarcode())
                .centreId(order.getCentre().getCentreId())
                .centreCode(order.getCentre().getCentreCode())
                .testCode(order.getTest().getTestCode())
                .testName(order.getTest().getTestName())
                .department(order.getTest().getDepartment())
                .processingType(order.getTest().getProcessingType())
                .isStatUrgent(Boolean.TRUE.equals(order.getIsStatUrgent()))
                .currentStatus(order.getCurrentStatus())
                .collectedAt(order.getCollectedAt())
                .expectedReadyAt(order.getExpectedReadyAt())
                .predictedTatMinutes(predTat)
                .delayProbability(prob)
                .riskLevel(risk)
                .slaSlackMinutes(slack)
                .build();
    }

    private double calculateSlack(LocalDateTime expectedReadyAt, double predictedTatMinutes, LocalDateTime now) {
        long minutesUntilExpected = Duration.between(now, expectedReadyAt).toMinutes();
        return (double) minutesUntilExpected - (predictedTatMinutes * 0.5); // remaining expected slack
    }
}
