// Unlike seed-admin.ts (meant to be run once, explicitly, and to fail
// loudly on misconfiguration), this variant is safe to run on every boot —
// wired into "start" so the admin account gets created on first deploy
// without needing a one-off shell into the production network. It no-ops
// (not an error) whenever there's nothing to do.
import { auth } from "../src/lib/auth";
import prisma from "../src/lib/prisma";

async function main() {
  const name = process.env.MODECODERSCLUB_ADMIN_NAME?.trim();
  const email = process.env.MODECODERSCLUB_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.MODECODERSCLUB_ADMIN_PASSWORD;

  if (!name || !email || !password) {
    console.info("Admin bootstrap env vars not set — skipping.");
    return;
  }
  if (password.length < 12 || password.length > 128) {
    console.warn("MODECODERSCLUB_ADMIN_PASSWORD must be 12-128 characters — skipping admin bootstrap.");
    return;
  }

  const existingAdmin = await prisma.user.findFirst({ where: { role: "admin" } });
  if (existingAdmin) {
    console.info("An admin account already exists — skipping bootstrap.");
    return;
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    console.warn(`An account already exists for ${email} but is not an admin — skipping bootstrap.`);
    return;
  }

  const result = await auth.api.signUpEmail({ body: { name, email, password } });
  try {
    await prisma.user.update({ where: { id: result.user.id }, data: { role: "admin" } });
    console.info(`Created the Mode Coders Club administrator account for ${email}.`);
  } catch (error) {
    await prisma.user.delete({ where: { id: result.user.id } }).catch(() => {});
    console.error(
      `Account created but could not be promoted to admin, so it was rolled back: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

main()
  .catch((error: unknown) => {
    // Never fail the boot over this — log and move on.
    console.error("Admin bootstrap check failed:", error instanceof Error ? error.message : error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
