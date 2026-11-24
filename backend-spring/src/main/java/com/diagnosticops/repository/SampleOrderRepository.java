package com.diagnosticops.repository;

import com.diagnosticops.entity.SampleOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface SampleOrderRepository extends JpaRepository<SampleOrder, Long> {

    Optional<SampleOrder> findByBarcode(String barcode);

    List<SampleOrder> findByActualReadyAtIsNull();

    List<SampleOrder> findTop150ByActualReadyAtIsNotNullOrderByActualReadyAtDesc();

    long countByActualReadyAtIsNull();

    long countByCollectedAtBetween(LocalDateTime start, LocalDateTime end);

    long countByCollectedAtBetweenAndIsSlaBreachedTrue(LocalDateTime start, LocalDateTime end);

    @Query("SELECT s.test.testCode, COUNT(s) FROM SampleOrder s GROUP BY s.test.testCode ORDER BY COUNT(s) DESC")
    List<Object[]> findTestCodeCounts();

    @Query("SELECT s.test.processingType, COUNT(s) FROM SampleOrder s GROUP BY s.test.processingType")
    List<Object[]> findProcessingTypeCounts();

    @Query("SELECT MAX(s.collectedAt) FROM SampleOrder s")
    Optional<LocalDateTime> findLatestCollectedAt();

    @Query("SELECT MAX(s.collectedAt) FROM SampleOrder s WHERE s.collectedAt < :cutoff")
    Optional<LocalDateTime> findLatestCollectedAtBefore(@Param("cutoff") LocalDateTime cutoff);

    @Query("SELECT FUNCTION('date_part', 'hour', s.collectedAt) as hr, COUNT(s) FROM SampleOrder s WHERE s.collectedAt >= :since GROUP BY FUNCTION('date_part', 'hour', s.collectedAt) ORDER BY hr ASC")
    List<Object[]> findHourlyIntakeDistribution(@Param("since") LocalDateTime since);

    @Query("SELECT FUNCTION('date_part', 'hour', s.collectedAt) as hr, COUNT(s) FROM SampleOrder s WHERE s.collectedAt >= :startTime AND s.collectedAt < :endTime GROUP BY FUNCTION('date_part', 'hour', s.collectedAt) ORDER BY hr ASC")
    List<Object[]> findHourlyIntakeDistributionBetween(@Param("startTime") LocalDateTime startTime, @Param("endTime") LocalDateTime endTime);

    @Query("SELECT COUNT(s) FROM SampleOrder s WHERE s.centre.centreId = :centreId AND s.collectedAt <= :cutoff AND (s.actualReadyAt IS NULL OR s.actualReadyAt > :cutoff)")
    int countActiveQueueDepthAtCentre(@Param("centreId") Integer centreId, @Param("cutoff") LocalDateTime cutoff);
}
