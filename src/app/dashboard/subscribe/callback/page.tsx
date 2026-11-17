import Link from "next/link";
import { requireUser } from "@/lib/session";
import { verifyTransaction } from "@/lib/paystack";
import { grantSubscription, subscriptionPaymentProblem } from "@/lib/subscriptions";

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
        // Defensive write alongside the webhook (idempotent on the reference).
        // Only this learner's own subscription checkout counts: never another
        // person's payment, or another Mode app's charge on the same Paystack account.
        const tx = {
          reference: result.reference,
          amountKobo: result.amount,
          currency: result.currency,
          metadataUserId: result.metadata?.userId ? String(result.metadata.userId) : undefined,
        };
        const problem = subscriptionPaymentProblem(tx, session.user.id);
        if (problem) {
          message = `We couldn't use that payment for your subscription (${problem}). If you were charged, contact us at info@modecodersclub.com.ng.`;
        } else {
          await grantSubscription(session.user.id, tx);
          success = true;
        }
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
              Your Premium subscription is active. Pick a course from the catalogue and press Enrol to start.
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
