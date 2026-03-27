import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../services/auth.service';

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
  parsedBody?: Record<string, string>;
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

function decodeJwt(token: string): string {
  return JSON.stringify(parseJwt(token), null, 2);
}

function isJwt(token: string): boolean {
  return token.split('.').length === 3;
}

function tokenTypeLabel(token: string): string {
  return isJwt(token) ? 'JWT' : 'Opaque Token';
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

function extractToken(headers: Record<string, string>): string | null {
  const h = headers['authorization'] || headers['Authorization'];
  if (!h) return null;
  const t = h.replace(/^Bearer\s+/i, '');
  return t.split('.').length === 3 ? t : null;
}

function extractTraceId(headers: Record<string, string>): string | null {
  const tp = headers['traceparent'];
  if (!tp) return null;
  const parts = tp.split('-');
  return parts.length >= 3 ? parts[1] : null;
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

@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen" style="background: radial-gradient(ellipse at 50% 0%, #1a0a08 0%, #0d0d10 50%)">
      <header
        class="sticky top-0 z-50 border-b border-obsidian-800/60 backdrop-blur-xl"
        style="background: rgba(13,13,16,0.85)"
      >
        <div class="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <svg width="24" height="27" viewBox="0 0 256 272" fill="none">
              <path
                d="M128 0L256 45.2V181.1C256 225.5 219 259.1 128 272C37 259.1 0 225.5 0 181.1V45.2L128 0Z"
                fill="url(#hdr-grad)"
              />
              <defs>
                <linearGradient id="hdr-grad" x1="128" y1="0" x2="128" y2="272" gradientUnits="userSpaceOnUse">
                  <stop stop-color="#ff6b5b" />
                  <stop offset="1" stop-color="#c81508" />
                </linearGradient>
              </defs>
            </svg>
            <span class="font-bold text-obsidian-100 text-sm tracking-tight">Token Exchange</span>
            <span class="text-[10px] font-mono text-obsidian-500 bg-obsidian-900 px-2 py-0.5 rounded-full"
              >RFC 8693</span
            >
          </div>
          <div class="flex items-center gap-4">
            @for (role of auth.roles(); track role) {
              <span
                class="text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-full border border-forge-800/40"
                style="background: rgba(255,61,46,0.08); color: #ffa097"
                >{{ role }}</span
              >
            }
            @if (auth.userInfo()) {
              <div class="flex items-center gap-2.5">
                <div
                  class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style="background: linear-gradient(135deg, #ff3d2e, #881912)"
                >
                  {{ auth.initials() }}
                </div>
                <span class="text-sm text-obsidian-300 hidden sm:block">{{ auth.displayName() }}</span>
              </div>
            }
            <button
              (click)="auth.logout()"
              class="text-xs text-obsidian-500 hover:text-forge-400 transition-colors cursor-pointer font-mono"
            >
              logout
            </button>
          </div>
        </div>
      </header>

      <main class="max-w-5xl mx-auto px-6 py-8 space-y-8" style="animation: fade-in-up 0.4s ease-out">
        <!-- User info + JWT -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div
            class="rounded-xl border border-obsidian-800/60 p-6"
            style="background: linear-gradient(135deg, rgba(26,26,30,0.9), rgba(13,13,16,0.95))"
          >
            @if (auth.userInfo(); as user) {
              <div class="flex items-center gap-4 mb-4">
                <div
                  class="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold text-white"
                  style="background: linear-gradient(135deg, #ff3d2e, #881912); box-shadow: 0 4px 20px rgba(200,21,8,0.25)"
                >
                  {{ auth.initials() }}
                </div>
                <div>
                  <div class="font-semibold text-obsidian-100">{{ auth.displayName() }}</div>
                  <div class="text-sm text-obsidian-400">{{ user.preferred_username }}</div>
                  <div class="text-xs text-obsidian-500">{{ user.email }}</div>
                </div>
              </div>
              <div class="flex flex-wrap gap-2">
                @for (role of auth.roles(); track role) {
                  <span
                    class="text-[11px] font-mono px-3 py-1 rounded-lg border border-forge-900/50"
                    style="background: rgba(255,61,46,0.06); color: #ff6b5b"
                    >{{ role }}</span
                  >
                }
              </div>
            } @else {
              <div class="flex items-center gap-4">
                <div class="w-14 h-14 rounded-xl bg-obsidian-800 animate-pulse"></div>
                <div class="space-y-2">
                  <div class="h-4 w-32 rounded bg-obsidian-800 animate-pulse"></div>
                  <div class="h-3 w-24 rounded bg-obsidian-800/60 animate-pulse"></div>
                </div>
              </div>
            }
          </div>
          <div
            class="rounded-xl border border-obsidian-800/60 p-6"
            style="background: linear-gradient(135deg, rgba(26,26,30,0.9), rgba(13,13,16,0.95))"
          >
            <button
              (click)="jwtExpanded.set(!jwtExpanded())"
              class="flex items-center justify-between w-full text-left cursor-pointer group"
            >
              <div class="flex items-center gap-2">
                <span class="text-sm font-semibold text-obsidian-200 group-hover:text-obsidian-100 transition-colors"
                  >Access Token</span
                >
                <span
                  class="text-[9px] font-mono px-1.5 py-0.5 rounded"
                  style="background: rgba(255,61,46,0.1); color: #ffa097"
                  >{{ sentTokenType() }}</span
                >
              </div>
              <span
                class="text-obsidian-500 text-xs font-mono transition-transform duration-200"
                [class.rotate-180]="jwtExpanded()"
                >&#9660;</span
              >
            </button>
            @if (jwtExpanded()) {
              <pre
                class="mt-4 text-[11px] leading-relaxed text-obsidian-300 font-mono overflow-auto max-h-64 p-4 rounded-lg bg-obsidian-950/80 border border-obsidian-800/40"
                >{{ decodedJwt() }}</pre
              >
            }
          </div>
        </div>

        <!-- How it works (toggle, not details) -->
        <div
          class="rounded-xl border border-forge-500/15 p-5"
          style="background: linear-gradient(135deg, rgba(26,26,30,0.9), rgba(13,13,16,0.95))"
        >
          <button
            (click)="howItWorksOpen.set(!howItWorksOpen())"
            class="flex items-center justify-between w-full text-left cursor-pointer"
          >
            <span class="text-sm font-semibold" style="color: #ffa097">How Token Exchange Works</span>
            <span
              class="text-obsidian-500 text-xs font-mono transition-transform duration-200"
              [class.rotate-180]="howItWorksOpen()"
              >&#9660;</span
            >
          </button>
          @if (howItWorksOpen()) {
            <div class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              @for (step of howItWorksSteps; track step.n) {
                <div class="rounded-lg border border-obsidian-800/40 p-4 bg-obsidian-950/50">
                  <div class="flex items-center gap-2 mb-2">
                    <span
                      class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                      style="background: linear-gradient(135deg, #ff3d2e, #c81508)"
                      >{{ step.n }}</span
                    >
                    <span class="text-xs font-semibold text-obsidian-200">{{ step.title }}</span>
                  </div>
                  <p class="text-[11px] text-obsidian-400 leading-relaxed">{{ step.text }}</p>
                </div>
              }
            </div>
          }
        </div>

        <!-- Endpoint groups -->
        @for (group of groups; track group.name; let gi = $index) {
          <div
            style="animation: fade-in-up 0.4s ease-out; animation-delay: {{ gi * 100 }}ms; animation-fill-mode: both"
          >
            <div class="flex items-center gap-4 mb-4">
              <h2 class="text-lg font-bold text-obsidian-100">{{ group.name }}</h2>
              <div class="flex-1 h-px bg-gradient-to-r from-obsidian-800 to-transparent"></div>
            </div>
            <div class="space-y-4">
              @for (ep of group.endpoints; track ep.id) {
                <div
                  class="rounded-xl border border-obsidian-800/60 p-5 hover:border-obsidian-700/60 transition-all duration-300"
                  style="background: linear-gradient(135deg, rgba(26,26,30,0.9), rgba(13,13,16,0.95))"
                >
                  <div class="flex items-center gap-3 mb-1">
                    <span class="text-[10px] font-mono text-obsidian-500 bg-obsidian-900 px-2 py-0.5 rounded">{{
                      ep.method
                    }}</span>
                    <span class="text-sm font-mono text-obsidian-200">{{ ep.path }}</span>
                    <div class="flex-1"></div>
                    <button
                      (click)="sendRequest(ep)"
                      [disabled]="results()[ep.id]?.status === 'loading'"
                      class="text-xs font-semibold px-4 py-2 rounded-lg text-white cursor-pointer transition-all duration-200
                                   hover:shadow-[0_0_20px_rgba(255,61,46,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
                      style="background: linear-gradient(135deg, #ff3d2e, #c81508)"
                    >
                      @if (results()[ep.id]?.status === 'loading') {
                        <span
                          class="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full"
                          style="animation: spin 0.6s linear infinite"
                        ></span>
                      } @else {
                        Send
                      }
                    </button>
                    @if (results()[ep.id]?.statusCode; as code) {
                      <span
                        class="text-xs font-mono px-2.5 py-1 rounded-lg"
                        [class]="
                          code < 400
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        "
                        >{{ code }}</span
                      >
                    }
                  </div>
                  @if (ep.note) {
                    <p class="text-[11px] text-obsidian-500 mb-1 ml-14">{{ ep.note }}</p>
                  }

                  <!-- Permission result -->
                  @if (!ep.isMirror && results()[ep.id]?.statusCode; as code) {
                    <div
                      class="mt-3 rounded-lg p-3 text-xs font-mono"
                      [class]="
                        code < 400
                          ? 'bg-emerald-500/[0.06] border border-emerald-500/20 text-emerald-300'
                          : 'bg-red-500/[0.06] border border-red-500/20 text-red-300'
                      "
                    >
                      @if (code < 400) {
                        &#10003; Access granted — your <span class="font-semibold">{{ ep.requiredRole }}</span> role was
                        verified
                      } @else {
                        &#10007; Access denied — missing required role:
                        <span class="font-semibold">{{ ep.requiredRole }}</span>
                      }
                    </div>
                  }

                  <!-- Flow visualization (mirror endpoints only, after response) -->
                  @if (ep.isMirror && results()[ep.id]?.status === 'success') {
                    <div class="mt-4 flex items-center gap-1.5 flex-wrap text-[10px] font-mono overflow-x-auto py-2">
                      <span
                        class="px-2.5 py-1.5 rounded-md border border-forge-500/30 text-forge-300"
                        style="background: rgba(255,61,46,0.06); animation: fade-in-up 0.3s ease-out both"
                        >Frontend</span
                      >
                      <span class="text-obsidian-600" style="animation: fade-in-up 0.3s ease-out 0.05s both"
                        >── Bearer ──&#x27A4;</span
                      >
                      <span
                        class="px-2.5 py-1.5 rounded-md border border-forge-500/30 text-forge-300"
                        style="background: rgba(255,61,46,0.06); animation: fade-in-up 0.3s ease-out 0.1s both"
                        >Gateway</span
                      >
                      @if (ep.hasExchange) {
                        <span class="text-obsidian-600" style="animation: fade-in-up 0.3s ease-out 0.15s both"
                          >── RFC 8693 ──&#x27A4;</span
                        >
                        <span
                          class="px-2.5 py-1.5 rounded-md border border-obsidian-700/50 text-obsidian-300"
                          style="background: rgba(255,255,255,0.02); animation: fade-in-up 0.3s ease-out 0.2s both"
                          >Keycloak</span
                        >
                        <span class="text-obsidian-600" style="animation: fade-in-up 0.3s ease-out 0.25s both"
                          >──&#x27A4;</span
                        >
                        <span
                          class="px-2.5 py-1.5 rounded-md border border-forge-500/30 text-forge-300"
                          style="background: rgba(255,61,46,0.06); animation: fade-in-up 0.3s ease-out 0.3s both"
                          >Gateway</span
                        >
                        <span class="text-obsidian-600" style="animation: fade-in-up 0.3s ease-out 0.35s both"
                          >── JWT ──&#x27A4;</span
                        >
                        <span
                          class="px-2.5 py-1.5 rounded-md border border-forge-500/30 text-forge-300"
                          style="background: rgba(255,61,46,0.06); animation: fade-in-up 0.3s ease-out 0.4s both"
                          >{{ ep.serviceName }}</span
                        >
                      }

                      <!-- Grafana trace link -->
                      @if (results()[ep.id]?.traceId; as tid) {
                        <div class="ml-auto" style="animation: fade-in-up 0.3s ease-out 0.4s both">
                          <a
                            [href]="getGrafanaUrl(tid)"
                            target="_blank"
                            rel="noopener"
                            class="px-2.5 py-1.5 rounded-md border border-obsidian-700/50 text-obsidian-400 hover:text-forge-300 hover:border-forge-500/30 transition-colors no-underline inline-flex items-center gap-1.5"
                            style="background: rgba(255,255,255,0.02)"
                          >
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="2"
                            >
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                              <polyline points="15 3 21 3 21 9" />
                              <line x1="10" y1="14" x2="21" y2="3" />
                            </svg>
                            View trace
                          </a>
                        </div>
                      }
                    </div>
                  }

                  <!-- Request / Response details -->
                  @if (results()[ep.id]?.status === 'success' || results()[ep.id]?.status === 'error') {
                    <details class="mt-3">
                      <summary
                        class="text-[11px] text-obsidian-500 cursor-pointer hover:text-obsidian-400 transition-colors"
                      >
                        Request details
                      </summary>
                      <div
                        class="mt-2 text-[10px] font-mono text-obsidian-400 p-3 rounded-lg bg-obsidian-950/80 border border-obsidian-800/30 space-y-1"
                      >
                        <div><span class="text-obsidian-500">URL:</span> {{ ep.path }}</div>
                        <div>
                          <span class="text-obsidian-500">Authorization:</span> Bearer
                          {{ auth.accessToken()?.substring(0, 40) }}...
                        </div>
                      </div>
                    </details>
                  }
                  @if (results()[ep.id]?.body; as body) {
                    <details class="mt-2">
                      <summary
                        class="text-[11px] text-obsidian-500 cursor-pointer hover:text-obsidian-400 transition-colors"
                      >
                        Response body
                      </summary>
                      <pre
                        class="mt-2 text-[10px] leading-relaxed text-obsidian-400 font-mono overflow-auto max-h-40 p-3 rounded-lg bg-obsidian-950/80 border border-obsidian-800/30"
                        >{{ body }}</pre
                      >
                    </details>
                  }

                  <!-- Token comparison -->
                  @if (ep.isMirror && results()[ep.id]?.responseToken; as respToken) {
                    <div class="mt-4 rounded-lg border border-forge-500/20 p-4 bg-forge-500/[0.03]">
                      <div class="flex items-center gap-2 mb-3">
                        <span class="text-xs" style="color: #ff6b5b">&#8644;</span>
                        <span class="text-xs font-semibold" style="color: #ffa097">
                          {{
                            auth.accessToken() === respToken
                              ? 'No token exchange on this hop'
                              : 'Token Exchange Successful'
                          }}</span
                        >
                        <div class="flex gap-2 ml-auto">
                          <span
                            class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20"
                            >Sent: {{ sentTokenType() }}</span
                          >
                          <span
                            class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            >Received: Exchanged JWT</span
                          >
                        </div>
                      </div>
                      <div class="overflow-auto rounded-md border border-obsidian-800/40 bg-obsidian-950/60">
                        <table class="w-full text-[10px] font-mono">
                          <thead>
                            <tr class="border-b border-obsidian-800/40">
                              <th class="text-left p-2 text-obsidian-500 font-medium w-[22%]">Field</th>
                              <th class="text-left p-2 text-blue-400/70 font-medium w-[34%]">Sent</th>
                              <th class="text-left p-2 text-rose-400/70 font-medium w-[34%]">Received</th>
                              <th class="text-left p-2 text-obsidian-600 font-medium w-[10%]"></th>
                            </tr>
                          </thead>
                          <tbody>
                            @for (row of getDiff(auth.accessToken()!, respToken); track row.key) {
                              <tr
                                class="border-b border-obsidian-800/20"
                                [class]="row.changed ? 'bg-forge-500/[0.04]' : ''"
                              >
                                <td
                                  class="p-2 text-obsidian-400"
                                  [class]="row.changed ? 'text-forge-300 font-semibold' : ''"
                                >
                                  {{ row.key }}
                                </td>
                                <td class="p-2 text-blue-200/50 break-all">{{ row.sent }}</td>
                                <td class="p-2 break-all" [class]="row.changed ? 'text-rose-300' : 'text-rose-200/50'">
                                  {{ row.received }}
                                </td>
                                <td class="p-2 text-obsidian-600 text-[9px] italic">{{ row.info ?? '' }}</td>
                              </tr>
                            }
                          </tbody>
                        </table>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }
      </main>
    </div>
  `,
  styles: `
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `,
})
export class DashboardComponent {
  readonly auth = inject(AuthService);
  readonly jwtExpanded = signal(false);
  readonly howItWorksOpen = signal(false);
  readonly decodedJwt = computed(() => {
    const t = this.auth.accessToken();
    return t ? decodeJwt(t) : 'No token';
  });
  readonly sentTokenType = computed(() => {
    const t = this.auth.accessToken();
    return t ? tokenTypeLabel(t) : '—';
  });
  readonly results = signal<Record<string, EndpointResult>>({});
  readonly getDiff = diffPayloads;
  readonly getGrafanaUrl = grafanaUrl;
  readonly howItWorksSteps = [
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
  readonly groups = [
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
  private readonly http = inject(HttpClient);

  sendRequest(ep: EndpointCard): void {
    this.results.update((prev) => ({ ...prev, [ep.id]: { status: 'loading' } }));
    this.http.get<Record<string, string>>(ep.path, { observe: 'response' }).subscribe({
      next: (res) => {
        const body = res.body;
        this.results.update((prev) => ({
          ...prev,
          [ep.id]: {
            status: 'success',
            statusCode: res.status,
            body: body ? JSON.stringify(body, null, 2) : '(no body)',
            responseToken: body && ep.isMirror ? (extractToken(body) ?? undefined) : undefined,
            traceId: body ? (extractTraceId(body) ?? undefined) : undefined,
            parsedBody: body ?? undefined,
          },
        }));
      },
      error: (err) => {
        this.results.update((prev) => ({
          ...prev,
          [ep.id]: {
            status: 'error',
            statusCode: err.status,
            body: err.error ? JSON.stringify(err.error, null, 2) : err.message,
          },
        }));
      },
    });
  }
}
