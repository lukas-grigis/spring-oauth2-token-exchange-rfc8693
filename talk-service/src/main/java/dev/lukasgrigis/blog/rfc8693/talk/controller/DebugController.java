package dev.lukasgrigis.blog.rfc8693.talk.controller;

import dev.lukasgrigis.blog.rfc8693.talk.openapi.SecurityRequirementName;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@Tag(name = "Debug API")
public class DebugController {

    @Operation(
            summary = "Mirror HTTP headers",
            description = "Returns all HTTP headers sent in the request.",
            security = @SecurityRequirement(name = SecurityRequirementName.OIDC)
    )
    @GetMapping(path = "/debug/mirror", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, String>> mirrorHeaders(@RequestHeader Map<String, String> headers) {
        return ResponseEntity.ok(headers);
    }

    @Operation(
            summary = "Check permission",
            description = "Endpoint to check if the caller has the required permissions (SPEAKER).",
            security = @SecurityRequirement(name = SecurityRequirementName.OIDC)
    )
    @GetMapping("/debug/check-permission")
    @PreAuthorize("hasRole('SPEAKER')")
    public ResponseEntity<Void> checkPermission() {
        return ResponseEntity.noContent().build();
    }

}
