import prisma from "@/lib/prisma";
import { type CheckResult, type LabCode, gradeLab, storedChecks } from "@/lib/lab-checks";

/**
 * Saves the learner's code, grades it against the lab's checks and records
 * the first time every check passes (passedAt never goes back to null).
 * Callers check the learner may use this lab first.
 */
export async function recordLabCheck(
  labId: string,
  userId: string,
  code: LabCode,
): Promise<{ results: CheckResult[]; passed: boolean } | null> {
  const lab = await prisma.lab.findUnique({ where: { id: labId }, select: { checks: true } });
  const checks = storedChecks(lab?.checks);
  if (checks.length === 0) return null;
  const results = gradeLab(checks, code);
  const passedCount = results.filter((r) => r.passed).length;
  const passed = passedCount === results.length;
  const now = new Date();
  const graded = { ...code, checksPassed: passedCount, checksTotal: results.length, checkedAt: now };
  await prisma.labSubmission.upsert({
    where: { labId_userId: { labId, userId } },
    create: { labId, userId, ...graded, passedAt: passed ? now : null },
    update: graded,
  });
  if (passed) {
    await prisma.labSubmission.updateMany({ where: { labId, userId, passedAt: null }, data: { passedAt: now } });
  }
  return { results, passed };
}
