import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/session";
import prisma from "@/lib/prisma";
import { SUBSCRIPTION_AMOUNT_KOBO, SUBSCRIPTION_DURATION_DAYS } from "@/lib/paystack";
import { subscribe } from "../actions";

export const instant = false;
export const metadata: Metadata = { title: "Billing" };

const dateFmt = new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "Africa/Lagos" });
const naira = (kobo: number) => `₦${(kobo / 100).toLocaleString("en-NG")}`;

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string; error?: string }>;
}) {
  const session = await requireUser();
  const { course: courseSlug, error } = await searchParams;
  const isSchool = (session.user as { isEnterpriseSso?: boolean }).isEnterpriseSso ?? false;

  const [payments, course] = await Promise.all([
    prisma.subscription.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: "desc" } }),
    courseSlug
      ? prisma.course.findFirst({ where: { slug: courseSlug, archivedAt: null, isDraft: false }, select: { name: true } })
      : Promise.resolve(null),
  ]);
  const now = new Date();
  const activeUntil = payments.reduce<Date | null>(
    (latest, p) => (p.expiresAt > now && (!latest || p.expiresAt > latest) ? p.expiresAt : latest),
    null,
  );
  const daysLeft = activeUntil ? Math.ceil((activeUntil.getTime() - now.getTime()) / 86_400_000) : 0;

  return (
    <main className="section catalog-section">
      <div className="container" style={{ maxWidth: 760 }}>
        <p style={{ marginBottom: 12 }}>
          <Link className="text-link text-link-back" href="/dashboard">
            <span aria-hidden="true">←</span> Dashboard
          </Link>
        </p>
        <h1 style={{ fontSize: "clamp(28px, 4vw, 40px)", marginBottom: 12 }}>Billing</h1>
        {error && <p className="auth-error">{error}</p>}
        {course && !activeUntil && !isSchool && (
          <p className="auth-error" style={{ color: "var(--ink)" }}>
            {course.name} needs a Premium subscription. Subscribe below, then press Enrol on the course page.
          </p>
        )}

        <div className="admin-form" style={{ maxWidth: 760 }}>
          {isSchool ? (
            <p className="lesson-content" style={{ marginBottom: 0 }}>
              Your school gives you access to Mode Coders Club, so you don&rsquo;t need a personal subscription.
            </p>
          ) : activeUntil ? (
            <>
              <h2 style={{ fontSize: 18 }}>Premium is active until {dateFmt.format(activeUntil)}</h2>
              <p className="lesson-content" style={{ marginBottom: 0 }}>
                {daysLeft} day{daysLeft === 1 ? "" : "s"} left. Renewing now adds {SUBSCRIPTION_DURATION_DAYS} days after
                your current period ends, so you don&rsquo;t lose any time. We&rsquo;ll email you a week before it ends.
              </p>
              <form action={subscribe}>
                <button className="button button-primary" type="submit">
                  Renew: {naira(SUBSCRIPTION_AMOUNT_KOBO)} for {SUBSCRIPTION_DURATION_DAYS} more days
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 style={{ fontSize: 18 }}>You don&rsquo;t have an active subscription</h2>
              <p className="lesson-content" style={{ marginBottom: 0 }}>
                Premium unlocks every paid course for {SUBSCRIPTION_DURATION_DAYS} days ({naira(SUBSCRIPTION_AMOUNT_KOBO)}).
                Payment is by card, bank transfer or USSD through Paystack.
              </p>
              <form action={subscribe}>
                <button className="button button-primary" type="submit">
                  Subscribe: {naira(SUBSCRIPTION_AMOUNT_KOBO)}
                </button>
              </form>
            </>
          )}
        </div>

        <h2 style={{ fontSize: 16, margin: "28px 0 12px" }}>Payment history</h2>
        {payments.length === 0 ? (
          <p className="admin-empty">No payments yet.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Paid</th>
                <th>Amount</th>
                <th>Covers until</th>
                <th>Reference</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>{dateFmt.format(p.createdAt)}</td>
                  <td>{naira(p.amountKobo)}</td>
                  <td>
                    {dateFmt.format(p.expiresAt)}
                    {p.expiresAt <= now ? " (ended)" : ""}
                  </td>
                  <td style={{ fontSize: 11, wordBreak: "break-all" }}>{p.paystackReference}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
