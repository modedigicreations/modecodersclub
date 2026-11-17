"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import prisma from "@/lib/prisma";
import { GenerationError } from "@/lib/course-generator/claude";
import { LESSON_MAX, LESSON_MIN, createGenerationJob, runGenerationJob } from "@/lib/course-generator/run";

const LEVELS = ["Beginner", "Intermediate", "Advanced"];

function fail(message: string): never {
  redirect(`/admin/course-generator?error=${encodeURIComponent(message)}`);
}

export async function startCourseGeneration(formData: FormData) {
  const session = await requireAdmin();
  if (!process.env.ANTHROPIC_API_KEY) fail("ANTHROPIC_API_KEY isn't set on the server, so AI generation is off.");

  const topic = String(formData.get("topic") ?? "").trim().slice(0, 300);
  const audience = String(formData.get("audience") ?? "").trim().slice(0, 300) || "Beginners with no prior coding experience";
  const levelRaw = String(formData.get("level") ?? "Beginner");
  const level = LEVELS.includes(levelRaw) ? levelRaw : "Beginner";
  const lessonsRaw = Number(formData.get("lessons"));
  const lessonTarget = Number.isInteger(lessonsRaw) ? Math.min(LESSON_MAX, Math.max(LESSON_MIN, lessonsRaw)) : 10;
  const isFree = formData.get("isFree") === "on";
  const price = String(formData.get("price") ?? "").trim().slice(0, 80) || (isFree ? "Free" : "Included with subscription");
  if (topic.length < 3) fail("Describe the course topic (at least a few words).");

  let jobId: string;
  try {
    const job = await createGenerationJob(session.user.id, {
      topic,
      audience,
      level,
      lessonTarget,
      includeLabs: formData.get("includeLabs") === "on",
      // Off unless the admin ticks it on this form.
      autoPublish: formData.get("autoPublish") === "on",
      isFree,
      price,
    });
    jobId = job.id;
  } catch (error) {
    fail(error instanceof GenerationError ? error.message : "Couldn't start the generator. Try again.");
  }

  // Runs after the response is sent; the page polls the job's progress.
  after(() => runGenerationJob(jobId).then(() => undefined));
  revalidatePath("/admin/course-generator");
  redirect(`/admin/course-generator?started=${jobId}`);
}

/** Publishes a reviewed draft course: visible in the catalogue, open to enrolments, every lesson published. */
export async function publishCourseDraft(courseId: string) {
  await requireAdmin();
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { slug: true, isDraft: true } });
  if (!course) fail("Course not found.");
  if (course.isDraft) {
    await prisma.$transaction([
      prisma.course.update({ where: { id: courseId }, data: { isDraft: false } }),
      prisma.lesson.updateMany({ where: { courseId }, data: { isPublished: true } }),
    ]);
  }
  revalidatePath("/admin/course-generator");
  revalidatePath("/admin/courses");
  revalidatePath("/courses");
  revalidatePath(`/courses/${course.slug}`);
  revalidatePath("/");
  redirect("/admin/course-generator?published=1");
}
