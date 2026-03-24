package dev.lukasgrigis.tokenexchange.gateway.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfiguration {

    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
            .info(new Info()
                .title("API Gateway")
                .description("Spring Cloud Gateway — OAuth 2.0 Token Exchange (RFC 8693)")
                .version("1.0.0"));
    }
}
