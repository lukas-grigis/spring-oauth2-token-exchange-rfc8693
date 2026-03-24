import { createOidc } from "oidc-spa"

export const oidc = await createOidc({
  issuerUri: "http://localhost:8080/realms/conference",
  clientId: "public",
  publicUrl: "/",
})
