package dev.lukasgrigis.tokenexchange.gateway.config;

import jakarta.validation.constraints.NotNull;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.oauth2.client.TokenExchangeReactiveOAuth2AuthorizedClientProvider;
import org.springframework.security.oauth2.server.resource.authentication.BearerTokenAuthentication;
import org.springframework.security.web.server.SecurityWebFilterChain;
import org.springframework.validation.annotation.Validated;
import reactor.core.publisher.Mono;

import java.util.List;

@Validated
@ConfigurationProperties(prefix = "app.security")
record SecurityProperties(
        @NotNull List<String> unprotectedPaths
) {}

@Configuration
@EnableConfigurationProperties(SecurityProperties.class)
@EnableWebFluxSecurity
public class SecurityConfiguration {

    @Bean
    SecurityWebFilterChain securityWebFilterChain(
            ServerHttpSecurity http,
            SecurityProperties properties
    ) {
        http.authorizeExchange(exchanges -> exchanges
                .pathMatchers(properties.unprotectedPaths().toArray(new String[0])).permitAll()
                .anyExchange().authenticated()
        );

        http.oauth2ResourceServer(oauth2 -> oauth2.opaqueToken(Customizer.withDefaults()));
        http.oauth2Client(Customizer.withDefaults());

        http.csrf(ServerHttpSecurity.CsrfSpec::disable);
        http.formLogin(ServerHttpSecurity.FormLoginSpec::disable);
        http.httpBasic(ServerHttpSecurity.HttpBasicSpec::disable);
        return http.build();
    }

    @Bean
    TokenExchangeReactiveOAuth2AuthorizedClientProvider tokenExchangeReactiveOAuth2AuthorizedClientProvider() {
        final var provider = new TokenExchangeReactiveOAuth2AuthorizedClientProvider();
        provider.setSubjectTokenResolver(context -> {
            if (context.getPrincipal() instanceof BearerTokenAuthentication bearerTokenAuthentication) {
                return Mono.just(bearerTokenAuthentication.getToken());
            }
            return Mono.empty();
        });
        return provider;
    }

}
