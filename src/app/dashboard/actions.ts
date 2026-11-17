"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import prisma from "@/lib/prisma";
import { SUBSCRIPTION_AMOUNT_KOBO, initializeTransaction } from "@/lib/paystack";
import { issueCertificateIfComplete } from "@/lib/course-completion";

/** Certificate check after progress changes; never blocks the learner's action. */
async function checkCertificate(userId: string, courseId: string) {
  await issueCertificateIfComplete(userId, courseId).catch((err) =>
    console.error("[certificates] automatic issue failed:", err instanceof Error ? err.message : err),
  );
}

type AssessmentQuestion = { question: string; options: string[]; correctIndex: number };

function isRedirectError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT");
}

// Starts a Paystack checkout for the sitewide Premium subscription.
// Subscription.active rows are only ever created by the webhook
// (src/app/api/paystack/webhook/route.ts) — this action just gets the
// learner to Paystack's hosted checkout page.
export async function subscribe() {
  const session = await requireUser();

  const baseUrl = process.env.BETTER_AUTH_URL;
  if (!baseUrl) redirect("/dashboard?error=" + encodeURIComponent("Subscriptions aren't configured yet."));

  let authorizationUrl: string;
  try {
    const reference = `mcc-sub-${session.user.id}-${Date.now()}`;
    const { authorization_url } = await initializeTransaction({
      email: session.user.email,
      amountKobo: SUBSCRIPTION_AMOUNT_KOBO,
      reference,
      callbackUrl: new URL("/dashboard/subscribe/callback", baseUrl).toString(),
      metadata: { userId: session.user.id },
    });
    authorizationUrl = authorization_url;
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : "Could not start checkout.";
    redirect(`/dashboard?error=${encodeURIComponent(message)}`);
  }

  redirect(authorizationUrl);
}

/** The published lesson, if it belongs to `courseId`; otherwise null. */
async function publishedLessonInCourse(courseId: string, lessonId: string) {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { courseId: true, isPublished: true } });
  return lesson && lesson.courseId === courseId && lesson.isPublished ? lesson : null;
}

export async function markLessonComplete(courseId: string, lessonId: string) {
  const session = await requireUser();

  const enrollment = await prisma.enrollment.findUnique({
    where: { courseId_userId: { courseId, userId: session.user.id } },
  });
  if (!enrollment) redirect("/dashboard");
  // Only lessons of this course that learners can see count towards progress.
  if (!(await publishedLessonInCourse(courseId, lessonId))) redirect(`/dashboard/courses/${courseId}`);

  await prisma.lessonProgress.upsert({
    where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId } },
    update: {},
    create: { enrollmentId: enrollment.id, lessonId },
  });
  await checkCertificate(session.user.id, courseId);

  revalidatePath(`/dashboard/courses/${courseId}`);
  revalidatePath(`/dashboard/courses/${courseId}/lessons/${lessonId}`);
  revalidatePath("/dashboard");
}

// Called directly from the client lab editor (not bound to a form) for
// silent autosave — no redirect/revalidate, since there's no page
// transition to make visible.
const MAX_LAB_CODE = 4000; // LabSubmission columns are VarChar(4000)

export async function saveLabSubmission(labId: string, html: string, css: string, js: string) {
  const session = await requireUser();
  // Only for a lab in a published lesson of a course this learner is enrolled in.
  const lab = await prisma.lab.findUnique({
    where: { id: labId },
    select: { lesson: { select: { courseId: true, isPublished: true } } },
  });
  if (!lab || !lab.lesson.isPublished) return { ok: false as const };
  const enrolled = await prisma.enrollment.findUnique({
    where: { courseId_userId: { courseId: lab.lesson.courseId, userId: session.user.id } },
    select: { id: true },
  });
  if (!enrolled) return { ok: false as const };

  const clip = (v: unknown) => (typeof v === "string" ? v.slice(0, MAX_LAB_CODE) : "");
  await prisma.labSubmission.upsert({
    where: { labId_userId: { labId, userId: session.user.id } },
    create: { labId, userId: session.user.id, html: clip(html), css: clip(css), js: clip(js) },
    update: { html: clip(html), css: clip(css), js: clip(js) },
  });
  return { ok: true as const };
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

  if (!(await publishedLessonInCourse(courseId, lessonId))) redirect(`/dashboard/courses/${courseId}`);
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
  await checkCertificate(session.user.id, courseId);
  revalidatePath(`/dashboard/courses/${courseId}`);

  revalidatePath(`/dashboard/courses/${courseId}/lessons/${lessonId}`);
  redirect(`/dashboard/courses/${courseId}/lessons/${lessonId}`);
}
