import prisma from "@/lib/prisma";

export const REVIEW_COMMENT_MAX = 1000;

/** Enrolled and has completed at least one published lesson, so the review comes from real use. */
export async function canReviewCourse(userId: string, courseId: string) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { courseId_userId: { courseId, userId } },
    select: { lessonProgress: { where: { lesson: { isPublished: true } }, select: { id: true }, take: 1 } },
  });
  return Boolean(enrollment && enrollment.lessonProgress.length > 0);
}

/** Validates and saves (creates or edits) the learner's review. Returns an error message or null. */
export async function saveReview(userId: string, courseId: string, ratingRaw: unknown, commentRaw: unknown): Promise<string | null> {
  const rating = Number(ratingRaw);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return "Choose a rating from 1 to 5 stars.";
  const comment = typeof commentRaw === "string" ? commentRaw.trim() : "";
  if (comment.length > REVIEW_COMMENT_MAX) return `Keep your review under ${REVIEW_COMMENT_MAX} characters.`;
  if (!(await canReviewCourse(userId, courseId))) return "Complete at least one lesson before reviewing this course.";
  await prisma.courseReview.upsert({
    where: { courseId_userId: { courseId, userId } },
    create: { courseId, userId, rating, comment: comment || null },
    update: { rating, comment: comment || null },
  });
  return null;
}

/** Public summary: average of visible reviews and the most recent ones. */
export async function getCourseRating(courseId: string, take = 10) {
  const [agg, latest] = await Promise.all([
    prisma.courseReview.aggregate({ where: { courseId, hiddenAt: null }, _avg: { rating: true }, _count: { _all: true } }),
    prisma.courseReview.findMany({
      where: { courseId, hiddenAt: null },
      orderBy: { updatedAt: "desc" },
      take,
      select: { id: true, rating: true, comment: true, updatedAt: true, user: { select: { name: true } } },
    }),
  ]);
  return {
    average: agg._avg.rating === null ? null : Math.round(agg._avg.rating * 10) / 10,
    count: agg._count._all,
    reviews: latest.map((r) => ({ ...r, author: publicName(r.user.name) })),
  };
}

/** "Ada Lovelace" -> "Ada L." (first name and last initial only on public pages). */
export function publicName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Learner";
  return parts.length === 1 ? parts[0]! : `${parts[0]} ${parts.at(-1)![0]!.toUpperCase()}.`;
}

export function stars(rating: number) {
  const full = Math.round(rating);
  return "★".repeat(full) + "☆".repeat(5 - full);
}
