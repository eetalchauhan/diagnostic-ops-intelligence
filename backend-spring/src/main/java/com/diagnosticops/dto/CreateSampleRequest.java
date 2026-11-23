package com.diagnosticops.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateSampleRequest {

    @NotNull(message = "Centre ID is required")
    private Integer centreId;

    @NotBlank(message = "Test code is required")
    private String testCode;

    private Boolean isStatUrgent;

    private String barcode;
}
