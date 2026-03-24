# OAuth 2.0 Token Exchange (RFC 8693) Demo

A Spring Boot 4 demo showing how to use **opaque tokens at the edge** and **JWTs internally** via OAuth 2.0 Token Exchange.

**Domain:** Conference platform with a schedule service and registration service.

## Architecture

```
Browser (public OIDC client, PKCE)
  │ opaque token
  ▼
API Gateway (Spring Cloud Gateway, port 8000)
  │ introspects opaque token → exchanges for scoped JWT (RFC 8693)
  │ TokenRelay forwards JWT
  ├──────────────────────┬──────────────────────────┐
  ▼                      ▼                          │
schedule-service       registration-service         │
(port 8100)            (port 8200)                  │
GET /talks             POST /registrations          │
GET /talks/{id}        GET /registrations/mine      │
JWT → realm_roles      JWT → realm_roles + RBAC     │
```

## Prerequisites

- Java 25 (or use [mise](https://mise.jdx.dev/): `mise install`)
- Docker & Docker Compose (for Keycloak)
- pnpm (for frontends, optional)

## Quick Start

### 1. Start Keycloak

```bash
cd support && docker compose up -d
```

Keycloak will be available at http://localhost:8080 (admin/admin).

The `conference` realm is auto-imported with:
- **Users:** alice (password: alice, role: attendee), bob (password: bob, roles: attendee + organizer)
- **Clients:** `conference-public` (SPA, PKCE), `gateway-private` (confidential, token exchange)

### 2. Build the project

```bash
./mvnw clean verify
```

### 3. Run the services

In separate terminals:

```bash
cd gateway && ../mvnw spring-boot:run
cd schedule-service && ../mvnw spring-boot:run
cd registration-service && ../mvnw spring-boot:run
```

### 4. Test the flow

Get a token from Keycloak:

```bash
TOKEN=$(curl -s -X POST http://localhost:8080/realms/conference/protocol/openid-connect/token \
  -d "client_id=conference-public" \
  -d "username=alice" \
  -d "password=alice" \
  -d "grant_type=password" | jq -r '.access_token')
```

Call the gateway:

```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/schedule/talks
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/registrations/mine
```

## API Documentation

Each service exposes Swagger UI:
- Gateway: http://localhost:8000/swagger-ui.html
- Schedule Service: http://localhost:8100/schedule/swagger-ui.html
- Registration Service: http://localhost:8200/registrations/swagger-ui.html

## Stack

- Java 25, Spring Boot 4.0.0, Spring Cloud 2025.0.1
- Spring Cloud Gateway (WebFlux)
- Spring Security OAuth2 Resource Server (JWT + opaque token introspection)
- Keycloak 26.x
- No database — in-memory data only (this is a security demo)

## Key Security Flow

1. UI authenticates via Keycloak (public client, PKCE) and gets an **opaque token**
2. UI sends opaque token to Gateway
3. Gateway **introspects** the opaque token with Keycloak
4. Gateway performs **token exchange** (RFC 8693): opaque → scoped JWT
5. Gateway forwards the JWT to downstream services via TokenRelay
6. Downstream services validate the JWT and extract `realm_access.roles` via `JwtTokenConverter`
