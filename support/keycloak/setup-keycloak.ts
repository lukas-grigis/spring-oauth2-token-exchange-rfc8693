/**
 * Keycloak setup script using the official @keycloak/keycloak-admin-client.
 *
 * Idempotent — every resource is created if missing, then updated to match config.
 * Safe to re-run at any time. Uses typescript-result for typed error handling.
 *
 * Usage:
 *   npm run setup
 */

import KcAdminClient from "@keycloak/keycloak-admin-client";
import {Result} from "typescript-result";
import {configSchema} from "./config.js";
import rawConfig from "./keycloak.config.js";

const config = configSchema.parse(rawConfig);

class ConflictError {
    readonly type = "conflict" as const;
}

class KeycloakError {
    readonly type = "keycloak" as const;

    constructor(readonly cause: unknown) {
    }
}

function toKeycloakError(e: unknown): ConflictError | KeycloakError {
    const isConflict =
        typeof e === "object" &&
        e !== null &&
        "response" in e &&
        typeof (e as Record<string, unknown>).response === "object" &&
        (e as Record<string, Record<string, unknown>>).response?.status === 409;

    return isConflict ? new ConflictError() : new KeycloakError(e);
}

async function ensureCreated(name: string, createFn: () => Promise<unknown>): Promise<void> {
    const [, error] = (await Result.try(createFn, toKeycloakError)).toTuple();

    if (!error) {
        console.log(`   ${name} — created.`);
    } else if (error.type === "conflict") {
        console.log(`   ${name} — exists.`);
    } else {
        throw error.cause;
    }
}

async function main() {
    const {keycloak, realm, clients, roles, users} = config;

    console.log(`Keycloak: ${keycloak.url}`);

    const kc = new KcAdminClient({baseUrl: keycloak.url, realmName: "master"});
    await kc.auth({
        username: keycloak.adminUser,
        password: keycloak.adminPassword,
        grantType: "password",
        clientId: "admin-cli",
    });

    // 1. Realm — create if missing, then update
    console.log(`\n1. Realm: ${realm}`);
    const realmConfig = {
        realm,
        enabled: true,
        sslRequired: "none" as const,
        loginWithEmailAllowed: true,
        accessTokenLifespan: 300
    };
    await ensureCreated(realm, () => kc.realms.create(realmConfig));
    await kc.realms.update({realm}, realmConfig);
    kc.setConfig({realmName: realm});

    // 2. Roles — create if missing
    console.log(`\n2. Roles: [${roles.join(", ")}]`);
    for (const role of roles) {
        await ensureCreated(role, () => kc.roles.create({name: role}));
    }

    // 3. Public client — create or update
    const pub = clients.public;
    const priv = clients.private;
    console.log(`\n3. Client: ${pub.clientId} (public, PKCE S256, lightweight tokens)`);

    const publicClientConfig = {
        clientId: pub.clientId,
        enabled: true,
        publicClient: true,
        standardFlowEnabled: true,
        directAccessGrantsEnabled: false,
        redirectUris: ["*"],
        webOrigins: ["*"],
        protocol: "openid-connect" as const,
        fullScopeAllowed: true,
        attributes: {
            "pkce.code.challenge.method": "S256",
            "post.logout.redirect.uris": "+",
            "client.use.lightweight.access.token.enabled": "true",
        },
    };
    await ensureCreated(pub.clientId, () => kc.clients.create(publicClientConfig));
    const [pubFound] = await kc.clients.find({clientId: pub.clientId});
    const pubUuid = pubFound.id!;
    await kc.clients.update({id: pubUuid}, publicClientConfig);
    console.log(`   ${pub.clientId} — synced.`);

    // Audience mapper: public → private (create or update)
    const mapperName = `aud-${priv.clientId}`;
    const mapperConfig = {
        name: mapperName,
        protocol: "openid-connect" as const,
        protocolMapper: "oidc-audience-mapper",
        config: {
            "included.client.audience": priv.clientId,
            "id.token.claim": "false",
            "lightweight.claim": "true",
            "introspection.token.claim": "true",
            "access.token.claim": "true",
        },
    };
    await ensureCreated(mapperName, () => kc.clients.addProtocolMapper({id: pubUuid}, mapperConfig));
    const existingMappers = await kc.clients.listProtocolMappers({id: pubUuid});
    const mapper = existingMappers.find((m) => m.name === mapperName);
    if (mapper) {
        await kc.clients.updateProtocolMapper({id: pubUuid, mapperId: mapper.id!}, {...mapperConfig, id: mapper.id});
    }
    console.log(`   ${mapperName} — synced.`);

    // 4. Private client — create or update
    console.log(`\n4. Client: ${priv.clientId} (confidential, token exchange)`);
    const privateClientConfig = {
        clientId: priv.clientId,
        enabled: true,
        publicClient: false,
        clientAuthenticatorType: "client-secret",
        secret: priv.secret,
        standardFlowEnabled: true,
        directAccessGrantsEnabled: false,
        redirectUris: ["*"],
        webOrigins: ["*"],
        protocol: "openid-connect" as const,
        fullScopeAllowed: true,
        attributes: {
            "standard.token.exchange.enabled": "true",
            "post.logout.redirect.uris": "+",
        },
    };
    await ensureCreated(priv.clientId, () => kc.clients.create(privateClientConfig));
    const [privFound] = await kc.clients.find({clientId: priv.clientId});
    await kc.clients.update({id: privFound.id!}, privateClientConfig);
    console.log(`   ${priv.clientId} — synced.`);

    // 5. Users — create if missing, then sync roles
    console.log(`\n5. Users`);
    for (const u of users) {
        console.log(`   ${u.username} (${u.email}) → [${u.roles.join(", ")}]`);

        await ensureCreated(u.username, () =>
            kc.users.create({
                username: u.username,
                firstName: u.firstName,
                lastName: u.lastName,
                email: u.email,
                emailVerified: true,
                enabled: true,
                credentials: [{type: "password", value: u.password, temporary: false}],
            }),
        );

        const [found] = await kc.users.find({username: u.username, exact: true});
        const roleMappings = await Promise.all(
            u.roles.map(async (name) => {
                const role = await kc.roles.findOneByName({name});
                if (!role) throw new Error(`Role "${name}" not found`);
                return {id: role.id!, name: role.name!};
            }),
        );
        await kc.users.addRealmRoleMappings({id: found.id!, roles: roleMappings});
    }

    // Summary
    console.log(`\n--- Done! ---`);
    console.log(`Realm:   ${realm}`);
    console.log(`Public:  ${pub.clientId} (PKCE S256, lightweight, audience → ${priv.clientId})`);
    console.log(`Private: ${priv.clientId} (secret: ${priv.secret}, token exchange enabled)`);
    for (const u of users) {
        console.log(`User:    ${u.username} / ${u.password} → [${u.roles.join(", ")}]`);
    }
}

main().catch((err) => {
    console.error("Setup failed:", err);
    process.exit(1);
});
