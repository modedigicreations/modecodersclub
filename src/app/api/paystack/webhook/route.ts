import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { SUBSCRIPTION_DURATION_DAYS, verifyWebhookSignature } from "@/lib/paystack";

// Paystack's recommended pattern: the webhook is the authoritative write
// path (the browser callback at /dashboard/subscribe/callback is only a
// nicer immediate confirmation — if the learner closes their browser before
// the redirect completes, this is what still grants access).
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature") ?? "";

  const valid = await verifyWebhookSignature(rawBody, signature);
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  const event = JSON.parse(rawBody) as {
    event: string;
    data: {
      reference: string;
      amount: number;
      status: string;
      metadata?: { userId?: string };
    };
  };

  if (event.event !== "charge.success" || event.data.status !== "success") {
    return NextResponse.json({ received: true });
  }

  const userId = event.data.metadata?.userId;
  if (!userId) {
    return NextResponse.json({ error: "Missing userId in metadata." }, { status: 400 });
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SUBSCRIPTION_DURATION_DAYS);

  // Idempotent: Paystack may redeliver the same webhook. paystackReference
  // is unique, so a retry just no-ops instead of creating a duplicate.
  await prisma.subscription.upsert({
    where: { paystackReference: event.data.reference },
    create: {
      userId,
      paystackReference: event.data.reference,
      amountKobo: event.data.amount,
      expiresAt,
      status: "active",
    },
    update: {},
  });

  return NextResponse.json({ received: true });
}
