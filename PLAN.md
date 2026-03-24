# Token Exchange Demo — Master Plan

## Architecture

```
Browser (public OIDC client)
  ↓ opaque token (Authorization: Bearer <opaque>)
API Gateway (Spring Cloud Gateway)
  ↓ introspects opaque token → exchanges for scoped JWT (RFC 8693)
  ↓ TokenRelay forwards JWT
┌─────────────────────┬──────────────────────────┐
│ schedule-service    │ registration-service      │
│ (browse talks)      │ (register for sessions)   │
│ JWT → realm_roles   │ JWT → realm_roles         │
└─────────────────────┴──────────────────────────┘
```

## Tasks

### Phase 1: Backend (Spring Boot 4 + Maven)
- [ ] Parent POM (Spring Boot 4, Spring Cloud 2025.x, Java 25)
- [ ] `gateway` module — Spring Cloud Gateway, OAuth2 client, opaque token introspection, token-exchange grant, TokenRelay filter
- [ ] `schedule-service` module — REST controller (GET /talks, GET /talks/{id}), in-memory data, JWT resource server
- [ ] `registration-service` module — REST controller (POST /registrations, GET /registrations/mine), in-memory data, JWT resource server + JwtTokenConverter for realm_roles
- [ ] Shared security config pattern (JwtTokenConverter, SecurityConfiguration, OpenAPI config)

### Phase 2: Keycloak
- [ ] Realm JSON export (conference-realm.json)
  - Realm: `conference`
  - Clients: `public` (SPA, PKCE), `private` (confidential, token-exchange grant)
  - Token exchange policy: allow `private` to exchange tokens from `public`
  - Roles: `attendee`, `organizer`
  - Test users: alice (attendee), bob (organizer)
- [ ] docker-compose.yml (Keycloak + Traefik or plain ports)

### Phase 3: Frontends (thin — login + dashboard + talks list + register button)
- [ ] `frontend-react` — React 19 + Vite + oidc-spa + Tailwind
- [ ] `frontend-angular` — Angular 21 + keycloak-js + Tailwind
- [ ] `frontend-vue` — Vue 3 + Vite + oidc-spa + Tailwind

Each frontend:
1. Login/logout via OIDC (public client, PKCE)
2. Dashboard showing user info
3. Talks list (GET /schedule-service/talks via gateway)
4. Register button (POST /registration-service/registrations via gateway)
5. My registrations list

### Phase 4: Cognito Variant
- [ ] Spring profiles: `keycloak` (default) vs `cognito`
- [ ] Cognito-specific application-cognito.yml for gateway + resource servers
- [ ] mise.toml tasks for profile switching
- [ ] Document what changes (issuer, introspection endpoint, client config)

### Phase 5: Blog Infrastructure (lukasgrigis-dev)
- [ ] Add rehype-pretty-code + Shiki to velite config
- [ ] CSS for code blocks (dark/light theme support)
- [ ] Test with a sample MDX code block

### Phase 6: Blog Post
- [ ] Write the article (MDX on lukasgrigis-dev)
- [ ] Architecture diagram (Mermaid → SVG or custom)
- [ ] Code snippets from companion repo
- [ ] Review and publish

## Repo Rules
- Private until blog post is ready
- Feature branches + PRs + merge commits (no squash)
- CLAUDE.md for coding agents
- .gitignore: node_modules, target/, .idea/, .vscode/, *.env.local
