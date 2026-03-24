package dev.lukasgrigis.tokenexchange.gateway.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.oauth2.client.TokenExchangeReactiveOAuth2AuthorizedClientProvider;
import org.springframework.security.oauth2.server.resource.authentication.BearerTokenAuthentication;
import org.springframework.security.web.server.SecurityWebFilterChain;
import reactor.core.publisher.Mono;

@Configuration
@EnableWebFluxSecurity
public class SecurityConfiguration {

    private static final String[] UNPROTECTED_PATHS = {
            "/v3/api-docs/**",
            "/swagger-ui/**",
            "/swagger-ui.html",
            "/actuator/health",
            "/actuator/info"
    };

    @Bean
    SecurityWebFilterChain securityWebFilterChain(ServerHttpSecurity http) {
        http.authorizeExchange(exchanges -> exchanges
                .pathMatchers(UNPROTECTED_PATHS).permitAll()
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
        var provider = new TokenExchangeReactiveOAuth2AuthorizedClientProvider();
        provider.setSubjectTokenResolver(context -> {
            if (context.getPrincipal() instanceof BearerTokenAuthentication bearerAuth) {
                return Mono.just(bearerAuth.getToken());
            }
            return Mono.empty();
        });
        return provider;
    }
}
