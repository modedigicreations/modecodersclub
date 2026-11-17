import prisma from "@/lib/prisma";
import { hasActiveSubscription } from "@/lib/subscriptions";

export type EnrolmentCheck =
  | { ok: true }
  | { ok: false; reason: "not_found" | "not_open" | "admin" | "needs_subscription"; message: string };

/**
 * One set of rules for every way into a course (self-service from the course
 * page, or an instructor/admin enrolling someone): the course must be live
 * (not a draft or archived), admins aren't enrolled as students, and a paid
 * course needs an active subscription or school (Enterprise SSO) access.
 */
export async function checkEnrolment(userId: string, courseId: string): Promise<EnrolmentCheck> {
  const [user, course] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, role: true, isEnterpriseSso: true } }),
    prisma.course.findUnique({ where: { id: courseId }, select: { isFree: true, isDraft: true, archivedAt: true } }),
  ]);
  if (!user || !course) return { ok: false, reason: "not_found", message: "Course or account not found." };
  if (course.isDraft || course.archivedAt) {
    return { ok: false, reason: "not_open", message: "This course isn't open for enrolment." };
  }
  if (user.role === "admin") return { ok: false, reason: "admin", message: "Admin accounts can't be enrolled as a student." };
  if (!course.isFree && !user.isEnterpriseSso && !(await hasActiveSubscription(userId))) {
    return {
      ok: false,
      reason: "needs_subscription",
      message: `${user.name} doesn't have an active subscription yet — this course requires one.`,
    };
  }
  return { ok: true };
}

/** Creates the enrolment if allowed; returns the enrolment id (existing one if already enrolled). */
export async function enrol(userId: string, courseId: string, enrolledById: string) {
  const existing = await prisma.enrollment.findUnique({
    where: { courseId_userId: { courseId, userId } },
    select: { id: true },
  });
  if (existing) return { ok: true as const, enrollmentId: existing.id, created: false };
  const check = await checkEnrolment(userId, courseId);
  if (!check.ok) return check;
  try {
    const row = await prisma.enrollment.create({ data: { courseId, userId, enrolledById }, select: { id: true } });
    return { ok: true as const, enrollmentId: row.id, created: true };
  } catch (error) {
    if ((error as { code?: string })?.code === "P2002") {
      const row = await prisma.enrollment.findUniqueOrThrow({ where: { courseId_userId: { courseId, userId } }, select: { id: true } });
      return { ok: true as const, enrollmentId: row.id, created: false };
    }
    throw error;
  }
}
