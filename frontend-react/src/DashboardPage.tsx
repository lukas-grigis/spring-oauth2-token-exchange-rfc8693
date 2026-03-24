import { useEffect, useState } from "react"
import { oidc } from "./oidc"

interface Talk {
  id: string
  title: string
  speaker: string
  room: string
  timeSlot: string
  description: string
}

interface Registration {
  id: string
  talkId: string
  userId: string
  registeredAt: string
}

function authHeaders(): HeadersInit {
  if (!oidc.isUserLoggedIn) return {}
  return { Authorization: `Bearer ${oidc.getTokens().accessToken}` }
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { ...authHeaders(), ...init?.headers },
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

export function DashboardPage() {
  const [talks, setTalks] = useState<Talk[]>([])
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)

  const userName = oidc.isUserLoggedIn
    ? (oidc.getTokens().decodedIdToken as Record<string, string>).preferred_username ?? "User"
    : "User"

  async function loadData() {
    const [t, r] = await Promise.all([
      fetchJson<Talk[]>("/schedule/talks"),
      fetchJson<Registration[]>("/registrations/mine"),
    ])
    setTalks(t)
    setRegistrations(r)
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  async function register(talkId: string) {
    await fetch("/registrations", {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ talkId }),
    })
    loadData()
  }

  async function cancel(id: string) {
    await fetch(`/registrations/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    })
    loadData()
  }

  const registeredTalkIds = new Set(registrations.map((r) => r.talkId))

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <h1 className="text-lg font-semibold text-zinc-900">Conference Portal</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-600">{userName}</span>
            <button
              onClick={() => oidc.logout({ redirectTo: "home" })}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl p-6">
        {loading ? (
          <p className="text-sm text-zinc-500">Loading...</p>
        ) : (
          <>
            {/* Talks */}
            <h2 className="mb-4 text-xl font-semibold text-zinc-900">Available Talks</h2>
            <div className="mb-8 grid gap-4">
              {talks.map((talk) => (
                <div key={talk.id} className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-medium text-zinc-900">{talk.title}</h3>
                      <p className="mt-1 text-sm text-zinc-500">
                        {talk.speaker} · {talk.room} · {talk.timeSlot}
                      </p>
                      <p className="mt-2 text-sm text-zinc-600">{talk.description}</p>
                    </div>
                    <button
                      onClick={() => register(talk.id)}
                      disabled={registeredTalkIds.has(talk.id)}
                      className="shrink-0 rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-40"
                    >
                      {registeredTalkIds.has(talk.id) ? "Registered" : "Register"}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Registrations */}
            <h2 className="mb-4 text-xl font-semibold text-zinc-900">My Registrations</h2>
            {registrations.length === 0 ? (
              <p className="text-sm text-zinc-500">No registrations yet.</p>
            ) : (
              <div className="grid gap-3">
                {registrations.map((reg) => {
                  const talk = talks.find((t) => t.id === reg.talkId)
                  return (
                    <div key={reg.id} className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                      <div>
                        <p className="font-medium text-zinc-900">{talk?.title ?? reg.talkId}</p>
                        <p className="text-xs text-zinc-500">Registered {new Date(reg.registeredAt).toLocaleString()}</p>
                      </div>
                      <button
                        onClick={() => cancel(reg.id)}
                        className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                      >
                        Cancel
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
