package dev.lukasgrigis.blog.rfc8693.openapi;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityScheme;
import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "app.openapi")
record OpenApiProperties(
        @NotBlank @DefaultValue("Gateway API") String name,
        @NotBlank @DefaultValue("Documentation for the Gateway API") String description,
        @NotBlank String version,
        @NotBlank String wellKnownOidcConfigurationUrl
) {

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
                .openIdConnectUrl(properties.wellKnownOidcConfigurationUrl());

        return new OpenAPI().info(info).schemaRequirement(SecurityRequirementName.OIDC, oidcScheme);
    }

}
