<script setup lang="ts">
import { ref, onMounted } from "vue"
import { oidc } from "../oidc"

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

const talks = ref<Talk[]>([])
const registrations = ref<Registration[]>([])
const loading = ref(true)

function authHeaders(): Record<string, string> {
  if (!oidc.isUserLoggedIn) return {}
  return { Authorization: `Bearer ${oidc.getTokens().accessToken}` }
}

const userName = oidc.isUserLoggedIn
  ? ((oidc.getTokens().decodedIdToken as Record<string, string>).preferred_username ?? "User")
  : "User"

async function loadData() {
  const [t, r] = await Promise.all([
    fetch("/schedule/talks", { headers: authHeaders() }).then((r) => r.json()),
    fetch("/registrations/mine", { headers: authHeaders() }).then((r) => r.json()),
  ])
  talks.value = t
  registrations.value = r
  loading.value = false
}

async function register(talkId: string) {
  await fetch("/registrations", {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ talkId }),
  })
  loadData()
}

async function cancel(id: string) {
  await fetch(`/registrations/${id}`, { method: "DELETE", headers: authHeaders() })
  loadData()
}

function isRegistered(talkId: string): boolean {
  return registrations.value.some((r) => r.talkId === talkId)
}

function talkTitle(talkId: string): string {
  return talks.value.find((t) => t.id === talkId)?.title ?? talkId
}

function logout() {
  oidc.logout({ redirectTo: "home" })
}

onMounted(loadData)
</script>

<template>
  <div class="min-h-screen bg-zinc-50">
    <header class="border-b border-zinc-200 bg-white px-6 py-4">
      <div class="mx-auto flex max-w-4xl items-center justify-between">
        <h1 class="text-lg font-semibold text-zinc-900">Conference Portal</h1>
        <div class="flex items-center gap-4">
          <span class="text-sm text-zinc-600">{{ userName }}</span>
          <button
            @click="logout"
            class="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-4xl p-6">
      <p v-if="loading" class="text-sm text-zinc-500">Loading...</p>
      <template v-else>
        <h2 class="mb-4 text-xl font-semibold text-zinc-900">Available Talks</h2>
        <div class="mb-8 grid gap-4">
          <div
            v-for="talk in talks"
            :key="talk.id"
            class="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <div class="flex items-start justify-between gap-4">
              <div>
                <h3 class="font-medium text-zinc-900">{{ talk.title }}</h3>
                <p class="mt-1 text-sm text-zinc-500">
                  {{ talk.speaker }} · {{ talk.room }} · {{ talk.timeSlot }}
                </p>
                <p class="mt-2 text-sm text-zinc-600">{{ talk.description }}</p>
              </div>
              <button
                @click="register(talk.id)"
                :disabled="isRegistered(talk.id)"
                class="shrink-0 rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-40"
              >
                {{ isRegistered(talk.id) ? "Registered" : "Register" }}
              </button>
            </div>
          </div>
        </div>

        <h2 class="mb-4 text-xl font-semibold text-zinc-900">My Registrations</h2>
        <p v-if="registrations.length === 0" class="text-sm text-zinc-500">No registrations yet.</p>
        <div v-else class="grid gap-3">
          <div
            v-for="reg in registrations"
            :key="reg.id"
            class="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
          >
            <div>
              <p class="font-medium text-zinc-900">{{ talkTitle(reg.talkId) }}</p>
              <p class="text-xs text-zinc-500">
                Registered {{ new Date(reg.registeredAt).toLocaleString() }}
              </p>
            </div>
            <button
              @click="cancel(reg.id)"
              class="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </template>
    </main>
  </div>
</template>
