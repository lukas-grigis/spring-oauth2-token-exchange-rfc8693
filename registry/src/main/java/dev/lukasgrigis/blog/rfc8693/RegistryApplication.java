package dev.lukasgrigis.blog.rfc8693;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.netflix.eureka.server.EnableEurekaServer;

@SpringBootApplication
@EnableEurekaServer
public class RegistryApplication {

    static void main() {
        SpringApplication.run(RegistryApplication.class);
    }

}
