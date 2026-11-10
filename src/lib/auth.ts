import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "@/lib/prisma";

// No explicit return type here on purpose: betterAuth() is generic over its
// options, and TypeScript only infers the custom additionalFields (role)
// that the rest of the app relies on (session.user.role) when it can see
// the literal options object passed to this exact call.
function buildAuth() {
  const authSecret = process.env.BETTER_AUTH_SECRET;
  if (!authSecret || authSecret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET must be set to a value of at least 32 characters.");
  }
  return betterAuth({
    database: prismaAdapter(prisma, {
      provider: "postgresql",
    }),
    baseURL: process.env.BETTER_AUTH_URL,
    secret: authSecret,
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
    },
    user: {
      validateUserInfo: ({ user, source }) => {
        // Also fires on sign-in/account-linking, where `user` doesn't
        // reliably carry `name` — only validate on actual account creation.
        if (source.action !== "create-user") return;
        const name = typeof user.name === "string" ? user.name.trim() : "";
        if (name.length < 2 || name.length > 100) {
          return { error: "invalid_name", errorDescription: "Name must be between 2 and 100 characters." };
        }
        // `input: true` lets self-registration choose "learner" or
        // "instructor" (see RegisterForm) — never "admin", which this
        // blocks regardless of what a crafted request sends.
        const role = (user as { role?: unknown }).role;
        if (role !== undefined && role !== "learner" && role !== "instructor") {
          return { error: "invalid_role", errorDescription: "Role must be \"learner\" or \"instructor\"." };
        }
      },
      additionalFields: {
        role: {
          type: "string",
          required: false,
          defaultValue: "learner",
          input: true,
        },
        // Set only by the Enterprise SSO endpoint (direct adapter write),
        // never by a regular signup/update call.
        isEnterpriseSso: {
          type: "boolean",
          required: false,
          defaultValue: false,
          input: false,
        },
      },
    },
  });
}

type Auth = ReturnType<typeof buildAuth>;

let cached: Auth | undefined;

// Lazily built on first use, not at import time — same reasoning as
// src/lib/prisma.ts: `next build` statically imports every route module
// before BETTER_AUTH_SECRET exists in that environment.
function getAuth(): Auth {
  if (!cached) cached = buildAuth();
  return cached;
}

export const auth = new Proxy({} as Auth, {
  get(_target, prop) {
    const instance = getAuth();
    const value = Reflect.get(instance as object, prop);
    return typeof value === "function" ? value.bind(instance) : value;
  },
  // better-auth/next-js's toNextJsHandler does `"handler" in auth` to tell
  // a real Auth instance apart from a plain request handler function.
  // Without this trap, `in` falls through to the empty placeholder target
  // (always false), so it always took the "auth is a plain function"
  // branch and crashed every request to /api/auth/* with "is not a
  // function" — this exact bug happened in EduTrack; don't repeat it.
  has(_target, prop) {
    return prop in getAuth();
  },
});
