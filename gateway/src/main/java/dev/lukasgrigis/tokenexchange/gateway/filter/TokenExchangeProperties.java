package dev.lukasgrigis.tokenexchange.gateway.filter;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "token-exchange")
public record TokenExchangeProperties(
    String tokenUri,
    String clientId,
    String clientSecret
) {}
