package dev.lukasgrigis.blog.rfc8693.review.security;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

public class JwtTokenConverter implements Converter<Jwt, JwtAuthenticationToken> {

    private static final String REALM_ACCESS_CLAIM = "realm_access";
    private static final String ROLES = "roles";

    private final JwtGrantedAuthoritiesConverter jwtGrantedAuthoritiesConverter = new JwtGrantedAuthoritiesConverter();

    @Override
    public JwtAuthenticationToken convert(Jwt source) {
        final var idpAuthorities = jwtGrantedAuthoritiesConverter.convert(source);
        final var applicationAuthorities = convertApplicationAuthorities(source);

        final var authorities = Stream.of(idpAuthorities, applicationAuthorities)
                .flatMap(Collection::stream)
                .toList();

        return new JwtAuthenticationToken(source, authorities);
    }

    private Collection<GrantedAuthority> convertApplicationAuthorities(Jwt jwt) {
        final var resourceAccessClaims = (Map<String, Object>) jwt.getClaim(REALM_ACCESS_CLAIM);
        final var roles = (List<String>) resourceAccessClaims.get(ROLES);
        return roles.stream()
                .map(String::toUpperCase)
                .map("ROLE_"::concat)
                .map(SimpleGrantedAuthority::new)
                .map(GrantedAuthority.class::cast)
                .toList();
    }

}
