"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import prisma from "@/lib/prisma";
import { SUBSCRIPTION_AMOUNT_KOBO, initializeTransaction } from "@/lib/paystack";

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
