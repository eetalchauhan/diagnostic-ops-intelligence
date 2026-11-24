package com.diagnosticops.service;

import com.diagnosticops.repository.SampleOrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Service providing the operational reference clock.
 * If records exist for wall-clock today (LocalDate.now()), uses LocalDateTime.now().
 * If no records exist for today (static historical/seed dataset), anchors referenceNow
 * to around 11:30 AM on the latest dataset date so morning rush hours (07:00–11:30 AM)
 * and active pending triage samples are properly populated with realistic metrics.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReferenceClockService {

    private final SampleOrderRepository sampleOrderRepository;

    public LocalDateTime getReferenceNow() {
        LocalDate today = LocalDate.now();
        LocalDateTime startOfToday = today.atStartOfDay();
        LocalDateTime endOfToday = startOfToday.plusDays(1);

        long countToday = sampleOrderRepository.countByCollectedAtBetween(startOfToday, endOfToday);
        if (countToday > 0) {
            return LocalDateTime.now();
        }

        // Static historical dataset mode: find latest collection timestamp in database
        Optional<LocalDateTime> latestOpt = sampleOrderRepository.findLatestCollectedAt();
        if (latestOpt.isPresent()) {
            LocalDateTime latest = latestOpt.get();
            LocalDate latestDate = latest.toLocalDate();
            // Anchor to around 11:30 AM on the latest dataset date
            return latestDate.atTime(11, 30, 0);
        }

        return LocalDateTime.now();
    }
}
