package dev.lukasgrigis.tokenexchange.schedule.model;

import java.util.UUID;

public record Talk(
    UUID id,
    String title,
    String speaker,
    String room,
    String timeSlot,
    String description
) {}
