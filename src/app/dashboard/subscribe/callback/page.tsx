import Link from "next/link";
import { requireUser } from "@/lib/session";
import prisma from "@/lib/prisma";
import { SUBSCRIPTION_DURATION_DAYS, verifyTransaction } from "@/lib/paystack";

export const instant = false;

export default async function SubscribeCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string }>;
}) {
  const session = await requireUser();
  const { reference } = await searchParams;

  let success = false;
  let message = "We couldn't confirm that payment.";

  if (reference) {
    try {
      const result = await verifyTransaction(reference);
      if (result.status === "success") {
        // Defensive write alongside the webhook (src/app/api/paystack/webhook):
        // idempotent on paystackReference, so whichever path lands first wins
        // and the other just no-ops — this just means the learner doesn't have
        // to wait on webhook delivery to see a correct confirmation here.
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + SUBSCRIPTION_DURATION_DAYS);
        await prisma.subscription.upsert({
          where: { paystackReference: reference },
          create: {
            userId: session.user.id,
            paystackReference: reference,
            amountKobo: result.amount,
            expiresAt,
            status: "active",
          },
          update: {},
        });
        success = true;
      } else {
        message = `Payment ${result.status}. If you were charged, contact us at info@modecodersclub.com.ng.`;
      }
    } catch {
      message = "We couldn't verify that payment right now. If you were charged, contact us at info@modecodersclub.com.ng.";
    }
  }

  return (
    <main className="section catalog-section">
      <div className="container" style={{ maxWidth: 520 }}>
        {success ? (
          <>
            <h1 style={{ fontSize: "clamp(26px, 4vw, 36px)" }}>You&rsquo;re subscribed!</h1>
            <p className="lesson-content">
              Your Premium subscription is active. Let us know which course you&rsquo;d like to start and
              we&rsquo;ll get you enrolled.
            </p>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: "clamp(26px, 4vw, 36px)" }}>Payment not confirmed</h1>
            <p className="lesson-content">{message}</p>
          </>
        )}
        <Link className="button button-primary" href="/dashboard">
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
