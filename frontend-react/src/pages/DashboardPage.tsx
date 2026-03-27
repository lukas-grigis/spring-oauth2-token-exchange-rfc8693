import { useCallback, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';

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

function decodeJwt(token: string): string {
  return JSON.stringify(parseJwt(token), null, 2);
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

const STEPS = [
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

const GROUPS = [
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

export function DashboardPage() {
  const auth = useAuth();
  const [jwtExpanded, setJwtExpanded] = useState(false);
  const [howOpen, setHowOpen] = useState(false);
  const [results, setResults] = useState<Record<string, EndpointResult>>({});
  const decodedJwt = useMemo(() => (auth.accessToken ? decodeJwt(auth.accessToken) : 'No token'), [auth.accessToken]);

  const sendRequest = useCallback(
    async (ep: EndpointCard) => {
      setResults((prev) => ({ ...prev, [ep.id]: { status: 'loading' } }));
      try {
        const res = await fetch(ep.path, { headers: { Authorization: `Bearer ${auth.accessToken}` } });
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
        setResults((prev) => ({
          ...prev,
          [ep.id]: {
            status: res.ok ? 'success' : 'error',
            statusCode: res.status,
            body,
            responseToken,
            traceId,
          },
        }));
      } catch (err) {
        setResults((prev) => ({ ...prev, [ep.id]: { status: 'error', statusCode: 0, body: String(err) } }));
      }
    },
    [auth.accessToken],
  );

  const flowNode = (label: string, delay: string, accent: boolean) => (
    <span
      key={label}
      className={`px-2.5 py-1.5 rounded-md border ${accent ? 'border-reactor-500/30 text-reactor-300' : 'border-deep-700/50 text-deep-300'}`}
      style={{
        background: accent ? 'rgba(6,182,212,0.06)' : 'rgba(255,255,255,0.02)',
        animation: `float-up 0.3s ease-out ${delay} both`,
      }}
    >
      {label}
    </span>
  );
  const flowArrow = (label: string, delay: string) => (
    <span key={`a-${label}`} className="text-deep-600" style={{ animation: `float-up 0.3s ease-out ${delay} both` }}>
      ── {label} ──&#x27A4;
    </span>
  );

  return (
    <div className="min-h-screen" style={{ background: 'radial-gradient(ellipse at 50% 0%, #0a1220 0%, #0b0b0e 45%)' }}>
      <header
        className="sticky top-0 z-50 border-b border-deep-800/50 backdrop-blur-xl"
        style={{ background: 'rgba(11,11,14,0.88)' }}
      >
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg width="20" height="20" viewBox="0 0 80 80" fill="none">
              <circle cx="40" cy="40" r="5" fill="#22d3ee" />
              <ellipse cx="40" cy="40" rx="36" ry="12" stroke="#06b6d4" strokeWidth="1" opacity="0.5" />
              <ellipse
                cx="40"
                cy="40"
                rx="36"
                ry="12"
                stroke="#0891b2"
                strokeWidth="1"
                opacity="0.4"
                transform="rotate(60 40 40)"
              />
              <ellipse
                cx="40"
                cy="40"
                rx="36"
                ry="12"
                stroke="#0e7490"
                strokeWidth="1"
                opacity="0.3"
                transform="rotate(-60 40 40)"
              />
            </svg>
            <span className="font-bold text-deep-100 text-sm">Token Exchange</span>
            <span className="text-[10px] font-mono text-deep-500 bg-deep-900 px-2 py-0.5 rounded-full">RFC 8693</span>
          </div>
          <div className="flex items-center gap-4">
            {auth.roles.map((role) => (
              <span
                key={role}
                className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-full border border-reactor-800/40"
                style={{
                  background: 'rgba(6,182,212,0.06)',
                  color: '#67e8f9',
                }}
              >
                {role}
              </span>
            ))}
            {auth.userInfo && (
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #06b6d4, #164e63)' }}
                >
                  {auth.initials}
                </div>
                <span className="text-sm text-deep-300 hidden sm:block">{auth.displayName}</span>
              </div>
            )}
            <button
              onClick={() => auth.logout()}
              className="text-xs text-deep-500 hover:text-reactor-400 transition-colors cursor-pointer font-mono"
            >
              logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8" style={{ animation: 'float-up 0.4s ease-out' }}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div
            className="rounded-xl border border-deep-800/50 p-6"
            style={{ background: 'linear-gradient(160deg, rgba(23,24,29,0.9), rgba(11,11,14,0.95))' }}
          >
            {auth.userInfo ? (
              <>
                <div className="flex items-center gap-4 mb-4">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold text-white"
                    style={{
                      background: 'linear-gradient(135deg, #06b6d4, #164e63)',
                      boxShadow: '0 4px 20px rgba(6,182,212,0.2)',
                    }}
                  >
                    {auth.initials}
                  </div>
                  <div>
                    <div className="font-semibold text-deep-100">{auth.displayName}</div>
                    <div className="text-sm text-deep-400">{auth.userInfo?.preferred_username}</div>
                    <div className="text-xs text-deep-500">{auth.userInfo?.email}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {auth.roles.map((role) => (
                    <span
                      key={role}
                      className="text-[11px] font-mono px-3 py-1 rounded-lg border border-reactor-900/50"
                      style={{
                        background: 'rgba(6,182,212,0.05)',
                        color: '#22d3ee',
                      }}
                    >
                      {role}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-deep-800 animate-pulse" />
                <div className="space-y-2">
                  <div className="h-4 w-32 rounded bg-deep-800 animate-pulse" />
                  <div className="h-3 w-24 rounded bg-deep-800/60 animate-pulse" />
                </div>
              </div>
            )}
          </div>
          <div
            className="rounded-xl border border-deep-800/50 p-6"
            style={{ background: 'linear-gradient(160deg, rgba(23,24,29,0.9), rgba(11,11,14,0.95))' }}
          >
            <button
              onClick={() => setJwtExpanded(!jwtExpanded)}
              className="flex items-center justify-between w-full text-left cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-deep-200 group-hover:text-deep-100 transition-colors">
                  Access Token
                </span>
                <span
                  className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                  style={{
                    background: 'rgba(6,182,212,0.1)',
                    color: '#67e8f9',
                  }}
                >
                  {tokenTypeLabel(auth.accessToken)}
                </span>
              </div>
              <span
                className="text-deep-500 text-xs font-mono transition-transform duration-200"
                style={{ transform: jwtExpanded ? 'rotate(180deg)' : '' }}
              >
                &#9660;
              </span>
            </button>
            {jwtExpanded && (
              <pre className="mt-4 text-[11px] leading-relaxed text-deep-300 font-mono overflow-auto max-h-64 p-4 rounded-lg bg-deep-950/80 border border-deep-800/40">
                {decodedJwt}
              </pre>
            )}
          </div>
        </div>

        {/* How it works */}
        <div
          className="rounded-xl border border-reactor-500/15 p-5"
          style={{ background: 'linear-gradient(160deg, rgba(23,24,29,0.9), rgba(11,11,14,0.95))' }}
        >
          <button
            onClick={() => setHowOpen(!howOpen)}
            className="flex items-center justify-between w-full text-left cursor-pointer"
          >
            <span className="text-sm font-semibold" style={{ color: '#67e8f9' }}>
              How Token Exchange Works
            </span>
            <span
              className="text-deep-500 text-xs font-mono transition-transform duration-200"
              style={{ transform: howOpen ? 'rotate(180deg)' : '' }}
            >
              &#9660;
            </span>
          </button>
          {howOpen && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              {STEPS.map((step) => (
                <div key={step.n} className="rounded-lg border border-deep-800/40 p-4 bg-deep-950/50">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ background: 'linear-gradient(135deg, #06b6d4, #0e7490)' }}
                    >
                      {step.n}
                    </span>
                    <span className="text-xs font-semibold text-deep-200">{step.title}</span>
                  </div>
                  <p className="text-[11px] text-deep-400 leading-relaxed">{step.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {GROUPS.map((group) => (
          <div key={group.name}>
            <div className="flex items-center gap-4 mb-4">
              <h2 className="text-lg font-bold text-deep-100">{group.name}</h2>
              <div className="flex-1 h-px bg-gradient-to-r from-deep-800 to-transparent" />
            </div>
            <div className="space-y-4">
              {group.endpoints.map((ep) => (
                <div
                  key={ep.id}
                  className="rounded-xl border border-deep-800/50 p-5 hover:border-deep-700/50 transition-all duration-300"
                  style={{ background: 'linear-gradient(160deg, rgba(23,24,29,0.9), rgba(11,11,14,0.95))' }}
                >
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-[10px] font-mono text-deep-500 bg-deep-900 px-2 py-0.5 rounded">
                      {ep.method}
                    </span>
                    <span className="text-sm font-mono text-deep-200">{ep.path}</span>
                    <div className="flex-1" />
                    <button
                      onClick={() => sendRequest(ep)}
                      disabled={results[ep.id]?.status === 'loading'}
                      className="text-xs font-semibold px-4 py-2 rounded-lg text-white cursor-pointer transition-all duration-200 hover:shadow-[0_0_20px_rgba(6,182,212,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: 'linear-gradient(135deg, #06b6d4, #0e7490)' }}
                    >
                      {results[ep.id]?.status === 'loading' ? (
                        <span
                          className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full"
                          style={{ animation: 'spin 0.6s linear infinite' }}
                        />
                      ) : (
                        'Send'
                      )}
                    </button>
                    {results[ep.id]?.statusCode != null && results[ep.id]!.statusCode! > 0 && (
                      <span
                        className={`text-xs font-mono px-2.5 py-1 rounded-lg ${results[ep.id]!.statusCode! < 400 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}
                      >
                        {results[ep.id]!.statusCode}
                      </span>
                    )}
                  </div>
                  {ep.note && <p className="text-[11px] text-deep-500 mb-1 ml-14">{ep.note}</p>}

                  {!ep.isMirror && results[ep.id]?.statusCode != null && results[ep.id]!.statusCode! > 0 && (
                    <div
                      className={`mt-3 rounded-lg p-3 text-xs font-mono ${results[ep.id]!.statusCode! < 400 ? 'bg-emerald-500/[0.06] border border-emerald-500/20 text-emerald-300' : 'bg-red-500/[0.06] border border-red-500/20 text-red-300'}`}
                    >
                      {results[ep.id]!.statusCode! < 400 ? (
                        <>
                          &#10003; Access granted — your <span className="font-semibold">{ep.requiredRole}</span> role
                          was verified
                        </>
                      ) : (
                        <>
                          &#10007; Access denied — missing required role:{' '}
                          <span className="font-semibold">{ep.requiredRole}</span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Flow visualization */}
                  {ep.isMirror && results[ep.id]?.status === 'success' && (
                    <div className="mt-4 flex items-center gap-1.5 flex-wrap text-[10px] font-mono overflow-x-auto py-2">
                      {flowNode('Frontend', '0s', true)}
                      {flowArrow('Bearer', '0.05s')}
                      {flowNode('Gateway', '0.1s', true)}
                      {ep.hasExchange && (
                        <>
                          {flowArrow('RFC 8693', '0.15s')}
                          {flowNode('Keycloak', '0.2s', false)}
                          <span
                            key="a-return"
                            className="text-deep-600"
                            style={{ animation: 'float-up 0.3s ease-out 0.25s both' }}
                          >
                            ──&#x27A4;
                          </span>
                          {flowNode('Gateway', '0.3s', true)}
                          {flowArrow('JWT', '0.35s')}
                          {flowNode(ep.serviceName, '0.4s', true)}
                        </>
                      )}
                      {results[ep.id]?.traceId && (
                        <div className="ml-auto" style={{ animation: 'float-up 0.3s ease-out 0.4s both' }}>
                          <a
                            href={grafanaUrl(results[ep.id]!.traceId!)}
                            target="_blank"
                            rel="noopener"
                            className="px-2.5 py-1.5 rounded-md border border-deep-700/50 text-deep-400 hover:text-reactor-300 hover:border-reactor-500/30 transition-colors no-underline inline-flex items-center gap-1.5"
                            style={{ background: 'rgba(255,255,255,0.02)' }}
                          >
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                              <polyline points="15 3 21 3 21 9" />
                              <line x1="10" y1="14" x2="21" y2="3" />
                            </svg>
                            View trace
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {(results[ep.id]?.status === 'success' || results[ep.id]?.status === 'error') && (
                    <details className="mt-3">
                      <summary className="text-[11px] text-deep-500 cursor-pointer hover:text-deep-400 transition-colors">
                        Request details
                      </summary>
                      <div className="mt-2 text-[10px] font-mono text-deep-400 p-3 rounded-lg bg-deep-950/80 border border-deep-800/30 space-y-1">
                        <div>
                          <span className="text-deep-500">URL:</span> {ep.path}
                        </div>
                        <div>
                          <span className="text-deep-500">Authorization:</span> Bearer{' '}
                          {auth.accessToken?.substring(0, 40)}...
                        </div>
                      </div>
                    </details>
                  )}
                  {results[ep.id]?.body && (
                    <details className="mt-2">
                      <summary className="text-[11px] text-deep-500 cursor-pointer hover:text-deep-400 transition-colors">
                        Response body
                      </summary>
                      <pre className="mt-2 text-[10px] leading-relaxed text-deep-400 font-mono overflow-auto max-h-40 p-3 rounded-lg bg-deep-950/80 border border-deep-800/30">
                        {results[ep.id]!.body}
                      </pre>
                    </details>
                  )}

                  {ep.isMirror && results[ep.id]?.responseToken && (
                    <div className="mt-4 rounded-lg border border-reactor-500/20 p-4 bg-reactor-500/[0.03]">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs text-reactor-400">&#8644;</span>
                        <span className="text-xs font-semibold text-reactor-300">
                          {auth.accessToken === results[ep.id]!.responseToken
                            ? 'No token exchange on this hop'
                            : 'Token Exchange Successful'}
                        </span>
                        <div className="flex gap-2 ml-auto">
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            Sent: {tokenTypeLabel(auth.accessToken)}
                          </span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            Received: Exchanged JWT
                          </span>
                        </div>
                      </div>
                      <div className="overflow-auto rounded-md border border-deep-800/40 bg-deep-950/60">
                        <table className="w-full text-[10px] font-mono">
                          <thead>
                            <tr className="border-b border-deep-800/40">
                              <th className="text-left p-2 text-deep-500 font-medium w-[22%]">Field</th>
                              <th className="text-left p-2 text-blue-400/70 font-medium w-[34%]">Sent</th>
                              <th className="text-left p-2 text-rose-400/70 font-medium w-[34%]">Received</th>
                              <th className="text-left p-2 text-deep-600 font-medium w-[10%]"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {diffPayloads(auth.accessToken!, results[ep.id]!.responseToken!).map((row) => (
                              <tr
                                key={row.key}
                                className={`border-b border-deep-800/20 ${row.changed ? 'bg-reactor-500/[0.04]' : ''}`}
                              >
                                <td
                                  className={`p-2 text-deep-400 ${row.changed ? 'text-reactor-300 font-semibold' : ''}`}
                                >
                                  {row.key}
                                </td>
                                <td className="p-2 text-blue-200/50 break-all">{row.sent}</td>
                                <td className={`p-2 break-all ${row.changed ? 'text-rose-300' : 'text-rose-200/50'}`}>
                                  {row.received}
                                </td>
                                <td className="p-2 text-deep-600 text-[9px] italic">{row.info ?? ''}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
