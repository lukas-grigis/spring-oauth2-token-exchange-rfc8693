<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useAuth } from '../composables/useAuth';

const auth = useAuth();
const jwtExpanded = ref(false);
const howItWorksOpen = ref(false);
const decodedJwt = computed(() => {
  const t = auth.accessToken.value;
  if (!t) return 'No token';
  try {
    return JSON.stringify(JSON.parse(atob(t.split('.')[1])), null, 2);
  } catch {
    return 'Failed to decode';
  }
});

interface EndpointCard {
  id: string;
  method: string;
  path: string;
  note?: string;
  isMirror: boolean;
  requiredRole?: string;
  serviceName: string;
  hasExchange: boolean;
}

interface EndpointResult {
  status: 'idle' | 'loading' | 'success' | 'error';
  statusCode?: number;
  body?: string;
  responseToken?: string;
  traceId?: string;
}

interface DiffLine {
  key: string;
  sent: string;
  received: string;
  changed: boolean;
  info?: string;
}

const CLAIM_INFO: Record<string, string> = {
  aud: 'Target audience',
  azp: 'Authorized party',
  scope: 'Permissions',
  realm_access: 'User roles',
  sub: 'User ID',
  iss: 'Issuer',
  exp: 'Expiry',
  iat: 'Issued at',
  typ: 'Token type',
  preferred_username: 'Username',
  email: 'Email',
  given_name: 'First name',
  family_name: 'Last name',
  sid: 'Session ID',
  jti: 'Token ID',
  nbf: 'Not before',
  acr: 'Auth context',
  client_id: 'Client ID',
};

function parseJwt(token: string): Record<string, unknown> {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return {};
  }
}

function isJwt(token: string): boolean {
  return token.split('.').length === 3;
}

function tokenTypeLabel(token: string | null): string {
  return token ? (isJwt(token) ? 'JWT' : 'Opaque Token') : '—';
}

function diffPayloads(sentToken: string, receivedToken: string): DiffLine[] {
  const sent = parseJwt(sentToken);
  const received = parseJwt(receivedToken);
  return [...new Set([...Object.keys(sent), ...Object.keys(received)])].map((key) => ({
    key,
    sent: JSON.stringify(sent[key] ?? '—'),
    received: JSON.stringify(received[key] ?? '—'),
    changed: JSON.stringify(sent[key]) !== JSON.stringify(received[key]),
    info: CLAIM_INFO[key],
  }));
}

function extractToken(h: Record<string, string>): string | null {
  const a = h['authorization'] || h['Authorization'];
  if (!a) return null;
  const t = a.replace(/^Bearer\s+/i, '');
  return t.split('.').length === 3 ? t : null;
}

function extractTraceId(h: Record<string, string>): string | null {
  const tp = h['traceparent'];
  if (!tp) return null;
  const p = tp.split('-');
  return p.length >= 3 ? p[1] : null;
}

function grafanaUrl(traceId: string): string {
  const panes = JSON.stringify({
    main: {
      datasource: 'tempo',
      queries: [{ refId: 'A', queryType: 'traceql', query: traceId }],
    },
  });
  return `http://grafana.localhost/explore?schemaVersion=1&panes=${encodeURIComponent(panes)}&orgId=1`;
}

const howItWorksSteps = [
  {
    n: '1',
    title: 'Frontend → Gateway',
    text: 'You log in via Keycloak and get an access token. The frontend sends this token to the Gateway with every request.',
  },
  {
    n: '2',
    title: 'Gateway → Keycloak',
    text: 'The Gateway exchanges your token for a new, service-specific JWT using RFC 8693. This new token has a scoped audience and fresh claims.',
  },
  {
    n: '3',
    title: 'Service receives JWT',
    text: 'The downstream service gets a JWT tailored to it. It validates the token, checks roles, and either serves the request or denies access.',
  },
];

const groups = [
  {
    name: 'Gateway',
    endpoints: [
      {
        id: 'gw-mirror',
        method: 'GET',
        path: '/debug/mirror',
        isMirror: true,
        serviceName: 'Gateway',
        hasExchange: false,
      },
    ] as EndpointCard[],
  },
  {
    name: 'Talk Service',
    endpoints: [
      {
        id: 'talk-mirror',
        method: 'GET',
        path: '/talk-service/debug/mirror',
        isMirror: true,
        serviceName: 'Talk Service',
        hasExchange: true,
      },
      {
        id: 'talk-perm',
        method: 'GET',
        path: '/talk-service/debug/check-permission',
        note: 'Requires SPEAKER role',
        isMirror: false,
        requiredRole: 'SPEAKER',
        serviceName: 'Talk Service',
        hasExchange: true,
      },
    ] as EndpointCard[],
  },
  {
    name: 'Review Service',
    endpoints: [
      {
        id: 'review-mirror',
        method: 'GET',
        path: '/review-service/debug/mirror',
        isMirror: true,
        serviceName: 'Review Service',
        hasExchange: true,
      },
      {
        id: 'review-perm',
        method: 'GET',
        path: '/review-service/debug/check-permission',
        note: 'Requires REVIEWER role',
        isMirror: false,
        requiredRole: 'REVIEWER',
        serviceName: 'Review Service',
        hasExchange: true,
      },
    ] as EndpointCard[],
  },
];

const results = ref<Record<string, EndpointResult>>({});

async function sendRequest(ep: EndpointCard) {
  results.value = { ...results.value, [ep.id]: { status: 'loading' } };
  try {
    const res = await fetch(ep.path, { headers: { Authorization: `Bearer ${auth.accessToken.value}` } });
    let body = '';
    let responseToken: string | undefined;
    let traceId: string | undefined;
    try {
      const json = await res.json();
      body = JSON.stringify(json, null, 2);
      if (ep.isMirror) responseToken = extractToken(json) ?? undefined;
      traceId = extractTraceId(json) ?? undefined;
    } catch {
      body = res.status === 204 ? '(no content — permission granted)' : '(no body)';
    }
    results.value = {
      ...results.value,
      [ep.id]: { status: res.ok ? 'success' : 'error', statusCode: res.status, body, responseToken, traceId },
    };
  } catch (err) {
    results.value = { ...results.value, [ep.id]: { status: 'error', statusCode: 0, body: String(err) } };
  }
}
</script>

<template>
  <div class="min-h-screen" style="background: radial-gradient(ellipse at 50% 0%, #0a1f18 0%, #0c0c0f 45%)">
    <header
      class="sticky top-0 z-50 border-b border-void-800/50 backdrop-blur-xl"
      style="background: rgba(12, 12, 15, 0.88)"
    >
      <div class="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <svg fill="none" height="17" viewBox="0 0 261 226" width="20">
            <path d="M161.1 0.4H201.9L130.5 225.2L59.1 0.4H99.9L130.5 151.2L161.1 0.4Z" fill="#34d399" />
            <path d="M0 0.4H59.1L130.5 151.2L201.9 0.4H261L130.5 225.2L0 0.4Z" fill="#34d399" opacity="0.4" />
          </svg>
          <span class="font-bold text-void-100 text-sm">Token Exchange</span>
          <span class="text-[10px] font-mono text-void-500 bg-void-900 px-2 py-0.5 rounded-full">RFC 8693</span>
        </div>
        <div class="flex items-center gap-4">
          <span
            v-for="role in auth.roles.value"
            :key="role"
            class="text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-full border border-jade-800/40"
            style="background: rgba(16, 185, 129, 0.06); color: #6ee7b7"
            >{{ role }}</span
          >
          <div v-if="auth.userInfo.value" class="flex items-center gap-2.5">
            <div
              class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style="background: linear-gradient(135deg, #10b981, #064e3b)"
            >
              {{ auth.initials.value }}
            </div>
            <span class="text-sm text-void-300 hidden sm:block">{{ auth.displayName.value }}</span>
          </div>
          <button
            class="text-xs text-void-500 hover:text-jade-400 transition-colors cursor-pointer font-mono"
            @click="auth.logout()"
          >
            logout
          </button>
        </div>
      </div>
    </header>

    <main class="max-w-5xl mx-auto px-6 py-8 space-y-8" style="animation: float-up 0.4s ease-out">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          class="rounded-xl border border-void-800/50 p-6"
          style="background: linear-gradient(160deg, rgba(25, 26, 31, 0.9), rgba(12, 12, 15, 0.95))"
        >
          <template v-if="auth.userInfo.value">
            <div class="flex items-center gap-4 mb-4">
              <div
                class="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold text-white"
                style="
                  background: linear-gradient(135deg, #10b981, #064e3b);
                  box-shadow: 0 4px 20px rgba(5, 150, 105, 0.2);
                "
              >
                {{ auth.initials.value }}
              </div>
              <div>
                <div class="font-semibold text-void-100">{{ auth.displayName.value }}</div>
                <div class="text-sm text-void-400">{{ auth.userInfo.value?.preferred_username }}</div>
                <div class="text-xs text-void-500">{{ auth.userInfo.value?.email }}</div>
              </div>
            </div>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="role in auth.roles.value"
                :key="role"
                class="text-[11px] font-mono px-3 py-1 rounded-lg border border-jade-900/50"
                style="background: rgba(16, 185, 129, 0.05); color: #34d399"
                >{{ role }}</span
              >
            </div>
          </template>
          <div v-else class="flex items-center gap-4">
            <div class="w-14 h-14 rounded-xl bg-void-800 animate-pulse" />
            <div class="space-y-2">
              <div class="h-4 w-32 rounded bg-void-800 animate-pulse" />
              <div class="h-3 w-24 rounded bg-void-800/60 animate-pulse" />
            </div>
          </div>
        </div>
        <div
          class="rounded-xl border border-void-800/50 p-6"
          style="background: linear-gradient(160deg, rgba(25, 26, 31, 0.9), rgba(12, 12, 15, 0.95))"
        >
          <button
            class="flex items-center justify-between w-full text-left cursor-pointer group"
            @click="jwtExpanded = !jwtExpanded"
          >
            <div class="flex items-center gap-2">
              <span class="text-sm font-semibold text-void-200 group-hover:text-void-100 transition-colors"
                >Access Token</span
              >
              <span
                class="text-[9px] font-mono px-1.5 py-0.5 rounded"
                style="background: rgba(16, 185, 129, 0.1); color: #6ee7b7"
                >{{ tokenTypeLabel(auth.accessToken.value) }}</span
              >
            </div>
            <span
              :class="{ 'rotate-180': jwtExpanded }"
              class="text-void-500 text-xs font-mono transition-transform duration-200"
              >&#9660;</span
            >
          </button>
          <pre
            v-if="jwtExpanded"
            class="mt-4 text-[11px] leading-relaxed text-void-300 font-mono overflow-auto max-h-64 p-4 rounded-lg bg-void-950/80 border border-void-800/40"
            >{{ decodedJwt }}</pre
          >
        </div>
      </div>

      <!-- How it works -->
      <div
        class="rounded-xl border border-jade-500/15 p-5"
        style="background: linear-gradient(160deg, rgba(25, 26, 31, 0.9), rgba(12, 12, 15, 0.95))"
      >
        <button
          class="flex items-center justify-between w-full text-left cursor-pointer"
          @click="howItWorksOpen = !howItWorksOpen"
        >
          <span class="text-sm font-semibold" style="color: #6ee7b7">How Token Exchange Works</span>
          <span
            :class="{ 'rotate-180': howItWorksOpen }"
            class="text-void-500 text-xs font-mono transition-transform duration-200"
            >&#9660;</span
          >
        </button>
        <div v-if="howItWorksOpen" class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            v-for="step in howItWorksSteps"
            :key="step.n"
            class="rounded-lg border border-void-800/40 p-4 bg-void-950/50"
          >
            <div class="flex items-center gap-2 mb-2">
              <span
                class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                style="background: linear-gradient(135deg, #10b981, #047857)"
                >{{ step.n }}</span
              >
              <span class="text-xs font-semibold text-void-200">{{ step.title }}</span>
            </div>
            <p class="text-[11px] text-void-400 leading-relaxed">{{ step.text }}</p>
          </div>
        </div>
      </div>

      <div v-for="group in groups" :key="group.name">
        <div class="flex items-center gap-4 mb-4">
          <h2 class="text-lg font-bold text-void-100">{{ group.name }}</h2>
          <div class="flex-1 h-px bg-gradient-to-r from-void-800 to-transparent" />
        </div>
        <div class="space-y-4">
          <div
            v-for="ep in group.endpoints"
            :key="ep.id"
            class="rounded-xl border border-void-800/50 p-5 hover:border-void-700/50 transition-all duration-300"
            style="background: linear-gradient(160deg, rgba(25, 26, 31, 0.9), rgba(12, 12, 15, 0.95))"
          >
            <div class="flex items-center gap-3 mb-1">
              <span class="text-[10px] font-mono text-void-500 bg-void-900 px-2 py-0.5 rounded">{{ ep.method }}</span>
              <span class="text-sm font-mono text-void-200">{{ ep.path }}</span>
              <div class="flex-1" />
              <button
                :disabled="results[ep.id]?.status === 'loading'"
                class="text-xs font-semibold px-4 py-2 rounded-lg text-white cursor-pointer transition-all duration-200 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
                style="background: linear-gradient(135deg, #10b981, #047857)"
                @click="sendRequest(ep)"
              >
                <span
                  v-if="results[ep.id]?.status === 'loading'"
                  class="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full"
                  style="animation: spin 0.6s linear infinite"
                />
                <span v-else>Send</span>
              </button>
              <span
                v-if="results[ep.id]?.statusCode"
                :class="
                  (results[ep.id]?.statusCode ?? 0) < 400
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                "
                class="text-xs font-mono px-2.5 py-1 rounded-lg"
                >{{ results[ep.id]?.statusCode }}</span
              >
            </div>
            <p v-if="ep.note" class="text-[11px] text-void-500 mb-1 ml-14">{{ ep.note }}</p>

            <!-- Permission result -->
            <div
              v-if="!ep.isMirror && results[ep.id]?.statusCode"
              :class="
                (results[ep.id]?.statusCode ?? 0) < 400
                  ? 'bg-emerald-500/[0.06] border border-emerald-500/20 text-emerald-300'
                  : 'bg-red-500/[0.06] border border-red-500/20 text-red-300'
              "
              class="mt-3 rounded-lg p-3 text-xs font-mono"
            >
              <template v-if="(results[ep.id]?.statusCode ?? 0) < 400"
                >&#10003; Access granted — your <span class="font-semibold">{{ ep.requiredRole }}</span> role was
                verified
              </template>
              <template v-else
                >&#10007; Access denied — missing required role:
                <span class="font-semibold">{{ ep.requiredRole }}</span></template
              >
            </div>

            <!-- Flow visualization -->
            <div
              v-if="ep.isMirror && results[ep.id]?.status === 'success'"
              class="mt-4 flex items-center gap-1.5 flex-wrap text-[10px] font-mono overflow-x-auto py-2"
            >
              <span
                class="px-2.5 py-1.5 rounded-md border border-jade-500/30 text-jade-300"
                style="background: rgba(16, 185, 129, 0.06); animation: float-up 0.3s ease-out both"
                >Frontend</span
              >
              <span class="text-void-600" style="animation: float-up 0.3s ease-out 0.05s both"
                >── Bearer ──&#x27A4;</span
              >
              <span
                class="px-2.5 py-1.5 rounded-md border border-jade-500/30 text-jade-300"
                style="background: rgba(16, 185, 129, 0.06); animation: float-up 0.3s ease-out 0.1s both"
                >Gateway</span
              >
              <template v-if="ep.hasExchange">
                <span class="text-void-600" style="animation: float-up 0.3s ease-out 0.15s both"
                  >── RFC 8693 ──&#x27A4;</span
                >
                <span
                  class="px-2.5 py-1.5 rounded-md border border-void-700/50 text-void-300"
                  style="background: rgba(255, 255, 255, 0.02); animation: float-up 0.3s ease-out 0.2s both"
                  >Keycloak</span
                >
                <span class="text-void-600" style="animation: float-up 0.3s ease-out 0.25s both">──&#x27A4;</span>
                <span
                  class="px-2.5 py-1.5 rounded-md border border-jade-500/30 text-jade-300"
                  style="background: rgba(16, 185, 129, 0.06); animation: float-up 0.3s ease-out 0.3s both"
                  >Gateway</span
                >
                <span class="text-void-600" style="animation: float-up 0.3s ease-out 0.35s both"
                  >── JWT ──&#x27A4;</span
                >
                <span
                  class="px-2.5 py-1.5 rounded-md border border-jade-500/30 text-jade-300"
                  style="background: rgba(16, 185, 129, 0.06); animation: float-up 0.3s ease-out 0.4s both"
                  >{{ ep.serviceName }}</span
                >
              </template>
              <div v-if="results[ep.id]?.traceId" class="ml-auto" style="animation: float-up 0.3s ease-out 0.4s both">
                <a
                  :href="grafanaUrl(results[ep.id]!.traceId!)"
                  class="px-2.5 py-1.5 rounded-md border border-void-700/50 text-void-400 hover:text-jade-300 hover:border-jade-500/30 transition-colors no-underline inline-flex items-center gap-1.5"
                  rel="noopener"
                  style="background: rgba(255, 255, 255, 0.02)"
                  target="_blank"
                >
                  <svg fill="none" height="12" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="12">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" x2="21" y1="14" y2="3" />
                  </svg>
                  View trace
                </a>
              </div>
            </div>

            <details v-if="results[ep.id]?.status === 'success' || results[ep.id]?.status === 'error'" class="mt-3">
              <summary class="text-[11px] text-void-500 cursor-pointer hover:text-void-400 transition-colors">
                Request details
              </summary>
              <div
                class="mt-2 text-[10px] font-mono text-void-400 p-3 rounded-lg bg-void-950/80 border border-void-800/30 space-y-1"
              >
                <div><span class="text-void-500">URL:</span> {{ ep.path }}</div>
                <div>
                  <span class="text-void-500">Authorization:</span> Bearer
                  {{ auth.accessToken.value?.substring(0, 40) }}...
                </div>
              </div>
            </details>
            <details v-if="results[ep.id]?.body" class="mt-2">
              <summary class="text-[11px] text-void-500 cursor-pointer hover:text-void-400 transition-colors">
                Response body
              </summary>
              <pre
                class="mt-2 text-[10px] leading-relaxed text-void-400 font-mono overflow-auto max-h-40 p-3 rounded-lg bg-void-950/80 border border-void-800/30"
                >{{ results[ep.id]?.body }}</pre
              >
            </details>

            <!-- Token comparison -->
            <div
              v-if="ep.isMirror && results[ep.id]?.responseToken"
              class="mt-4 rounded-lg border border-jade-500/20 p-4 bg-jade-500/[0.03]"
            >
              <div class="flex items-center gap-2 mb-3">
                <span class="text-xs text-jade-400">&#8644;</span>
                <span class="text-xs font-semibold text-jade-300">{{
                  auth.accessToken.value === results[ep.id]?.responseToken
                    ? 'No token exchange on this hop'
                    : 'Token Exchange Successful'
                }}</span>
                <div class="flex gap-2 ml-auto">
                  <span
                    class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20"
                    >Sent: {{ tokenTypeLabel(auth.accessToken.value) }}</span
                  >
                  <span
                    class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    >Received: Exchanged JWT</span
                  >
                </div>
              </div>
              <div class="overflow-auto rounded-md border border-void-800/40 bg-void-950/60">
                <table class="w-full text-[10px] font-mono">
                  <thead>
                    <tr class="border-b border-void-800/40">
                      <th class="text-left p-2 text-void-500 font-medium w-[22%]">Field</th>
                      <th class="text-left p-2 text-blue-400/70 font-medium w-[34%]">Sent</th>
                      <th class="text-left p-2 text-rose-400/70 font-medium w-[34%]">Received</th>
                      <th class="text-left p-2 text-void-600 font-medium w-[10%]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="row in diffPayloads(auth.accessToken.value!, results[ep.id]!.responseToken!)"
                      :key="row.key"
                      :class="row.changed ? 'bg-jade-500/[0.04]' : ''"
                      class="border-b border-void-800/20"
                    >
                      <td :class="row.changed ? 'text-jade-300 font-semibold' : ''" class="p-2 text-void-400">
                        {{ row.key }}
                      </td>
                      <td class="p-2 text-blue-200/50 break-all">{{ row.sent }}</td>
                      <td :class="row.changed ? 'text-rose-300' : 'text-rose-200/50'" class="p-2 break-all">
                        {{ row.received }}
                      </td>
                      <td class="p-2 text-void-600 text-[9px] italic">{{ row.info ?? '' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
