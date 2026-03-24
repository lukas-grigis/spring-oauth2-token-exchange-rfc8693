package dev.lukasgrigis.tokenexchange.registration.openapi;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityScheme;
import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "app.openapi")
record OpenApiProperties(
        @NotBlank String name,
        @NotBlank String description,
        @NotBlank String version,
        @NotBlank String wellKnownOidcConfigurationUrl
) {
    OpenApiProperties {
        if (name == null) name = "Registration Service API";
        if (description == null) description = "Documentation for the Registration Service API";
    }
}

@Configuration
@EnableConfigurationProperties(OpenApiProperties.class)
class OpenApiConfiguration {

    @Bean
    OpenAPI openAPI(OpenApiProperties properties) {
        final var info = new Info()
                .title(properties.name())
                .description(properties.description())
                .version(properties.version());

        final var oidcScheme = new SecurityScheme()
                .type(SecurityScheme.Type.OPENIDCONNECT)
                .in(SecurityScheme.In.HEADER)
                .openIdConnectUrl(properties.wellKnownOidcConfigurationUrl());

        return new OpenAPI().info(info).schemaRequirement(SecurityRequirementName.OIDC, oidcScheme);
    }

}
