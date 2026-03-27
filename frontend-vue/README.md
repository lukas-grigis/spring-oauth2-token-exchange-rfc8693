# Vue frontend

Token Exchange demo built with Vue 3.5 and Vite. Composition API with `<script setup>`, Tailwind v4 for styling.

## Run it

```bash
npm install
npm start        # http://localhost:5173
```

## Generate API clients

Backend needs to be running first.

```bash
npm run api:generate
```

Uses @hey-api/openapi-ts to generate typed clients from the Gateway's OpenAPI specs.

## Stack

- Vue 3.5 (Composition API, `<script setup>`)
- vue-router 4 with navigation guards
- keycloak-js for PKCE auth
- @hey-api/openapi-ts for codegen
- Tailwind CSS v4 via @tailwindcss/vite
