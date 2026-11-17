import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

const DAY = 24 * 60 * 60 * 1000;
export const REMINDER_DAYS_BEFORE = 7;
/** Expired notices go out only for subscriptions that ended recently (no surprise emails about old ones). */
const EXPIRED_NOTICE_WINDOW_DAYS = 3;

function money(kobo: number) {
  return `₦${(kobo / 100).toLocaleString("en-NG")}`;
}

/**
 * Daily job (POST /api/cron/subscription-reminders):
 *  - 7 days before a learner's subscription ends: "renew soon" email.
 *  - when it has ended: "your subscription has expired" email, and the row is marked expired.
 * Each email is sent once (tracked on the row), only for the learner's latest
 * subscription, and never when they've already renewed.
 */
export async function runSubscriptionReminders(now = new Date()) {
  const result = { reminders: 0, expired: 0, errors: 0 };
  const base = process.env.BETTER_AUTH_URL;
  const billingUrl = base ? new URL("/dashboard/billing", base).toString() : "/dashboard/billing";

  // Renewals extend from the current end date, so the latest-ending row is the one that matters.
  const latestPerUser = await prisma.subscription.groupBy({
    by: ["userId"],
    _max: { expiresAt: true },
    where: { expiresAt: { gt: new Date(now.getTime() - EXPIRED_NOTICE_WINDOW_DAYS * DAY) } },
  });

  for (const row of latestPerUser) {
    const end = row._max.expiresAt;
    if (!end) continue;
    const sub = await prisma.subscription.findFirst({
      where: { userId: row.userId, expiresAt: end },
      include: { user: { select: { email: true, name: true, isEnterpriseSso: true } } },
    });
    if (!sub || sub.user.isEnterpriseSso) continue; // school-funded learners don't pay individually
    const endText = new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "Africa/Lagos" }).format(end);

    try {
      if (end > now && end.getTime() - now.getTime() <= REMINDER_DAYS_BEFORE * DAY && !sub.reminderSentAt) {
        const claimed = await prisma.subscription.updateMany({
          where: { id: sub.id, reminderSentAt: null },
          data: { reminderSentAt: now },
        });
        if (claimed.count === 1) {
          await sendEmail({
            to: sub.user.email,
            subject: "Your Mode Coders Club subscription ends soon",
            text: `Hi ${sub.user.name},\n\nYour Premium subscription ends on ${endText}. Renew now to keep access to your paid courses: ${billingUrl}\n\nRenewing early doesn't lose any time: the new period starts when the current one ends.\n\nMode Coders Club`,
            html: `<p>Hi ${esc(sub.user.name)},</p><p>Your Premium subscription ends on <strong>${esc(endText)}</strong>. Renew now to keep access to your paid courses.</p><p><a href="${esc(billingUrl)}">Renew my subscription</a></p><p>Renewing early doesn't lose any time: the new period starts when the current one ends.</p>`,
          });
          result.reminders++;
        }
      } else if (end <= now && !sub.expiredNoticeSentAt) {
        const claimed = await prisma.subscription.updateMany({
          where: { id: sub.id, expiredNoticeSentAt: null },
          data: { expiredNoticeSentAt: now, status: "expired" },
        });
        if (claimed.count === 1) {
          await sendEmail({
            to: sub.user.email,
            subject: "Your Mode Coders Club subscription has expired",
            text: `Hi ${sub.user.name},\n\nYour Premium subscription ended on ${endText}. Renew (${money(sub.amountKobo)}) to pick up where you left off: ${billingUrl}\n\nMode Coders Club`,
            html: `<p>Hi ${esc(sub.user.name)},</p><p>Your Premium subscription ended on <strong>${esc(endText)}</strong>. Renew to pick up where you left off.</p><p><a href="${esc(billingUrl)}">Renew my subscription</a></p>`,
          });
          result.expired++;
        }
      }
    } catch (error) {
      result.errors++;
      console.error(`[reminders] ${sub.id}:`, error instanceof Error ? error.message : error);
    }
  }
  return result;
}

function esc(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
