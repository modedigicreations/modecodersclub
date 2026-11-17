import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyWebhookSignature } from "@/lib/paystack";
import { grantSubscription, subscriptionPaymentProblem } from "@/lib/subscriptions";

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

  let event: {
    event?: string;
    data?: { reference?: string; amount?: number; currency?: string; status?: string; metadata?: { userId?: string } };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (event.event !== "charge.success" || event.data?.status !== "success") {
    return NextResponse.json({ received: true });
  }

  const tx = {
    reference: String(event.data.reference ?? ""),
    amountKobo: Number(event.data.amount ?? 0),
    currency: String(event.data.currency ?? ""),
    metadataUserId: event.data.metadata?.userId ? String(event.data.metadata.userId) : undefined,
  };
  // The Paystack account may be shared with other Mode apps: acknowledge
  // (200) charges that aren't ours so Paystack stops retrying them.
  const problem = subscriptionPaymentProblem(tx);
  if (problem) {
    if (tx.reference.startsWith("mcc-sub-")) console.warn(`[paystack] ignored ${tx.reference}: ${problem}`);
    return NextResponse.json({ received: true, ignored: problem });
  }

  const user = await prisma.user.findUnique({ where: { id: tx.metadataUserId! }, select: { id: true } });
  if (!user) {
    console.warn(`[paystack] ${tx.reference}: learner ${tx.metadataUserId} not found`);
    return NextResponse.json({ received: true, ignored: "unknown learner" });
  }

  await grantSubscription(user.id, tx);
  return NextResponse.json({ received: true });
}
