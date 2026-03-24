package dev.lukasgrigis.tokenexchange.gateway.filter;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.BearerTokenAuthentication;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

/**
 * Gateway filter that performs RFC 8693 token exchange:
 * exchanges the incoming opaque token for a JWT via Keycloak's token endpoint.
 */
@Component
public class TokenExchangeGatewayFilterFactory
        extends AbstractGatewayFilterFactory<TokenExchangeGatewayFilterFactory.Config> {

    private static final Logger log = LoggerFactory.getLogger(TokenExchangeGatewayFilterFactory.class);

    private final WebClient webClient;
    private final TokenExchangeProperties properties;

    public TokenExchangeGatewayFilterFactory(TokenExchangeProperties properties) {
        super(Config.class);
        this.properties = properties;
        this.webClient = WebClient.builder().build();
    }

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> ReactiveSecurityContextHolder.getContext()
            .filter(ctx -> ctx.getAuthentication() instanceof BearerTokenAuthentication)
            .map(ctx -> (BearerTokenAuthentication) ctx.getAuthentication())
            .flatMap(auth -> exchangeToken(auth.getToken().getTokenValue()))
            .map(jwt -> exchange.mutate()
                .request(r -> r.headers(h -> h.set(HttpHeaders.AUTHORIZATION, "Bearer " + jwt)))
                .build())
            .defaultIfEmpty(exchange)
            .flatMap(chain::filter);
    }

    private Mono<String> exchangeToken(String subjectToken) {
        var formData = new LinkedMultiValueMap<String, String>();
        formData.add("grant_type", "urn:ietf:params:oauth:grant-type:token-exchange");
        formData.add("subject_token", subjectToken);
        formData.add("subject_token_type", "urn:ietf:params:oauth:token-type:access_token");
        formData.add("requested_token_type", "urn:ietf:params:oauth:token-type:access_token");
        formData.add("client_id", properties.clientId());
        formData.add("client_secret", properties.clientSecret());

        return webClient.post()
            .uri(properties.tokenUri())
            .body(BodyInserters.fromFormData(formData))
            .retrieve()
            .bodyToMono(TokenResponse.class)
            .map(TokenResponse::access_token)
            .doOnError(e -> log.error("Token exchange failed", e));
    }

    public static class Config {
    }

    private record TokenResponse(String access_token, String token_type, int expires_in) {}
}
