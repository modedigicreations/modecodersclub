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
import type { BetterAuthPlugin } from "better-auth";
import { createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import * as z from "zod";

interface EnterpriseSsoPayload {
  email: string;
  name: string;
  isEnterprise: true;
  exp: number;
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
  if (parts.length !== 3) return null;
  const [encodedHeader, encodedPayload, encodedSignature] = parts;

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

  if (!payload.email || payload.isEnterprise !== true) return null;
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
          query: z.object({ token: z.string() }),
        },
        async (ctx) => {
          const secret =
            process.env.CODERSCLUB_INTER_SERVICE_SECRET ||
            process.env.BETTER_AUTH_SECRET ||
            "default_inter_service_secret";

          const payload = await verifyEnterpriseSsoToken(ctx.query.token, secret);
          if (!payload) {
            throw ctx.redirect("/login?error=invalid_sso_token");
          }

          const email = payload.email.trim().toLowerCase();
          const existing = await ctx.context.internalAdapter.findUserByEmail(email);
          let user = existing?.user;

          if (!user) {
            user = await ctx.context.internalAdapter.createUser(
              {
                email,
                name: payload.name?.trim() || email,
                role: "learner",
                emailVerified: true,
                isEnterpriseSso: true,
              },
              { method: "enterprise-sso" },
            );
          } else if (!(user as { isEnterpriseSso?: boolean }).isEnterpriseSso) {
            // Their school may have only just enabled Coders Club access
            // after this student already had an individual account.
            user = await ctx.context.internalAdapter.updateUser(user.id, {
              isEnterpriseSso: true,
            });
          }

          const session = await ctx.context.internalAdapter.createSession(user.id);
          await setSessionCookie(ctx, { session, user });

          throw ctx.redirect("/dashboard");
        },
      ),
    },
  };
}
