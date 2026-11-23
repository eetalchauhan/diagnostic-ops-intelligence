package com.diagnosticops.repository;

import com.diagnosticops.entity.CollectionCentre;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CollectionCentreRepository extends JpaRepository<CollectionCentre, Integer> {
    Optional<CollectionCentre> findByCentreCode(String centreCode);
}
