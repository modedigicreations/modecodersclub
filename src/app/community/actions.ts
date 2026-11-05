"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import prisma from "@/lib/prisma";

function isRedirectError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT");
}

export async function createPost(sessionId: string, formData: FormData) {
  const session = await requireUser();

  try {
    const body = String(formData.get("body") ?? "").trim();
    if (!body || body.length > 4000) {
      throw new Error("Write a reply up to 4,000 characters.");
    }
    const forumSession = await prisma.forumSession.findUnique({ where: { id: sessionId } });
    if (!forumSession) throw new Error("This session no longer exists.");

    await prisma.forumPost.create({
      data: { sessionId, authorId: session.user.id, body },
    });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : "Could not post your reply.";
    redirect(`/community/${sessionId}?error=${encodeURIComponent(message)}`);
  }

  revalidatePath(`/community/${sessionId}`);
  redirect(`/community/${sessionId}`);
}
