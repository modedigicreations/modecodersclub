"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import prisma from "@/lib/prisma";

type AssessmentQuestion = { question: string; options: string[]; correctIndex: number };

export async function markLessonComplete(courseId: string, lessonId: string) {
  const session = await requireUser();

  const enrollment = await prisma.enrollment.findUnique({
    where: { courseId_userId: { courseId, userId: session.user.id } },
  });
  if (!enrollment) redirect("/dashboard");

  await prisma.lessonProgress.upsert({
    where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId } },
    update: {},
    create: { enrollmentId: enrollment.id, lessonId },
  });

  revalidatePath(`/dashboard/courses/${courseId}`);
  revalidatePath(`/dashboard/courses/${courseId}/lessons/${lessonId}`);
  revalidatePath("/dashboard");
}

// Called directly from the client lab editor (not bound to a form) for
// silent autosave — no redirect/revalidate, since there's no page
// transition to make visible.
export async function saveLabSubmission(labId: string, html: string, css: string, js: string) {
  const session = await requireUser();
  await prisma.labSubmission.upsert({
    where: { labId_userId: { labId, userId: session.user.id } },
    create: { labId, userId: session.user.id, html, css, js },
    update: { html, css, js },
  });
}

// Scores server-side from the stored questions — never trusts a
// client-submitted score. Retaking an assessment just updates the
// learner's latest attempt (no attempt history kept).
export async function submitAssessment(courseId: string, lessonId: string, formData: FormData) {
  const session = await requireUser();

  const enrollment = await prisma.enrollment.findUnique({
    where: { courseId_userId: { courseId, userId: session.user.id } },
  });
  if (!enrollment) redirect("/dashboard");

  const assessment = await prisma.assessment.findUnique({ where: { lessonId } });
  if (!assessment) redirect(`/dashboard/courses/${courseId}/lessons/${lessonId}`);

  const questions = assessment.questions as unknown as AssessmentQuestion[];
  const answers = questions.map((_, index) => {
    const raw = formData.get(`q${index}`);
    const parsed = typeof raw === "string" ? Number(raw) : NaN;
    return Number.isInteger(parsed) ? parsed : -1;
  });
  const score = questions.reduce(
    (total, question, index) => total + (answers[index] === question.correctIndex ? 1 : 0),
    0,
  );

  await prisma.assessmentAttempt.upsert({
    where: { assessmentId_userId: { assessmentId: assessment.id, userId: session.user.id } },
    create: {
      assessmentId: assessment.id,
      userId: session.user.id,
      answers: answers as unknown as Prisma.InputJsonValue,
      score,
      total: questions.length,
    },
    update: { answers: answers as unknown as Prisma.InputJsonValue, score, total: questions.length },
  });

  revalidatePath(`/dashboard/courses/${courseId}/lessons/${lessonId}`);
  redirect(`/dashboard/courses/${courseId}/lessons/${lessonId}`);
}
