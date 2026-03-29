import {z} from "zod";

const userSchema = z.object({
    username: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.email(),
    password: z.string(),
    roles: z.array(z.string()).default([]),
});

export const configSchema = z.object({
    keycloak: z
        .object({
            url: z.string().url().default("http://localhost/auth"),
            adminUser: z.string().default("admin"),
            adminPassword: z.string().default("admin"),
        })
        .default({}),

    realm: z.string().default("conference"),

    clients: z
        .object({
            public: z
                .object({
                    clientId: z.string().default("public"),
                })
                .default({}),
            private: z
                .object({
                    clientId: z.string().default("private"),
                    secret: z.string().default("knZMUYRIU3YC2CGZpyF8HiBdEfKzu1WD"),
                })
                .default({}),
            audienceTargets: z.array(z.object({
                clientId: z.string(),
                secret: z.string(),
            })).default([
                {clientId: "talk-service", secret: "talkServiceSecret8x7K2mPq"},
                {clientId: "review-service", secret: "reviewServiceSecret4nR9wLjY"},
            ]),
        })
        .default({}),

    roles: z.array(z.string()).default(["speaker", "reviewer"]),

    users: z.array(userSchema).default([
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
    ]),
});

export type Config = z.infer<typeof configSchema>;
