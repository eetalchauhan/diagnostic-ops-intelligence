package com.diagnosticops.controller;

import com.diagnosticops.dto.CreateSampleRequest;
import com.diagnosticops.dto.SampleResponse;
import com.diagnosticops.dto.UpdateStatusRequest;
import com.diagnosticops.service.SampleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/samples")
@RequiredArgsConstructor
public class SampleController {

    private final SampleService sampleService;

    @PostMapping
    public ResponseEntity<SampleResponse> createSample(@Valid @RequestBody CreateSampleRequest request) {
        SampleResponse created = sampleService.createSample(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PatchMapping("/{sampleId}/status")
    public ResponseEntity<SampleResponse> updateStatus(
            @PathVariable Long sampleId,
            @Valid @RequestBody UpdateStatusRequest request
    ) {
        SampleResponse updated = sampleService.updateStatus(sampleId, request);
        return ResponseEntity.ok(updated);
    }

    @GetMapping("/{sampleId}")
    public ResponseEntity<SampleResponse> getSampleById(@PathVariable Long sampleId) {
        return ResponseEntity.ok(sampleService.getSampleById(sampleId));
    }

    @GetMapping("/active")
    public ResponseEntity<List<SampleResponse>> getActiveSamples() {
        return ResponseEntity.ok(sampleService.getActivePendingSamples());
    }
}
