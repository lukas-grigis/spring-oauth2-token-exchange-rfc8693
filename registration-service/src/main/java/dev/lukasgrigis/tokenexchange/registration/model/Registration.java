package dev.lukasgrigis.tokenexchange.registration.model;

import java.time.Instant;
import java.util.UUID;

public record Registration(
    UUID id,
    UUID talkId,
    String userId,
    Instant registeredAt
) {}
