package dev.lukasgrigis.tokenexchange.schedule.controller;

import dev.lukasgrigis.tokenexchange.schedule.model.Talk;
import dev.lukasgrigis.tokenexchange.schedule.openapi.SecurityRequirementName;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@Tag(name = "Schedule API")
public class TalkController {

    private static final List<Talk> TALKS = List.of(
        new Talk(
            UUID.fromString("11111111-1111-1111-1111-111111111101"),
            "Securing Microservices with OAuth 2.0 Token Exchange",
            "Alice Johnson",
            "Main Hall",
            "2026-06-15 09:00",
            "Deep dive into RFC 8693 and how token exchange enables secure service-to-service communication in microservice architectures."
        ),
        new Talk(
            UUID.fromString("11111111-1111-1111-1111-111111111102"),
            "Spring Security 7: What's New",
            "Bob Smith",
            "Room A",
            "2026-06-15 10:30",
            "Explore the latest features in Spring Security 7, including improved OAuth2 support and the new reactive security model."
        ),
        new Talk(
            UUID.fromString("11111111-1111-1111-1111-111111111103"),
            "Building Reactive APIs with Spring Cloud Gateway",
            "Carol Williams",
            "Room B",
            "2026-06-15 13:00",
            "Learn how to build high-performance API gateways using Spring Cloud Gateway and Project Reactor."
        ),
        new Talk(
            UUID.fromString("11111111-1111-1111-1111-111111111104"),
            "Zero Trust Architecture in Practice",
            "David Chen",
            "Main Hall",
            "2026-06-15 14:30",
            "Practical patterns for implementing zero trust security in cloud-native applications using SPIFFE, mTLS, and token exchange."
        ),
        new Talk(
            UUID.fromString("11111111-1111-1111-1111-111111111105"),
            "Keycloak as an Identity Broker",
            "Eva Martinez",
            "Room A",
            "2026-06-16 09:00",
            "Configure Keycloak for identity brokering, token exchange, and fine-grained authorization in multi-tenant systems."
        ),
        new Talk(
            UUID.fromString("11111111-1111-1111-1111-111111111106"),
            "From Monolith to Microservices: A Security Perspective",
            "Frank Lee",
            "Room B",
            "2026-06-16 10:30",
            "Security challenges and solutions when decomposing a monolithic application into microservices, with a focus on token propagation."
        )
    );

    @Operation(
            summary = "List all talks",
            security = @SecurityRequirement(name = SecurityRequirementName.OIDC)
    )
    @GetMapping("/talks")
    public List<Talk> getAllTalks() {
        return TALKS;
    }

    @Operation(
            summary = "Get a single talk by ID",
            security = @SecurityRequirement(name = SecurityRequirementName.OIDC)
    )
    @GetMapping("/talks/{id}")
    public ResponseEntity<Talk> getTalkById(@PathVariable UUID id) {
        return TALKS.stream()
            .filter(talk -> talk.id().equals(id))
            .findFirst()
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }
}
