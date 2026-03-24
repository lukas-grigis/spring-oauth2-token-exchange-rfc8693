package dev.lukasgrigis.tokenexchange.schedule.config;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Converts Keycloak realm_access.roles into Spring Security granted authorities
 * with the ROLE_ prefix.
 */
public class JwtTokenConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        Collection<GrantedAuthority> authorities = extractRealmRoles(jwt);
        return new JwtAuthenticationToken(jwt, authorities, jwt.getClaimAsString("preferred_username"));
    }

    @SuppressWarnings("unchecked")
    private Collection<GrantedAuthority> extractRealmRoles(Jwt jwt) {
        Map<String, Object> realmAccess = jwt.getClaimAsMap("realm_access");
        if (realmAccess == null) {
            return Collections.emptyList();
        }

        Object rolesObj = realmAccess.get("roles");
        if (rolesObj instanceof List<?> roles) {
            return roles.stream()
                .filter(String.class::isInstance)
                .map(role -> (GrantedAuthority) new SimpleGrantedAuthority("ROLE_" + ((String) role).toUpperCase()))
                .toList();
        }

        return Collections.emptyList();
    }
}
