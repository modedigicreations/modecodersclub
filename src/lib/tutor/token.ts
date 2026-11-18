import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import type { PlacementState } from "./mastery";

// Each question the browser gets carries a signed token naming the skill and
// seed. The server rebuilds the question from it to mark the answer, so the
// answer never reaches the browser and a token can't be edited or reused by
// another learner.

const TOKEN_TTL_MS = 3 * 60 * 60 * 1000;

export type ItemClaims = {
  /** learner */
  u: string;
  /** skill id */
  s: string;
  /** seed */
  n: number;
  /** issued at (ms) */
  t: number;
  /** practice or placement (with the placement state to continue from) */
  m: "practice" | "placement";
  p?: PlacementState;
  /** track, for placement */
  k?: string;
};

function secret(): string {
  const s = process.env.TUTOR_TOKEN_SECRET || process.env.BETTER_AUTH_SECRET;
  if (!s || s.length < 16) throw new Error("BETTER_AUTH_SECRET is not set");
  return s;
}

function sign(body: string): string {
  return createHmac("sha256", secret()).update(`tutor:${body}`).digest("base64url");
}

export function newSeed(): number {
  return randomInt(0, 2 ** 31);
}

export function issueItemToken(claims: Omit<ItemClaims, "t">, now = Date.now()): string {
  const body = Buffer.from(JSON.stringify({ ...claims, t: now })).toString("base64url");
  return `${body}.${sign(body)}`;
}

/** The claims if the token is genuine, unexpired and belongs to this learner. */
export function readItemToken(token: unknown, userId: string, now = Date.now()): ItemClaims | null {
  if (typeof token !== "string" || token.length > 4000) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = Buffer.from(sign(body));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const claims = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as ItemClaims;
    if (claims.u !== userId) return null;
    if (typeof claims.t !== "number" || now - claims.t > TOKEN_TTL_MS || claims.t > now + 60_000) return null;
    return claims;
  } catch {
    return null;
  }
}

/** Unguessable token for a parent's read-only progress link. */
export function newParentToken(): string {
  return randomBytes(24).toString("hex");
}
