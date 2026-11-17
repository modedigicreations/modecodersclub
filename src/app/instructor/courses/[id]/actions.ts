"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { requireAdmin, requireInstructorAccess } from "@/lib/session";
import prisma from "@/lib/prisma";
import { enrol } from "@/lib/enrolment";
import { toEmbedUrl } from "@/lib/video-embed";
import { parseChecks } from "@/lib/lab-checks";

function isRedirectError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT");
}

function errorRedirect(basePath: string, error: unknown): never {
  const message = error instanceof Error ? error.message : "Something went wrong.";
  redirect(`${basePath}?error=${encodeURIComponent(message)}`);
}

/** Throws unless `lessonId` belongs to `courseId` (access to one course must not reach another's lessons). */
async function assertLessonInCourse(courseId: string, lessonId: string) {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { courseId: true } });
  if (!lesson || lesson.courseId !== courseId) throw new Error("Lesson not found in this course.");
}

const MAX_LESSON_CONTENT = 8000; // Lesson.content is VarChar(8000)
const MAX_LAB_FIELD = 4000; // Lab columns are VarChar(4000)

function readVideoUrl(formData: FormData): string | null {
  const videoUrl = String(formData.get("videoUrl") ?? "").trim();
  if (!videoUrl) return null;
  if (videoUrl.length > 500 || !toEmbedUrl(videoUrl)) {
    throw new Error("Video must be a YouTube or Vimeo link.");
  }
  return videoUrl;
}

// --- Lessons ---

export async function createLesson(courseId: string, formData: FormData) {
  await requireInstructorAccess(courseId);

  try {
    const title = String(formData.get("title") ?? "").trim();
    const content = String(formData.get("content") ?? "").trim();
    if (!title || title.length > 160) throw new Error("Enter a title (up to 160 characters).");
    if (!content) throw new Error("Enter the lesson content.");
    if (content.length > MAX_LESSON_CONTENT) throw new Error(`Lesson content can be up to ${MAX_LESSON_CONTENT} characters.`);
    const videoUrl = readVideoUrl(formData);

    const maxPosition = await prisma.lesson.aggregate({ where: { courseId }, _max: { position: true } });
    await prisma.lesson.create({
      data: { courseId, title, content, videoUrl, position: (maxPosition._max.position ?? -1) + 1 },
    });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    errorRedirect(`/instructor/courses/${courseId}`, error);
  }

  revalidatePath(`/instructor/courses/${courseId}`);
  redirect(`/instructor/courses/${courseId}`);
}

export async function updateLesson(courseId: string, lessonId: string, formData: FormData) {
  await requireInstructorAccess(courseId);

  try {
    const title = String(formData.get("title") ?? "").trim();
    const content = String(formData.get("content") ?? "").trim();
    const position = Number(formData.get("position"));
    const isPublished = formData.get("isPublished") === "on";

    if (!title || title.length > 160) throw new Error("Enter a title (up to 160 characters).");
    if (!content) throw new Error("Enter the lesson content.");
    if (!Number.isInteger(position)) throw new Error("Position must be a whole number.");
    if (content.length > MAX_LESSON_CONTENT) throw new Error(`Lesson content can be up to ${MAX_LESSON_CONTENT} characters.`);
    const videoUrl = readVideoUrl(formData);

    await prisma.lesson.update({
      where: { id: lessonId, courseId },
      data: { title, content, videoUrl, position, isPublished },
    });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    errorRedirect(`/instructor/courses/${courseId}/lessons/${lessonId}`, error);
  }

  revalidatePath(`/instructor/courses/${courseId}`);
  revalidatePath(`/dashboard/courses/${courseId}`);
  redirect(`/instructor/courses/${courseId}`);
}

export async function deleteLesson(courseId: string, lessonId: string) {
  await requireInstructorAccess(courseId);
  await prisma.lesson.delete({ where: { id: lessonId, courseId } });
  revalidatePath(`/instructor/courses/${courseId}`);
}

// --- Enrollment ---

export async function enrollStudent(courseId: string, formData: FormData) {
  const session = await requireInstructorAccess(courseId);

  try {
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    if (!email) throw new Error("Enter the learner's email.");

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true } });
    if (!user) throw new Error(`No account found for ${email}. They need to register first.`);

    const existing = await prisma.enrollment.findUnique({
      where: { courseId_userId: { courseId, userId: user.id } },
    });
    if (existing) throw new Error(`${user.name} is already enrolled in this course.`);

    // Same rules as self-enrolment (src/lib/enrolment.ts): live course, not an
    // admin, and a subscription (or school access) for paid courses.
    const result = await enrol(user.id, courseId, session.user.id);
    if (!result.ok) {
      throw new Error(
        result.reason === "needs_subscription"
          ? `${result.message} Ask them to subscribe from their dashboard first.`
          : result.reason === "not_open"
            ? "This course is still a draft or archived. Publish it before enrolling learners."
            : result.message,
      );
    }
  } catch (error) {
    if (isRedirectError(error)) throw error;
    errorRedirect(`/instructor/courses/${courseId}`, error);
  }

  revalidatePath(`/instructor/courses/${courseId}`);
  redirect(`/instructor/courses/${courseId}`);
}

export async function unenrollStudent(courseId: string, enrollmentId: string) {
  await requireInstructorAccess(courseId);
  await prisma.enrollment.delete({ where: { id: enrollmentId, courseId } });
  revalidatePath(`/instructor/courses/${courseId}`);
}

// --- Instructor assignment (admin only) ---

export async function assignInstructor(courseId: string, formData: FormData) {
  await requireAdmin();

  try {
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    if (!email) throw new Error("Enter the instructor's email.");

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error(`No account found for ${email}.`);
    if (user.role !== "instructor") throw new Error(`${user.name} is not set to the "instructor" role yet (change it in Users).`);

    const existing = await prisma.courseInstructor.findUnique({
      where: { courseId_userId: { courseId, userId: user.id } },
    });
    if (existing) throw new Error(`${user.name} is already assigned to this course.`);

    await prisma.courseInstructor.create({ data: { courseId, userId: user.id } });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    errorRedirect(`/instructor/courses/${courseId}`, error);
  }

  revalidatePath(`/instructor/courses/${courseId}`);
  redirect(`/instructor/courses/${courseId}`);
}

export async function unassignInstructor(courseId: string, assignmentId: string) {
  await requireAdmin();
  await prisma.courseInstructor.delete({ where: { id: assignmentId, courseId } });
  revalidatePath(`/instructor/courses/${courseId}`);
}

// --- Coding lab ---

export async function upsertLab(courseId: string, lessonId: string, formData: FormData) {
  await requireInstructorAccess(courseId);

  try {
    const instructions = String(formData.get("instructions") ?? "").trim();
    const starterHtml = String(formData.get("starterHtml") ?? "");
    const starterCss = String(formData.get("starterCss") ?? "");
    const starterJs = String(formData.get("starterJs") ?? "");
    const hintsEnabled = formData.get("hintsEnabled") === "on";
    if (!instructions) throw new Error("Enter instructions for the lab.");
    if ([instructions, starterHtml, starterCss, starterJs].some((v) => v.length > MAX_LAB_FIELD)) {
      throw new Error(`Each lab field can be up to ${MAX_LAB_FIELD} characters.`);
    }
    const { checks, errors } = parseChecks(String(formData.get("checks") ?? "").slice(0, 10_000));
    if (errors.length) throw new Error(errors.slice(0, 3).join(" "));
    await assertLessonInCourse(courseId, lessonId);

    const data = { instructions, starterHtml, starterCss, starterJs, hintsEnabled, checks };
    await prisma.lab.upsert({ where: { lessonId }, create: { lessonId, ...data }, update: data });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    errorRedirect(`/instructor/courses/${courseId}/lessons/${lessonId}`, error);
  }

  revalidatePath(`/instructor/courses/${courseId}/lessons/${lessonId}`);
  revalidatePath(`/dashboard/courses/${courseId}/lessons/${lessonId}`);
  redirect(`/instructor/courses/${courseId}/lessons/${lessonId}`);
}

export async function deleteLab(courseId: string, lessonId: string) {
  await requireInstructorAccess(courseId);
  await prisma.lab.deleteMany({ where: { lessonId, lesson: { courseId } } });
  revalidatePath(`/instructor/courses/${courseId}/lessons/${lessonId}`);
  revalidatePath(`/dashboard/courses/${courseId}/lessons/${lessonId}`);
}

// --- Assessment ---

type QuestionDraft = { question: string; options: string[]; correctIndex: number };

function parseQuestions(raw: string): QuestionDraft[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Questions must be valid JSON.");
  }
  if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("Add at least one question.");

  return parsed.map((item, index) => {
    const isValid =
      typeof item === "object" && item !== null &&
      typeof (item as { question?: unknown }).question === "string" &&
      Array.isArray((item as { options?: unknown }).options) &&
      (item as { options: unknown[] }).options.length === 4 &&
      (item as { options: unknown[] }).options.every((option) => typeof option === "string") &&
      Number.isInteger((item as { correctIndex?: unknown }).correctIndex) &&
      (item as { correctIndex: number }).correctIndex >= 0 &&
      (item as { correctIndex: number }).correctIndex <= 3;

    if (!isValid) {
      throw new Error(`Question ${index + 1} needs a question, 4 options, and a correctIndex from 0-3.`);
    }
    return item as QuestionDraft;
  });
}

export async function upsertAssessment(courseId: string, lessonId: string, formData: FormData) {
  await requireInstructorAccess(courseId);

  try {
    const questions = parseQuestions(String(formData.get("questions") ?? ""));
    await assertLessonInCourse(courseId, lessonId);
    await prisma.assessment.upsert({
      where: { lessonId },
      create: { lessonId, questions: questions as unknown as Prisma.InputJsonValue },
      update: { questions: questions as unknown as Prisma.InputJsonValue },
    });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    errorRedirect(`/instructor/courses/${courseId}/lessons/${lessonId}`, error);
  }

  revalidatePath(`/instructor/courses/${courseId}/lessons/${lessonId}`);
  revalidatePath(`/dashboard/courses/${courseId}/lessons/${lessonId}`);
  redirect(`/instructor/courses/${courseId}/lessons/${lessonId}`);
}

export async function deleteAssessment(courseId: string, lessonId: string) {
  await requireInstructorAccess(courseId);
  await prisma.assessment.deleteMany({ where: { lessonId, lesson: { courseId } } });
  revalidatePath(`/instructor/courses/${courseId}/lessons/${lessonId}`);
  revalidatePath(`/dashboard/courses/${courseId}/lessons/${lessonId}`);
}
