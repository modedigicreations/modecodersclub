import prisma from "@/lib/prisma";
import { SUBSCRIPTION_AMOUNT_KOBO, SUBSCRIPTION_DURATION_DAYS } from "@/lib/paystack";

export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const row = await prisma.subscription.findFirst({
    where: { userId, status: "active", expiresAt: { gt: new Date() } },
    select: { id: true },
  });
  return row !== null;
}

/** Every checkout this app starts uses this prefix (see dashboard/actions.ts subscribe()). */
export const SUBSCRIPTION_REFERENCE_PREFIX = "mcc-sub-";

export type PaidTransaction = {
  reference: string;
  amountKobo: number;
  currency: string;
  /** metadata.userId Paystack echoes back from initializeTransaction. */
  metadataUserId: string | undefined;
};

/**
 * Why a successful Paystack charge must NOT become a subscription, or null if it's fine.
 * The Paystack account can be shared with other Mode apps, so only charges this
 * app started (reference prefix + metadata user), for the full price in naira, count.
 */
export function subscriptionPaymentProblem(tx: PaidTransaction, expectedUserId?: string): string | null {
  if (!tx.reference.startsWith(SUBSCRIPTION_REFERENCE_PREFIX)) return "not a Mode Coders Club subscription payment";
  if (!tx.metadataUserId) return "payment has no learner attached";
  if (expectedUserId && tx.metadataUserId !== expectedUserId) return "payment belongs to a different account";
  if (tx.currency.toUpperCase() !== "NGN") return "payment was not in naira";
  if (!(tx.amountKobo >= SUBSCRIPTION_AMOUNT_KOBO)) return "payment amount is below the subscription price";
  return null;
}

/**
 * Records a verified subscription payment once (idempotent on the Paystack
 * reference). A renewal while still subscribed starts when the current
 * period ends, so paying early never loses the remaining time.
 */
export async function grantSubscription(userId: string, tx: PaidTransaction) {
  const existing = await prisma.subscription.findUnique({ where: { paystackReference: tx.reference } });
  if (existing) return { created: false, subscription: existing };

  const latest = await prisma.subscription.findFirst({
    where: { userId, status: "active", expiresAt: { gt: new Date() } },
    orderBy: { expiresAt: "desc" },
    select: { expiresAt: true },
  });
  const startsAt = latest?.expiresAt ?? new Date();
  const expiresAt = new Date(startsAt);
  expiresAt.setDate(expiresAt.getDate() + SUBSCRIPTION_DURATION_DAYS);

  try {
    const subscription = await prisma.subscription.create({
      data: { userId, paystackReference: tx.reference, amountKobo: tx.amountKobo, expiresAt, status: "active" },
    });
    return { created: true, subscription };
  } catch (error) {
    // The webhook and the browser callback can land at the same moment.
    if ((error as { code?: string })?.code === "P2002") {
      const row = await prisma.subscription.findUniqueOrThrow({ where: { paystackReference: tx.reference } });
      return { created: false, subscription: row };
    }
    throw error;
  }
}
