# CLAUDE.md — Token Exchange Demo

## What this is
OAuth 2.0 Token Exchange (RFC 8693) demo: opaque token at the edge, JWT internally.
Domain: Conference platform (schedule + registration).

## Stack
- **Backend:** Java 25, Spring Boot 4, Spring Cloud 2025.x, Maven multi-module
- **Gateway:** Spring Cloud Gateway (WebFlux), OAuth2 client with token-exchange grant, TokenRelay filter
- **Resource servers:** Spring Security OAuth2 Resource Server (JWT), JwtTokenConverter for Keycloak realm_roles
- **IdP:** Keycloak 26.x (realm export in support/keycloak/)
- **Frontends:** React (oidc-spa), Angular (keycloak-js), Vue (oidc-spa) — all thin dashboards

## Structure
```
├── gateway/                 Spring Cloud Gateway
├── schedule-service/        GET /talks, GET /talks/{id}
├── registration-service/    POST /registrations, GET /registrations/mine
├── frontend-react/          React 19 + Vite + oidc-spa
├── frontend-angular/        Angular 21 + keycloak-js
├── frontend-vue/            Vue 3 + Vite + oidc-spa
├── support/
│   ├── keycloak/            Realm JSON + env
│   └── docker-compose.yml
└── pom.xml                  Parent POM
```

## Conventions
- Feature branches → PRs → merge commits (never squash, never push to main directly)
- Java: follow Spring conventions, records for DTOs, no Lombok
- Frontends: Tailwind for styling, minimal — login + dashboard + talks + registrations
- In-memory data only (no database) — this is a security demo, not a CRUD app
- All services register at Eureka? NO — keep it simple, use direct URLs via gateway routes
- OpenAPI/Swagger on each service at /api-docs and /swagger-ui

## Key Security Flow
1. UI authenticates via Keycloak (public client, PKCE) → gets opaque token
2. UI sends opaque token to Gateway
3. Gateway introspects opaque token with Keycloak
4. Gateway performs token exchange (RFC 8693): opaque → scoped JWT
5. Gateway forwards JWT to downstream service via TokenRelay
6. Downstream validates JWT, extracts realm_roles via JwtTokenConverter

## Commands
- Build all: `./mvnw clean verify` (from root)
- Run Keycloak: `cd support && docker compose up -d`
- Run gateway: `cd gateway && ../mvnw spring-boot:run`
- Run services: same pattern per module
- Frontends: `cd frontend-react && pnpm dev` (etc.)

## Spring Profiles
- `keycloak` (default) — Keycloak as IdP
- `cognito` — AWS Cognito as IdP (same code, different config)
