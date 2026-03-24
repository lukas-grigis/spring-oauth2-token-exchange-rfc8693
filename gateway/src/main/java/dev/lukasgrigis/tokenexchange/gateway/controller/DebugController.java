package dev.lukasgrigis.tokenexchange.gateway.controller;

import dev.lukasgrigis.tokenexchange.gateway.openapi.SecurityRequirementName;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.stream.Collectors;

@RestController
@Tag(name = "Debug API")
public class DebugController {

    @Operation(
            summary = "Mirror HTTP headers",
            description = "Returns all HTTP headers sent in the request.",
            security = @SecurityRequirement(name = SecurityRequirementName.OIDC)
    )
    @GetMapping(path = "/debug/mirror", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, String>> mirrorHeaders(ServerHttpRequest request) {
        var headers = request.getHeaders().toSingleValueMap();
        return ResponseEntity.ok(headers);
    }

}
