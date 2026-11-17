"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import prisma from "@/lib/prisma";
import { enrol } from "@/lib/enrolment";

/** A signed-in learner enrols themselves from the public course page. */
export async function enrolSelf(courseId: string) {
  const session = await requireUser();
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { slug: true } });
  if (!course) redirect("/courses");

  const result = await enrol(session.user.id, courseId, session.user.id);
  if (!result.ok) {
    if (result.reason === "needs_subscription") {
      redirect(`/dashboard/billing?course=${encodeURIComponent(course.slug)}`);
    }
    redirect(`/courses/${course.slug}?error=${encodeURIComponent(result.message)}`);
  }
  revalidatePath("/dashboard");
  redirect(`/dashboard/courses/${courseId}`);
}
