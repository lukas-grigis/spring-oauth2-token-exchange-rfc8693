import type {Config} from "./config.js";

const config: Config = {
    keycloak: {
        url: "http://localhost/auth",
        adminUser: "admin",
        adminPassword: "admin",
    },

    realm: "conference",

    clients: {
        public: {
            clientId: "public",
        },
        private: {
            clientId: "private",
            secret: "knZMUYRIU3YC2CGZpyF8HiBdEfKzu1WD",
        },
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
