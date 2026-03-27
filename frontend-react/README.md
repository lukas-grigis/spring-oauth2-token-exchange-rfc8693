# React frontend

Token Exchange demo built with React 19 and Vite. Context/hooks for auth state, Tailwind v4 for styling.

## Run it

```bash
npm install
npm start        # http://localhost:5174
```

## Generate API clients

Backend needs to be running first.

```bash
npm run api:generate
```

Uses @hey-api/openapi-ts to generate typed clients from the Gateway's OpenAPI specs.

## Stack

- React 19 (hooks, context)
- react-router 7
- keycloak-js for PKCE auth
- @hey-api/openapi-ts for codegen
- Tailwind CSS v4 via @tailwindcss/vite
