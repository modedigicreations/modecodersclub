"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/session";
import prisma from "@/lib/prisma";

export async function setReviewHidden(reviewId: string, hidden: boolean) {
  await requireAdmin();
  const review = await prisma.courseReview.update({
    where: { id: reviewId },
    data: { hiddenAt: hidden ? new Date() : null },
    select: { course: { select: { slug: true } } },
  });
  revalidatePath("/admin/reviews");
  revalidatePath(`/courses/${review.course.slug}`);
}
