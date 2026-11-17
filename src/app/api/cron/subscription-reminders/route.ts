import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { runSubscriptionReminders } from "@/lib/subscription-reminders";

/**
 * Run once a day (e.g. a Railway cron service:
 *   curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://<app>/api/cron/subscription-reminders).
 * CRON_SECRET must be set (16+ characters); without it the endpoint is off.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  if (secret.length < 16) {
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 503 });
  }
  const supplied = Buffer.from(request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "");
  const expected = Buffer.from(secret);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const result = await runSubscriptionReminders();
  return NextResponse.json({ ok: true, ...result });
}
