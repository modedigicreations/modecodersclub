// Enterprise SSO: a signed-in Modebills student clicks through from their
// school portal and lands here already signed in, no password involved.
// Modebills signs the HMAC JWT (src/server/jwt.helpers.ts's createHmacJwt)
// after confirming the student's school has an active plan with
// hasCodersClubAccess; this endpoint only has to verify that signature and
// establish a session — the access decision already happened on their side.
//
// Implemented as a custom Better Auth endpoint (not a plain Next.js route)
// because establishing a session requires Better Auth's own internal
// adapter and cookie-signing — there's no public API for "just log this
// user in" otherwise. The existing catch-all at
// src/app/api/auth/[...all]/route.ts already serves it at /api/auth/sso,
// no new route file needed.
import { safeNext } from "@/lib/safe-next";
import type { BetterAuthPlugin } from "better-auth";
import { createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import * as z from "zod";

interface EnterpriseSsoPayload {
  email: string;
  name: string;
  isEnterprise: true;
  exp: number;
  schoolName?: string;
}

/** Where a school launch may land: the dashboard or the tutor (never another site). */
export function safeSsoDestination(next: unknown): string {
  return safeNext(next, "/dashboard");
}

function base64UrlToBytes(input: string): Uint8Array<ArrayBuffer> {
  const padLength = (4 - (input.length % 4)) % 4;
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(padLength);
  const binary = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Mirrors Modebills' createHmacJwt (src/server/jwt.helpers.ts) exactly, just
// verifying instead of signing — same HS256-over-base64url construction.
async function verifyEnterpriseSsoToken(
  token: string,
  secret: string,
): Promise<EnterpriseSsoPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 3 || token.length > 4096) return null;
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  try {
    const header = JSON.parse(new TextDecoder().decode(base64UrlToBytes(encodedHeader)));
    if (header?.alg !== "HS256") return null;
  } catch {
    return null;
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );

  const isValid = await crypto.subtle.verify(
    "HMAC",
    key,
    base64UrlToBytes(encodedSignature),
    encoder.encode(`${encodedHeader}.${encodedPayload}`),
  );
  if (!isValid) return null;

  let payload: EnterpriseSsoPayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(encodedPayload)));
  } catch {
    return null;
  }

  if (typeof payload.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email.trim())) return null;
  if (payload.isEnterprise !== true) return null;
  if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;

  return payload;
}

export function enterpriseSsoPlugin(): BetterAuthPlugin {
  return {
    id: "enterprise-sso",
    endpoints: {
      enterpriseSso: createAuthEndpoint(
        "/sso",
        {
          method: "GET",
          query: z.object({ token: z.string(), next: z.string().max(200).optional() }),
        },
        async (ctx) => {
          // A dedicated secret shared only with Modebills. Falling back to
          // BETTER_AUTH_SECRET keeps existing deployments working, but means
          // Modebills holds this app's session secret: set
          // CODERSCLUB_INTER_SERVICE_SECRET (32+ characters) on both sides.
          const dedicated = process.env.CODERSCLUB_INTER_SERVICE_SECRET;
          const secret = dedicated && dedicated.length >= 32 ? dedicated : process.env.BETTER_AUTH_SECRET;
          if (!dedicated) {
            console.warn("[sso] CODERSCLUB_INTER_SERVICE_SECRET is not set; verifying SSO tokens with BETTER_AUTH_SECRET.");
          }
          if (!secret || secret.length < 32) {
            throw ctx.redirect("/login?error=sso_not_configured");
          }

          const payload = await verifyEnterpriseSsoToken(ctx.query.token, secret);
          if (!payload) {
            throw ctx.redirect("/login?error=invalid_sso_token");
          }

          // Single use: the token travels in a URL (browser history, logs), so
          // a copy must not be able to sign in again before it expires.
          const signature = ctx.query.token.split(".")[2]!;
          const replayKey = `enterprise-sso:${signature}`;
          if (await ctx.context.internalAdapter.findVerificationValue(replayKey)) {
            throw ctx.redirect("/login?error=invalid_sso_token");
          }
          await ctx.context.internalAdapter.createVerificationValue({
            identifier: replayKey,
            value: "used",
            expiresAt: new Date(payload.exp * 1000),
          });

          const email = payload.email.trim().toLowerCase();
          const schoolName =
            typeof payload.schoolName === "string" && payload.schoolName.trim() ? payload.schoolName.trim().slice(0, 160) : null;
          const existing = await ctx.context.internalAdapter.findUserByEmail(email);
          let user = existing?.user;

          // SSO only ever signs in learners: never let a school-portal token
          // open an admin or instructor account that shares the email.
          const existingRole = (user as { role?: string } | undefined)?.role;
          if (user && existingRole && existingRole !== "learner") {
            throw ctx.redirect("/login?error=sso_not_allowed_for_staff");
          }

          if (!user) {
            user = await ctx.context.internalAdapter.createUser(
              {
                email,
                name: (typeof payload.name === "string" && payload.name.trim().slice(0, 100)) || email,
                role: "learner",
                emailVerified: true,
                isEnterpriseSso: true,
                schoolName: schoolName ?? null,
              },
              { method: "enterprise-sso" },
            );
          } else if (
            !(user as { isEnterpriseSso?: boolean }).isEnterpriseSso ||
            (schoolName && (user as { schoolName?: string | null }).schoolName !== schoolName)
          ) {
            // Their school may have only just enabled Coders Club access after
            // this student already had an individual account (or they moved school).
            user = await ctx.context.internalAdapter.updateUser(user.id, {
              isEnterpriseSso: true,
              ...(schoolName ? { schoolName } : {}),
            });
          }

          const session = await ctx.context.internalAdapter.createSession(user.id);
          await setSessionCookie(ctx, { session, user });

          throw ctx.redirect(safeSsoDestination(ctx.query.next));
        },
      ),
    },
  };
}
