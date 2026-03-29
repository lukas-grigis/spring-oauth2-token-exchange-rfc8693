/**
 * Integration tests for the OAuth 2.0 Token Exchange (RFC 8693) flow.
 *
 * Requires the full stack to be running (Keycloak, Gateway, Talk Service, Review Service).
 * Start it with `mise run demo`, then run these tests with `mise run test:integration`.
 *
 * The tests log in as alice/bob, call mirror endpoints through the gateway, and verify
 * that the exchanged JWT carries the correct audience and realm roles.
 */

import {describe, it, before} from "node:test";
import assert from "node:assert/strict";

// ── Configuration (matches support/keycloak/keycloak.config.ts) ─────────────

const KEYCLOAK = "http://localhost/auth";
const GATEWAY = "http://localhost:8000";
const REALM = "conference";
const CLIENT_ID = "gateway";
const CLIENT_SECRET = "knZMUYRIU3YC2CGZpyF8HiBdEfKzu1WD";

// ── Helpers ─────────────────────────────────────────────────────────────────

function decodeJwt(token: string): Record<string, unknown> {
    return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
}

async function fetchJson(url: string, init?: RequestInit): Promise<{ status: number; body: Record<string, unknown> }> {
    const res = await fetch(url, init);
    return {status: res.status, body: (await res.json()) as Record<string, unknown>};
}

async function adminLogin(): Promise<string> {
    const {status, body} = await fetchJson(`${KEYCLOAK}/realms/master/protocol/openid-connect/token`, {
        method: "POST",
        headers: {"Content-Type": "application/x-www-form-urlencoded"},
        body: new URLSearchParams({grant_type: "password", client_id: "admin-cli", username: "admin", password: "admin"}),
    });
    assert.equal(status, 200, `Admin login failed: ${JSON.stringify(body)}`);
    return body.access_token as string;
}

async function setDirectAccessGrants(adminToken: string, enabled: boolean): Promise<void> {
    const {body: clients} = await fetchJson(`${KEYCLOAK}/admin/realms/${REALM}/clients?clientId=${CLIENT_ID}`, {
        headers: {Authorization: `Bearer ${adminToken}`},
    });
    const client = (clients as unknown as Record<string, unknown>[])[0];
    await fetch(`${KEYCLOAK}/admin/realms/${REALM}/clients/${client.id}`, {
        method: "PUT",
        headers: {Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json"},
        body: JSON.stringify({...client, directAccessGrantsEnabled: enabled}),
    });
}

async function login(username: string, password: string): Promise<string> {
    const {status, body} = await fetchJson(`${KEYCLOAK}/realms/${REALM}/protocol/openid-connect/token`, {
        method: "POST",
        headers: {"Content-Type": "application/x-www-form-urlencoded"},
        body: new URLSearchParams({
            grant_type: "password", client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
            username, password, scope: "openid",
        }),
    });
    assert.equal(status, 200, `Login failed for ${username}: ${JSON.stringify(body)}`);
    return body.access_token as string;
}

async function mirrorToken(path: string, token: string): Promise<string> {
    const res = await fetch(`${GATEWAY}${path}`, {headers: {Authorization: `Bearer ${token}`}});
    assert.equal(res.status, 200, `Mirror call to ${path} failed: ${res.status}`);
    const headers = (await res.json()) as Record<string, string>;
    const auth = Object.entries(headers).find(([k]) => k.toLowerCase() === "authorization")?.[1];
    assert.ok(auth, "No Authorization header in mirror response");
    return auth.replace(/^Bearer\s+/i, "");
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("token exchange flow", () => {
    let aliceToken: string;
    let bobToken: string;

    before(async () => {
        const health = await fetch(`${GATEWAY}/actuator/health`).catch(() => null);
        assert.ok(health?.ok, "Gateway is not reachable — is the stack running?");

        // Temporarily enable direct access grants to obtain user tokens, then disable
        const adminToken = await adminLogin();
        await setDirectAccessGrants(adminToken, true);
        [aliceToken, bobToken] = await Promise.all([login("alice", "alice"), login("bob", "bob")]);
        await setDirectAccessGrants(adminToken, false);
    });

    // ── alice (speaker) ─────────────────────────────────────────────────

    describe("alice (speaker)", () => {
        it("exchanged JWT for talk-service has aud=talk-service and role=speaker", async () => {
            const claims = decodeJwt(await mirrorToken("/talk-service/debug/mirror", aliceToken));

            const aud = [claims.aud].flat();
            assert.ok(aud.includes("talk-service"), `expected aud to include "talk-service", got ${JSON.stringify(aud)}`);

            const roles = (claims.realm_access as { roles: string[] })?.roles ?? [];
            assert.ok(roles.includes("speaker"), `expected roles to include "speaker", got ${JSON.stringify(roles)}`);
        });

        it("can access talk-service check-permission (has SPEAKER role)", async () => {
            const res = await fetch(`${GATEWAY}/talk-service/debug/check-permission`, {
                headers: {Authorization: `Bearer ${aliceToken}`},
            });
            assert.equal(res.status, 204);
        });

        it("cannot access review-service check-permission (missing REVIEWER role)", async () => {
            const res = await fetch(`${GATEWAY}/review-service/debug/check-permission`, {
                headers: {Authorization: `Bearer ${aliceToken}`},
            });
            assert.equal(res.status, 403);
        });
    });

    // ── bob (reviewer) ──────────────────────────────────────────────────

    describe("bob (reviewer)", () => {
        it("exchanged JWT for review-service has aud=review-service and role=reviewer", async () => {
            const claims = decodeJwt(await mirrorToken("/review-service/debug/mirror", bobToken));

            const aud = [claims.aud].flat();
            assert.ok(aud.includes("review-service"), `expected aud to include "review-service", got ${JSON.stringify(aud)}`);

            const roles = (claims.realm_access as { roles: string[] })?.roles ?? [];
            assert.ok(roles.includes("reviewer"), `expected roles to include "reviewer", got ${JSON.stringify(roles)}`);
        });

        it("can access review-service check-permission (has REVIEWER role)", async () => {
            const res = await fetch(`${GATEWAY}/review-service/debug/check-permission`, {
                headers: {Authorization: `Bearer ${bobToken}`},
            });
            assert.equal(res.status, 204);
        });

        it("cannot access talk-service check-permission (missing SPEAKER role)", async () => {
            const res = await fetch(`${GATEWAY}/talk-service/debug/check-permission`, {
                headers: {Authorization: `Bearer ${bobToken}`},
            });
            assert.equal(res.status, 403);
        });
    });

    // ── per-service token isolation ────────────────────────────────────

    it("exchanged tokens for talk-service and review-service are different", async () => {
        const talkJwt = await mirrorToken("/talk-service/debug/mirror", aliceToken);
        const reviewJwt = await mirrorToken("/review-service/debug/mirror", aliceToken);

        assert.notEqual(talkJwt, reviewJwt, "gateway must issue distinct tokens per downstream service");
        assert.notDeepEqual(decodeJwt(talkJwt).aud, decodeJwt(reviewJwt).aud, "audiences must differ between services");
    });

    // ── unauthenticated ─────────────────────────────────────────────────

    it("rejects unauthenticated requests with 401", async () => {
        const res = await fetch(`${GATEWAY}/talk-service/debug/mirror`);
        assert.equal(res.status, 401);
    });
});
