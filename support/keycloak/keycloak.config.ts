import type {Config} from "./config.js";

const config: Config = {
    keycloak: {
        url: "http://localhost/auth",
        adminUser: "admin",
        adminPassword: "admin", // demo only — use environment variables or a secrets manager in production
    },

    realm: "conference",

    clients: {
        public: {
            clientId: "public",
        },
        private: {
            clientId: "private",
            secret: "knZMUYRIU3YC2CGZpyF8HiBdEfKzu1WD", // demo only — use environment variables or a secrets manager in production
        },
        audienceTargets: [
            {clientId: "talk-service", secret: "talkServiceSecret8x7K2mPq"}, // demo only — use environment variables or a secrets manager in production
            {clientId: "review-service", secret: "reviewServiceSecret4nR9wLjY"}, // demo only — use environment variables or a secrets manager in production
        ],
    },

    roles: ["speaker", "reviewer"],

    users: [
        {
            username: "alice",
            firstName: "Alice",
            lastName: "Smith",
            email: "alice@example.com",
            password: "alice",
            roles: ["speaker"],
        },
        {
            username: "bob",
            firstName: "Bob",
            lastName: "Jones",
            email: "bob@example.com",
            password: "bob",
            roles: ["reviewer"],
        },
    ],
};

export default config;
