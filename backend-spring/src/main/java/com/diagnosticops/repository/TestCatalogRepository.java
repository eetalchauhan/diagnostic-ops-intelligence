package com.diagnosticops.repository;

import com.diagnosticops.entity.TestCatalog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TestCatalogRepository extends JpaRepository<TestCatalog, String> {
    List<TestCatalog> findByProcessingType(String processingType);
}
