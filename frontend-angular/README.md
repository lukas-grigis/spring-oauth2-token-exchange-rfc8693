# Angular frontend

Token Exchange demo built with Angular 21. Standalone components, signals for state, Tailwind v4 for styling.

## Run it

```bash
npm install
npm start        # http://localhost:4200
```

## Generate API clients

Backend needs to be running first.

```bash
npm run api:generate
```

Uses ng-openapi-gen to generate typed services from the Gateway's OpenAPI specs.

## Stack

- Angular 21 (standalone, signals, OnPush)
- keycloak-js for PKCE auth
- ng-openapi-gen for codegen
- Tailwind CSS v4
