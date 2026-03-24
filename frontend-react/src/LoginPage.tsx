import { oidc } from "./oidc"

export function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <div className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-bold text-zinc-900">Conference Portal</h1>
        <p className="mb-6 text-sm text-zinc-500">
          OAuth 2.0 Token Exchange (RFC 8693) Demo
        </p>
        <button
          onClick={() => oidc.login({ doesCurrentHrefRequiresAuth: false })}
          className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Sign in with Keycloak
        </button>
      </div>
    </div>
  )
}
