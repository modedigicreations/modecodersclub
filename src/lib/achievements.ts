import prisma from "@/lib/prisma";
import { QUIZ_PASS_PERCENT } from "@/lib/course-completion";

/** Days are counted in this time zone, so a streak doesn't break at UTC midnight. */
export const LEARNING_TIMEZONE = process.env.LEARNING_TIMEZONE || "Africa/Lagos";

export type BadgeKey =
  | "first-lesson"
  | "ten-lessons"
  | "quiz-pass"
  | "quiz-ace"
  | "lab-pass"
  | "course-complete"
  | "streak-3"
  | "streak-7"
  | "streak-30";

export type BadgeStats = {
  lessonsDone: number;
  quizzesPassed: number;
  perfectQuizzes: number;
  labsPassed: number;
  certificates: number;
  longestStreak: number;
};

export const BADGES: { key: BadgeKey; icon: string; name: string; description: string; earned: (s: BadgeStats) => boolean }[] = [
  { key: "first-lesson", icon: "🚀", name: "Lift-off", description: "Finish your first lesson", earned: (s) => s.lessonsDone >= 1 },
  { key: "ten-lessons", icon: "📚", name: "Bookworm", description: "Finish 10 lessons", earned: (s) => s.lessonsDone >= 10 },
  { key: "quiz-pass", icon: "✅", name: "Quiz whizz", description: `Pass a quiz (${QUIZ_PASS_PERCENT}%+)`, earned: (s) => s.quizzesPassed >= 1 },
  { key: "quiz-ace", icon: "💯", name: "Perfect score", description: "Get every answer right in a quiz", earned: (s) => s.perfectQuizzes >= 1 },
  { key: "lab-pass", icon: "🧪", name: "Lab rat", description: "Pass every check in a coding lab", earned: (s) => s.labsPassed >= 1 },
  { key: "course-complete", icon: "🎓", name: "Graduate", description: "Complete a course and earn its certificate", earned: (s) => s.certificates >= 1 },
  { key: "streak-3", icon: "🔥", name: "On a roll", description: "Learn 3 days in a row", earned: (s) => s.longestStreak >= 3 },
  { key: "streak-7", icon: "⚡", name: "Week warrior", description: "Learn 7 days in a row", earned: (s) => s.longestStreak >= 7 },
  { key: "streak-30", icon: "🏆", name: "Unstoppable", description: "Learn 30 days in a row", earned: (s) => s.longestStreak >= 30 },
];

/** The calendar day (YYYY-MM-DD) of `date` in the learning time zone. */
export function localDay(date: Date, timeZone = LEARNING_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

const DAY_MS = 86_400_000;
const dayNumber = (ymd: string) => Math.round(Date.parse(`${ymd}T00:00:00Z`) / DAY_MS);

/**
 * Pure: current and longest streak from the days a learner was active.
 * The current streak still counts if the last active day was yesterday
 * (today isn't over yet).
 */
export function computeStreaks(days: string[], today: string): { current: number; longest: number } {
  const nums = [...new Set(days.map(dayNumber))].sort((a, b) => a - b);
  let longest = 0;
  let run = 0;
  for (let i = 0; i < nums.length; i++) {
    run = i > 0 && nums[i] === nums[i - 1]! + 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }
  const t = dayNumber(today);
  const last = nums.at(-1);
  const current = last !== undefined && (last === t || last === t - 1) ? run : 0;
  return { current, longest };
}

export async function getStreaks(userId: string, now = new Date()) {
  const rows = await prisma.learningDay.findMany({ where: { userId }, select: { day: true } });
  return computeStreaks(
    rows.map((r) => r.day.toISOString().slice(0, 10)),
    localDay(now),
  );
}

async function badgeStats(userId: string, now: Date): Promise<BadgeStats> {
  const [lessonsDone, attempts, labsPassed, certificates, streaks] = await Promise.all([
    prisma.lessonProgress.count({ where: { enrollment: { userId } } }),
    prisma.assessmentAttempt.findMany({ where: { userId, total: { gt: 0 } }, select: { score: true, total: true } }),
    prisma.labSubmission.count({ where: { userId, passedAt: { not: null } } }),
    prisma.certificate.count({ where: { userId, status: "ACTIVE" } }),
    getStreaks(userId, now),
  ]);
  return {
    lessonsDone,
    quizzesPassed: attempts.filter((a) => (a.score / a.total) * 100 >= QUIZ_PASS_PERCENT).length,
    perfectQuizzes: attempts.filter((a) => a.score === a.total).length,
    labsPassed,
    certificates,
    longestStreak: streaks.longest,
  };
}

/**
 * Call after any learning action: marks today as active and awards any
 * badges now earned. Badges are never taken away. Returns the new badges.
 */
export async function recordLearning(userId: string, now = new Date()): Promise<BadgeKey[]> {
  const day = new Date(`${localDay(now)}T00:00:00Z`);
  await prisma.learningDay.createMany({ data: [{ userId, day }], skipDuplicates: true });

  const [stats, have] = await Promise.all([
    badgeStats(userId, now),
    prisma.userBadge.findMany({ where: { userId }, select: { badge: true } }),
  ]);
  const owned = new Set(have.map((b) => b.badge));
  const fresh = BADGES.filter((b) => !owned.has(b.key) && b.earned(stats)).map((b) => b.key);
  if (fresh.length) {
    await prisma.userBadge.createMany({ data: fresh.map((badge) => ({ userId, badge })), skipDuplicates: true });
  }
  return fresh;
}

/** Dashboard summary: streaks plus every badge, earned or not. */
export async function getAchievements(userId: string, now = new Date()) {
  const [streaks, earned] = await Promise.all([
    getStreaks(userId, now),
    prisma.userBadge.findMany({ where: { userId }, select: { badge: true, awardedAt: true } }),
  ]);
  const earnedAt = new Map(earned.map((b) => [b.badge, b.awardedAt]));
  const activeToday = streaks.current > 0 && (await prisma.learningDay.count({
    where: { userId, day: new Date(`${localDay(now)}T00:00:00Z`) },
  })) > 0;
  return {
    ...streaks,
    activeToday,
    badges: BADGES.map((b) => ({
      key: b.key,
      icon: b.icon,
      name: b.name,
      description: b.description,
      awardedAt: earnedAt.get(b.key) ?? null,
    })),
  };
}
