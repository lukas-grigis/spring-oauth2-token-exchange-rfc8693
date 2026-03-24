package dev.lukasgrigis.tokenexchange.schedule.controller;

import dev.lukasgrigis.tokenexchange.schedule.openapi.SecurityRequirementName;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
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

}
