// Sends a real password-reset email to every migrated WordPress learner
// (any "learner" with no credential Account row yet, i.e. never set a
// password here). Run once, after migrate-wordpress.ts, via Railway's
// Console tab: npx tsx scripts/send-migration-reset-emails.ts
//
// Batched with a short delay between sends to stay well under StackMail's
// throughput — 558 emails isn't huge, but there's no reason to hammer it.
import { auth } from "../src/lib/auth";
import prisma from "../src/lib/prisma";

const DELAY_BETWEEN_SENDS_MS = 1500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const learners = await prisma.user.findMany({
    where: { role: "learner" },
    include: { accounts: { where: { providerId: "credential" } } },
  });

  const recipients = learners.filter((user) => user.accounts.length === 0);
  console.log(`Sending password-reset emails to ${recipients.length} migrated learners...`);

  let sent = 0;
  let failed = 0;

  for (const user of recipients) {
    try {
      await auth.api.requestPasswordReset({
        body: { email: user.email, redirectTo: "/reset-password" },
      });
      sent++;
    } catch (error) {
      failed++;
      console.error(`Failed for ${user.email}:`, error instanceof Error ? error.message : error);
    }
    await sleep(DELAY_BETWEEN_SENDS_MS);
  }

  console.log(`Done. Sent: ${sent}, Failed: ${failed}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
