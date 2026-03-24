package dev.lukasgrigis.tokenexchange.registration.config;

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
                .title("Registration Service")
                .description("Conference registration — JWT resource server with role-based access")
                .version("1.0.0"));
    }
}
