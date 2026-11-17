import prisma from "@/lib/prisma";
import { QUIZ_PASS_PERCENT } from "@/lib/course-completion";

export type LearnerProgressRow = {
  enrollmentId: string;
  userId: string;
  name: string;
  email: string;
  isSchool: boolean;
  enrolledAt: Date;
  lessonsDone: number;
  totalLessons: number;
  percent: number;
  quizzesTaken: number;
  quizzesPassed: number;
  quizzesTotal: number;
  /** Average score across the quizzes taken, as a percent (null if none taken). */
  quizAverage: number | null;
  labsStarted: number;
  labsTotal: number;
  lastActivity: Date | null;
  certificateNumber: string | null;
};

/** Per-learner progress for one course (published lessons, quizzes and labs only). */
export async function getCourseLearnerProgress(courseId: string): Promise<LearnerProgressRow[]> {
  const [lessons, enrollments, certificates] = await Promise.all([
    prisma.lesson.findMany({
      where: { courseId, isPublished: true },
      select: { id: true, assessment: { select: { id: true } }, lab: { select: { id: true } } },
    }),
    prisma.enrollment.findMany({
      where: { courseId },
      orderBy: { enrolledAt: "desc" },
      select: {
        id: true,
        enrolledAt: true,
        user: { select: { id: true, name: true, email: true, isEnterpriseSso: true } },
        lessonProgress: { select: { lessonId: true, completedAt: true } },
      },
    }),
    prisma.certificate.findMany({ where: { courseId, status: "ACTIVE" }, select: { userId: true, certificateNumber: true } }),
  ]);
  const published = new Set(lessons.map((l) => l.id));
  const assessmentIds = lessons.flatMap((l) => (l.assessment ? [l.assessment.id] : []));
  const labIds = lessons.flatMap((l) => (l.lab ? [l.lab.id] : []));
  const userIds = enrollments.map((e) => e.user.id);

  const [attempts, submissions] = await Promise.all([
    prisma.assessmentAttempt.findMany({
      where: { assessmentId: { in: assessmentIds }, userId: { in: userIds } },
      select: { userId: true, score: true, total: true, submittedAt: true },
    }),
    prisma.labSubmission.findMany({
      where: { labId: { in: labIds }, userId: { in: userIds } },
      select: { userId: true, updatedAt: true },
    }),
  ]);
  const certByUser = new Map(certificates.map((c) => [c.userId, c.certificateNumber]));

  return enrollments.map((e) => {
    const uid = e.user.id;
    const done = e.lessonProgress.filter((p) => published.has(p.lessonId));
    const mine = attempts.filter((a) => a.userId === uid && a.total > 0);
    const labs = submissions.filter((s) => s.userId === uid);
    const activity = [
      ...done.map((p) => p.completedAt),
      ...mine.map((a) => a.submittedAt),
      ...labs.map((s) => s.updatedAt),
    ];
    return {
      enrollmentId: e.id,
      userId: uid,
      name: e.user.name,
      email: e.user.email,
      isSchool: e.user.isEnterpriseSso,
      enrolledAt: e.enrolledAt,
      lessonsDone: done.length,
      totalLessons: published.size,
      percent: published.size ? Math.round((done.length / published.size) * 100) : 0,
      quizzesTaken: mine.length,
      quizzesPassed: mine.filter((a) => (a.score / a.total) * 100 >= QUIZ_PASS_PERCENT).length,
      quizzesTotal: assessmentIds.length,
      quizAverage: mine.length ? Math.round((mine.reduce((s, a) => s + a.score / a.total, 0) / mine.length) * 100) : null,
      labsStarted: labs.length,
      labsTotal: labIds.length,
      lastActivity: activity.length ? new Date(Math.max(...activity.map((d) => d.getTime()))) : null,
      certificateNumber: certByUser.get(uid) ?? null,
    };
  });
}

/** One CSV cell: quoted, and text a spreadsheet would run as a formula (=, +, -, @) is neutralised. */
export function csvCell(value: unknown): string {
  let text = value == null ? "" : value instanceof Date ? value.toISOString() : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function progressCsv(rows: LearnerProgressRow[]): string {
  const header = [
    "Name", "Email", "School access (SSO)", "Enrolled", "Lessons done", "Lessons total", "Progress %",
    "Quizzes passed", "Quizzes total", "Quiz average %", "Labs started", "Labs total", "Last activity", "Certificate",
  ];
  const lines = rows.map((r) =>
    [
      r.name, r.email, r.isSchool ? "yes" : "no", r.enrolledAt, r.lessonsDone, r.totalLessons, r.percent,
      r.quizzesPassed, r.quizzesTotal, r.quizAverage ?? "", r.labsStarted, r.labsTotal, r.lastActivity ?? "", r.certificateNumber ?? "",
    ].map(csvCell).join(","),
  );
  return [header.map(csvCell).join(","), ...lines].join("\r\n") + "\r\n";
}
