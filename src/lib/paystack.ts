/**
 * Thin typed wrapper around the Paystack REST API — the minimal subset
 * needed for one flow: an individual learner paying for the sitewide
 * Premium subscription. All calls are server-side only; the secret key
 * never reaches the client. Mirrors the pattern already proven at
 * Modebills' src/lib/paystack.ts.
 */
import { timingSafeEqual } from "node:crypto";

const BASE = "https://api.paystack.co";

function headers() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not set");
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

async function call<T>(
  method: "GET" | "POST",
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: headers(),
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = (await res.json()) as { status: boolean; message: string; data: T };
  if (!json.status) throw new Error(json.message ?? "Paystack error");
  return json.data;
}

export interface PaystackInitData {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export interface PaystackVerifyData {
  status: string; // "success" | "failed" | "abandoned"
  reference: string;
  amount: number; // kobo
  currency: string;
  paid_at: string | null;
  customer: { email: string };
  metadata?: { userId?: string; [key: string]: unknown };
}

/** Initialize a one-time payment for the sitewide Premium subscription. */
export async function initializeTransaction(params: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}) {
  return call<PaystackInitData>("POST", "/transaction/initialize", {
    email: params.email,
    amount: params.amountKobo,
    reference: params.reference,
    callback_url: params.callbackUrl,
    metadata: params.metadata ?? {},
    channels: ["card", "bank", "ussd", "bank_transfer"],
  });
}

/** Verify a transaction by reference. */
export async function verifyTransaction(reference: string) {
  return call<PaystackVerifyData>(
    "GET",
    `/transaction/verify/${encodeURIComponent(reference)}`,
  );
}

/**
 * Verify a Paystack webhook signature (HMAC-SHA512 of the raw request body).
 *
 * Uses timingSafeEqual rather than ===: this gates whether the server
 * records a payment as successful, so a forged "charge.success" callback is
 * exactly what this guards against, and a naive string comparison leaks
 * enough timing signal to brute-force a valid signature byte by byte
 * against an internet-reachable endpoint.
 */
export async function verifyWebhookSignature(
  rawBody: string,
  signature: string,
): Promise<boolean> {
  const secret = process.env.PAYSTACK_SECRET_KEY ?? "";
  if (!secret || !signature) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const expected = Buffer.from(hex, "hex");
  const provided = Buffer.from(signature, "hex");
  if (expected.length !== provided.length) return false;
  return timingSafeEqual(expected, provided);
}

export const SUBSCRIPTION_AMOUNT_KOBO = 500_000; // ₦5,000
export const SUBSCRIPTION_DURATION_DAYS = 182; // "every 6 months"
