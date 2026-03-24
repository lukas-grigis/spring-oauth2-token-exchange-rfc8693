package dev.lukasgrigis.tokenexchange.registration.controller;

import dev.lukasgrigis.tokenexchange.registration.model.Registration;
import dev.lukasgrigis.tokenexchange.registration.model.RegistrationRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@RestController
public class RegistrationController {

    private final ConcurrentMap<UUID, Registration> registrations = new ConcurrentHashMap<>();

    @PostMapping
    @PreAuthorize("hasAnyRole('ATTENDEE', 'ORGANIZER')")
    public ResponseEntity<Registration> register(
            @RequestBody RegistrationRequest request,
            @AuthenticationPrincipal JwtAuthenticationToken auth) {

        String userId = auth.getToken().getSubject();
        UUID id = UUID.randomUUID();
        var registration = new Registration(id, request.talkId(), userId, Instant.now());
        registrations.put(id, registration);

        return ResponseEntity
            .created(URI.create("/registrations/" + id))
            .body(registration);
    }

    @GetMapping("/mine")
    public List<Registration> getMyRegistrations(@AuthenticationPrincipal JwtAuthenticationToken auth) {
        String userId = auth.getToken().getSubject();
        return registrations.values().stream()
            .filter(r -> r.userId().equals(userId))
            .toList();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ATTENDEE', 'ORGANIZER')")
    public ResponseEntity<Void> deleteRegistration(
            @PathVariable UUID id,
            @AuthenticationPrincipal JwtAuthenticationToken auth) {

        Registration registration = registrations.get(id);
        if (registration == null) {
            return ResponseEntity.notFound().build();
        }

        String userId = auth.getToken().getSubject();
        if (!registration.userId().equals(userId)) {
            return ResponseEntity.status(403).build();
        }

        registrations.remove(id);
        return ResponseEntity.noContent().build();
    }
}
