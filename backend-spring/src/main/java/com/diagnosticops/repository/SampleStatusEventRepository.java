package com.diagnosticops.repository;

import com.diagnosticops.entity.SampleStatusEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SampleStatusEventRepository extends JpaRepository<SampleStatusEvent, Long> {
    List<SampleStatusEvent> findBySampleSampleIdOrderByChangedAtAsc(Long sampleId);
}
