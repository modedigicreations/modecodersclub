import { randomBytes } from "node:crypto";
import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

/** Score needed on every published lesson quiz to complete a course (percent). */
export const QUIZ_PASS_PERCENT = Number(process.env.CERTIFICATE_QUIZ_PASS_PERCENT || 70);

export type CourseProgress = {
  totalLessons: number;
  completedLessons: number;
  quizzesTotal: number;
  quizzesPassed: number;
  /** Every published lesson done and every published quiz passed (and there is at least one lesson). */
  complete: boolean;
  percent: number;
};

/** Pure: progress from the course's published lessons and the learner's records. */
export function computeProgress(input: {
  publishedLessonIds: string[];
  quizLessonIds: string[];
  completedLessonIds: Iterable<string>;
  quizScores: Map<string, { score: number; total: number }>;
  passPercent?: number;
}): CourseProgress {
  const pass = input.passPercent ?? QUIZ_PASS_PERCENT;
  const published = new Set(input.publishedLessonIds);
  const done = new Set([...input.completedLessonIds].filter((id) => published.has(id)));
  const quizLessons = input.quizLessonIds.filter((id) => published.has(id));
  const quizzesPassed = quizLessons.filter((id) => {
    const s = input.quizScores.get(id);
    return s !== undefined && s.total > 0 && (s.score / s.total) * 100 >= pass;
  }).length;
  const totalLessons = published.size;
  return {
    totalLessons,
    completedLessons: done.size,
    quizzesTotal: quizLessons.length,
    quizzesPassed,
    complete: totalLessons > 0 && done.size === totalLessons && quizzesPassed === quizLessons.length,
    percent: totalLessons === 0 ? 0 : Math.round((done.size / totalLessons) * 100),
  };
}

export async function getCourseProgress(userId: string, courseId: string): Promise<CourseProgress | null> {
  const enrollment = await prisma.enrollment.findUnique({
    where: { courseId_userId: { courseId, userId } },
    select: { id: true, lessonProgress: { select: { lessonId: true } } },
  });
  if (!enrollment) return null;
  const lessons = await prisma.lesson.findMany({
    where: { courseId, isPublished: true },
    select: { id: true, assessment: { select: { attempts: { where: { userId }, select: { score: true, total: true } } } } },
  });
  const quizScores = new Map<string, { score: number; total: number }>();
  for (const l of lessons) {
    const attempt = l.assessment?.attempts[0];
    if (attempt) quizScores.set(l.id, attempt);
  }
  return computeProgress({
    publishedLessonIds: lessons.map((l) => l.id),
    quizLessonIds: lessons.filter((l) => l.assessment).map((l) => l.id),
    completedLessonIds: enrollment.lessonProgress.map((p) => p.lessonId),
    quizScores,
  });
}

/** The learner's current (non-revoked) certificate for a course, if any. */
export function findCourseCertificate(userId: string, courseId: string) {
  return prisma.certificate.findFirst({
    where: { userId, courseId, status: "ACTIVE" },
    orderBy: { issuedAt: "desc" },
  });
}

/**
 * Issues the course certificate automatically once the learner has finished the
 * course. Idempotent (one certificate per learner per course, safe under
 * concurrent calls); never re-issues one an admin revoked. Returns the
 * certificate when one was created by this call.
 */
export async function issueCertificateIfComplete(userId: string, courseId: string) {
  const progress = await getCourseProgress(userId, courseId);
  if (!progress?.complete) return null;
  if (!process.env.CERTIFICATE_SIGNING_SECRET || process.env.CERTIFICATE_SIGNING_SECRET.length < 32) {
    console.warn("[certificates] CERTIFICATE_SIGNING_SECRET is not set; automatic certificate skipped.");
    return null;
  }

  const created = await prisma.$transaction(async (tx) => {
    // Serialise per learner+course so two completions at once can't both issue.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`certificate:${userId}:${courseId}`}))`;
    const existing = await tx.certificate.findFirst({ where: { userId, courseId }, select: { id: true } });
    if (existing) return null; // already issued (or revoked by an admin: don't re-issue)
    const [user, course] = await Promise.all([
      tx.user.findUnique({ where: { id: userId }, select: { name: true } }),
      tx.course.findUnique({ where: { id: courseId }, select: { name: true } }),
    ]);
    if (!user || !course) return null;
    return tx.certificate.create({
      data: {
        certificateNumber: `MCC-${new Date().getUTCFullYear()}-${randomBytes(6).toString("hex").toUpperCase()}`,
        recipientName: user.name.slice(0, 120),
        courseName: course.name.slice(0, 120),
        userId,
        courseId,
      },
    });
  });

  if (created) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
    const base = process.env.BETTER_AUTH_URL;
    if (user && base) {
      const link = new URL(`/dashboard/courses/${courseId}`, base).toString();
      await sendEmail({
        to: user.email,
        subject: `Your certificate for ${created.courseName}`,
        text: `Congratulations ${user.name}!\n\nYou've completed ${created.courseName} at Mode Coders Club. Your certificate (number ${created.certificateNumber}) is ready to download: ${link}\n\nKeep coding!`,
        html: `<p>Congratulations ${escapeHtml(user.name)}!</p><p>You've completed <strong>${escapeHtml(created.courseName)}</strong> at Mode Coders Club. Your certificate (number ${created.certificateNumber}) is ready to download:</p><p><a href="${escapeHtml(link)}">Download your certificate</a></p><p>Keep coding!</p>`,
      }).catch((err) => console.error("[certificates] email failed:", err instanceof Error ? err.message : err));
    }
  }
  return created;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
