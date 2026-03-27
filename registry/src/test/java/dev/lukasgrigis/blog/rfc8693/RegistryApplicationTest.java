package dev.lukasgrigis.blog.rfc8693;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;

@SpringBootTest
class RegistryApplicationTest {

    private final ApplicationContext context;

    @Autowired
    public RegistryApplicationTest(ApplicationContext context) {
        this.context = context;
    }

    @Test
    @DisplayName("Context successfully loads")
    void contextSuccessfullyLoads() {
        Assertions.assertNotNull(context);
    }

}