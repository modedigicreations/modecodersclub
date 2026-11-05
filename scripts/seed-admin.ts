import { auth } from "../src/lib/auth";
import prisma from "../src/lib/prisma";

async function main() {
  const name = process.env.MODECODERSCLUB_ADMIN_NAME?.trim();
  const email = process.env.MODECODERSCLUB_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.MODECODERSCLUB_ADMIN_PASSWORD;

  if (!name || !email || !password) {
    throw new Error(
      "Set MODECODERSCLUB_ADMIN_NAME, MODECODERSCLUB_ADMIN_EMAIL, and MODECODERSCLUB_ADMIN_PASSWORD before bootstrapping.",
    );
  }
  if (password.length < 12 || password.length > 128) {
    throw new Error("The administrator password must be between 12 and 128 characters.");
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new Error(
      `An account already exists for ${email}. Bootstrap will not promote an existing account.`,
    );
  }

  const result = await auth.api.signUpEmail({
    body: { name, email, password },
  });

  // signUpEmail and the role promotion are two independent calls with no
  // shared transaction. If the promotion fails, roll the account creation
  // back too — otherwise a plain "learner" account is left sitting at the
  // admin email, and re-running this script refuses to touch it (the
  // existing-user guard above), requiring manual DB cleanup to recover.
  try {
    await prisma.user.update({
      where: { id: result.user.id },
      data: { role: "admin" },
    });
  } catch (error) {
    await prisma.user.delete({ where: { id: result.user.id } }).catch(() => {});
    throw new Error(
      `Account created but could not be promoted to admin, so it was rolled back. Re-run this script. Cause: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  console.info(`Created the Mode Coders Club administrator account for ${email}.`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Admin bootstrap failed.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
