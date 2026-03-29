<p align="center">
  <img src="https://img.shields.io/badge/Spring_Boot-4.0-6DB33F?logo=springboot&logoColor=white" alt="Spring Boot 4">
  <img src="https://img.shields.io/badge/Java-25-ED8B00?logo=openjdk&logoColor=white" alt="Java 25">
  <img src="https://img.shields.io/badge/Keycloak-26-4D4D4D?logo=keycloak&logoColor=white" alt="Keycloak 26">
  <img src="https://img.shields.io/badge/RFC_8693-Token_Exchange-0072C6" alt="RFC 8693">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License">
</p>

<h1 align="center">OAuth 2.0 Token Exchange (RFC 8693)</h1>

<p align="center">
  A Spring Boot reference implementation of RFC 8693 Token Exchange.<br>
  Log in, hit an endpoint, and watch the JWT morph between gateway and service.
</p>

---

Most OAuth tutorials stop at "get a token, call an API." But real systems have gateways that sit between your frontend
and a dozen backend services, each expecting their own credentials. That's
where [RFC 8693](https://datatracker.ietf.org/doc/html/rfc8693) comes in. The gateway swaps the user's token for a
service-specific JWT on the fly, scoped to just the right audience and permissions.

This repo is a working demo of that flow. Real Keycloak, real token exchange, real JWTs you can diff side by side in the
browser.

## Architecture

```
Frontend (Angular / Vue / React)
  -> sends access token to Gateway (:8000)
    -> Gateway exchanges token via Keycloak (RFC 8693)
      -> Talk Service (:8100, SPEAKER role)
      -> Review Service (:8200, REVIEWER role)
```

The gateway receives your frontend's token (issued by the `public` client) and exchanges it through Keycloak for a new
JWT with a different audience, client, and timestamps. The downstream service never sees the original token. The frontend
shows you exactly what changed.

### Why not just forward the token?

Most gateway setups forward the frontend's token straight to backend services. It works, but every service sees the same
broad token. If one service is compromised, that token is valid everywhere.

With RFC 8693, the gateway swaps the frontend's token for a new one scoped to a single service. The Talk Service gets a
JWT with `aud: talk-service`. The Review Service gets `aud: review-service`. A leaked token from one is useless to the
other.

The audience selection happens through OAuth2 scopes, not custom code. The gateway has separate client registrations with
distinct scopes (`api-talk-service`, `api-review-service`), and Keycloak's client scope mappers stamp the right audience
into each exchanged JWT. It's all configuration.

There's also a split in how tokens are validated. The gateway checks the frontend's token against Keycloak directly
(opaque token introspection), so it can catch revoked tokens immediately. Downstream services validate JWTs locally using
Keycloak's public keys, no network call needed. And each service rejects any JWT that doesn't carry its own name in
the `aud` claim, even if the JWT is otherwise valid.

## Quick start

You need [Docker](https://docs.docker.com/get-docker/) and [mise](https://mise.jdx.dev/) installed. mise handles Java,
Maven, and Node versions automatically, so there's no manual setup.

```bash
git clone https://github.com/lukas-grigis/spring-oauth-token-exchange-rfc8693.git
cd spring-oauth-token-exchange-rfc8693
mise run demo
```

One command. It builds the Maven project, starts Docker infrastructure (Keycloak, PostgreSQL, Traefik, OTel Collector,
Grafana), configures the Keycloak realm, boots all four backend services, and launches all three frontends. First run
takes a few minutes while everything downloads.

When it's done:

| Frontend   | URL                   |
|------------|-----------------------|
| Angular 21 | http://localhost:4200 |
| Vue 3.5    | http://localhost:5173 |
| React 19   | http://localhost:5174 |

Press `Ctrl+C` to stop everything (frontends, services, Docker).

## Test users

| User  | Password | Role     | Can access     |
|-------|----------|----------|----------------|
| alice | alice    | SPEAKER  | Talk Service   |
| bob   | bob      | REVIEWER | Review Service |

Log in as Alice and call the Talk Service mirror endpoint. You'll see a diff table showing which JWT claims changed
between what the frontend sent and what the service received. Audience, client, timestamps, it's all there.

Try the Review Service with Alice and you'll get a 403. Switch to Bob and the permissions flip.

## What to look for

The mirror endpoints return the HTTP headers the service received. The Authorization header contains a completely
different JWT than what the frontend sent. The diff table breaks it down claim by claim.

The permission check endpoints return 204 (granted) or 403 (denied) based on role. Alice gets into Talk Service but not
Review Service. Bob is the opposite.

If you want to see the full request path, open Grafana at http://grafana.localhost and search in Tempo. The trace goes
from Traefik through the Gateway (including the token exchange call to Keycloak) into the downstream service.

## Tech stack

| Layer          | What's running                                              |
|----------------|-------------------------------------------------------------|
| Gateway        | Spring Cloud Gateway, Spring Security OAuth2 Client         |
| Services       | Spring Boot 4, Spring Security OAuth2 Resource Server       |
| Auth           | Keycloak 26, RFC 8693 Token Exchange                        |
| Frontends      | Angular 21 / Vue 3.5 / React 19, Tailwind CSS v4           |
| Observability  | OpenTelemetry Java Agent, Grafana LGTM (Loki, Tempo, Mimir) |
| Infrastructure | Traefik, Eureka, PostgreSQL, Docker Compose                 |

## Project structure

```
.
├── gateway/              # Spring Cloud Gateway with token exchange
├── registry/             # Eureka service registry
├── talk-service/         # Resource server (SPEAKER role)
├── review-service/       # Resource server (REVIEWER role)
├── frontend-angular/     # Angular 21 frontend
├── frontend-vue/         # Vue 3.5 frontend
├── frontend-react/       # React 19 frontend
└── support/              # Docker Compose, Keycloak setup, integration tests
```

## Running tests

```bash
# Unit tests (Maven)
mise run test

# Integration tests (requires the full stack via mise run demo)
mise run test:integration
```

The integration tests log in as Alice and Bob, call mirror and permission endpoints through the gateway, and verify that
exchanged JWTs carry the correct audience, client, and roles.

## Service logs

Backend services run in the background. Logs go to `.logs/`:

```bash
tail -f .logs/gateway.log
tail -f .logs/talk-service.log
```

## OpenAPI

API docs are generated by Springdoc and proxied through the gateway:

- Gateway: http://localhost:8000/swagger-ui
- Talk Service: http://localhost:8000/talk-service/swagger-ui
- Review Service: http://localhost:8000/review-service/swagger-ui

Frontends generate typed API clients from these specs with `npm run api:generate` (backend needs to be running).

## Security notice

This is a demo. The setup is optimized for clarity, not for production:

- Client secrets are committed in plain text (use a secrets manager in real life)
- Keycloak runs in `start-dev` mode with SSL disabled
- CORS is wide open (`*`)
- Test user passwords are trivial

Don't deploy this as-is. Use it as a reference for the token exchange architecture, then harden it to your own
standards.

## Contributing

If you find a bug or have an idea, open an issue or send a pull request.

1. Fork the repo
2. Create a branch (`git checkout -b my-change`)
3. Make your changes
4. Run `mise run test` to make sure things work
5. Open a PR

## License

[MIT](LICENSE)
