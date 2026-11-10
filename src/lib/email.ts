// Plain SMTP via nodemailer — same pattern as Modebills' src/lib/email.ts.
// StackMail (smtp.modecodersclub.com.ng) in production; a missing
// SMTP_HOST/USER/PASS just means email sending is unconfigured (local dev),
// not a reason to crash the whole app.
import nodemailer from "nodemailer";

const port = Number(process.env.SMTP_PORT) || 587;
const isSecure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : false;

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port,
  secure: isSecure,
  auth: process.env.SMTP_USER
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    : undefined,
  connectionTimeout: 10_000,
  greetingTimeout: 5_000,
});

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  if (!process.env.SMTP_HOST) {
    console.warn(`SMTP_HOST is not set — skipping email to ${to}: ${subject}`);
    return;
  }
  const from = process.env.SMTP_FROM || '"Mode Coders Club" <noreply@modecodersclub.com.ng>';
  await transporter.sendMail({ from, to, subject, html, text });
}
