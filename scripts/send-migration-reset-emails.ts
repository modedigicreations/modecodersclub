// Sends a real password-reset email to every migrated WordPress learner
// (any "learner" with no credential Account row yet, i.e. never set a
// password here). Run after migrate-wordpress.ts.
//
// Deliberately bypasses auth.api.requestPasswordReset: Better Auth's own
// endpoint (api/routes/password.ts) calls sendResetPassword through
// ctx.context.runInBackgroundOrAwait, which wraps it in a try/catch that
// only logs failures and never rethrows (see
// node_modules/better-auth/dist/context/create-context.mjs) — so a real
// SMTP failure (confirmed live: StackMail's daily send-limit rejection)
// never reaches the caller, and every call reports success regardless of
// whether the email actually sent. This script instead creates the same
// Verification row Better Auth's own /reset-password/:token endpoint reads
// (so the real email link still works), then calls sendEmail() directly so
// a genuine delivery failure actually throws here.
//
// Resumable: progress is persisted to migration-data/reset-email-log.json
// (gitignored, same as the rest of the migration data) so a re-run — e.g.
// after StackMail's daily limit resets — only retries recipients who
// haven't actually received an email yet.
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { sendEmail } from "../src/lib/email";
import prisma from "../src/lib/prisma";

const DELAY_BETWEEN_SENDS_MS = 1500;
const RESET_TOKEN_TTL_SECONDS = 3600; // matches Better Auth's default resetPasswordTokenExpiresIn
const LOG_PATH = path.join(__dirname, "migration-data", "reset-email-log.json");

type SendLog = Record<string, "sent" | "failed">;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readLog(): SendLog {
  try {
    return JSON.parse(fs.readFileSync(LOG_PATH, "utf8")) as SendLog;
  } catch {
    return {};
  }
}

function writeLog(log: SendLog) {
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
  fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2));
}

function looksLikeDailyLimit(message: string) {
  return /daily limit|try again later|550/i.test(message);
}

async function sendResetEmail(user: { id: string; email: string; name: string }) {
  const baseURL = process.env.BETTER_AUTH_URL;
  if (!baseURL) throw new Error("BETTER_AUTH_URL is not set");

  const token = crypto.randomBytes(24).toString("hex");
  await prisma.verification.create({
    data: {
      id: crypto.randomUUID(),
      identifier: `reset-password:${token}`,
      value: user.id,
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_SECONDS * 1000),
    },
  });

  const callbackURL = encodeURIComponent("/reset-password");
  const url = `${baseURL}/reset-password/${token}?callbackURL=${callbackURL}`;

  await sendEmail({
    to: user.email,
    subject: "Set your Mode Coders Club password",
    text: `Hi ${user.name},\n\nSet your password here: ${url}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.`,
    html: `
      <p>Hi ${user.name},</p>
      <p>Click below to set your password for Mode Coders Club:</p>
      <p><a href="${url}">Set your password</a></p>
      <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>
    `,
  });
}

async function main() {
  const log = readLog();

  const learners = await prisma.user.findMany({
    where: { role: "learner" },
    include: { accounts: { where: { providerId: "credential" } } },
  });

  const recipients = learners.filter(
    (user) => user.accounts.length === 0 && log[user.email] !== "sent",
  );

  const alreadySent = Object.values(log).filter((status) => status === "sent").length;
  console.log(
    `${alreadySent} already sent in a previous run. Sending to ${recipients.length} remaining learners...`,
  );

  let sent = 0;
  let failed = 0;

  for (const user of recipients) {
    try {
      await sendResetEmail(user);
      sent++;
      log[user.email] = "sent";
      writeLog(log);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failed++;
      log[user.email] = "failed";
      writeLog(log);
      console.error(`Failed for ${user.email}: ${message}`);

      if (looksLikeDailyLimit(message)) {
        console.error(
          "This looks like a daily sending-limit rejection — stopping here instead of burning through the rest of the batch. Re-run this script once the limit resets; already-sent recipients will be skipped.",
        );
        break;
      }
    }
    await sleep(DELAY_BETWEEN_SENDS_MS);
  }

  console.log(`Done. Sent: ${sent}, Failed: ${failed}. Total sent across all runs: ${alreadySent + sent}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
