// Security rules for payments and embeds (throwaway DATABASE_URL: writes and deletes rows).
import "dotenv/config";
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import prisma from "@/lib/prisma";
import { SUBSCRIPTION_AMOUNT_KOBO } from "@/lib/paystack";
import { grantSubscription, hasActiveSubscription, subscriptionPaymentProblem } from "@/lib/subscriptions";
import { toEmbedUrl } from "@/lib/video-embed";

if (/railway|rlwy|amazonaws|supabase|neon\.tech/i.test(process.env.DATABASE_URL ?? "")) {
  throw new Error("DATABASE_URL looks like a hosted database; refusing to run tests that write data.");
}

const USER = "test-security-learner";
const ok = { reference: "mcc-sub-x-1", amountKobo: SUBSCRIPTION_AMOUNT_KOBO, currency: "NGN", metadataUserId: USER };

before(async () => {
  await prisma.subscription.deleteMany({ where: { userId: USER } });
  await prisma.user.upsert({ where: { id: USER }, update: {}, create: { id: USER, name: "Sec Learner", email: "sec-learner@example.com" } });
});
after(async () => {
  await prisma.subscription.deleteMany({ where: { userId: USER } });
  await prisma.user.delete({ where: { id: USER } }).catch(() => {});
  await prisma.$disconnect();
});

describe("which Paystack payments may grant a subscription", () => {
  test("only this app's checkouts, for this learner, full price, in naira", () => {
    assert.equal(subscriptionPaymentProblem(ok, USER), null);
    assert.match(subscriptionPaymentProblem({ ...ok, reference: "mm-fund-123" })!, /not a Mode Coders Club/);
    assert.match(subscriptionPaymentProblem({ ...ok, metadataUserId: "someone-else" }, USER)!, /different account/);
    assert.match(subscriptionPaymentProblem({ ...ok, metadataUserId: undefined })!, /no learner/);
    assert.match(subscriptionPaymentProblem({ ...ok, amountKobo: 100 })!, /below/);
    assert.match(subscriptionPaymentProblem({ ...ok, currency: "USD" })!, /naira/);
  });
});

describe("granting subscriptions", () => {
  test("idempotent per reference; an early renewal extends from the current end date", async () => {
    const first = await grantSubscription(USER, ok);
    assert.equal(first.created, true);
    assert.equal((await grantSubscription(USER, ok)).created, false, "same reference twice = one subscription");
    assert.equal(await hasActiveSubscription(USER), true);

    const second = await grantSubscription(USER, { ...ok, reference: "mcc-sub-x-2" });
    const days = (second.subscription.expiresAt.getTime() - first.subscription.expiresAt.getTime()) / 86_400_000;
    assert.ok(Math.abs(days - 182) < 0.01, `renewal adds a full period after the current one (got ${days} days)`);
  });

  test("the webhook and the browser callback landing together still create one row", async () => {
    const tx = { ...ok, reference: "mcc-sub-x-race" };
    await Promise.all([grantSubscription(USER, tx), grantSubscription(USER, tx), grantSubscription(USER, tx)]);
    assert.equal(await prisma.subscription.count({ where: { paystackReference: tx.reference } }), 1);
  });
});

describe("video embeds", () => {
  test("YouTube/Vimeo only, with clean IDs", () => {
    assert.equal(toEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), "https://www.youtube.com/embed/dQw4w9WgXcQ");
    assert.equal(toEmbedUrl("https://youtu.be/dQw4w9WgXcQ"), "https://www.youtube.com/embed/dQw4w9WgXcQ");
    assert.equal(toEmbedUrl("https://vimeo.com/123456789"), "https://player.vimeo.com/video/123456789");
    assert.equal(toEmbedUrl("https://www.youtube.com/watch?v=../../evil"), null);
    assert.equal(toEmbedUrl("https://youtu.be/a\"onload=alert(1)"), null);
    assert.equal(toEmbedUrl("javascript:alert(1)"), null);
    assert.equal(toEmbedUrl("https://evil.example/watch?v=dQw4w9WgXcQ"), null);
  });
});
