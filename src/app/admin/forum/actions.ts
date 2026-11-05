"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import prisma from "@/lib/prisma";

function isRedirectError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT");
}

export async function createForumSession(formData: FormData) {
  const session = await requireAdmin();

  try {
    const weekNumber = Number(formData.get("weekNumber"));
    const title = String(formData.get("title") ?? "").trim();
    const prompt = String(formData.get("prompt") ?? "").trim();
    const startsAtRaw = String(formData.get("startsAt") ?? "").trim();

    if (!Number.isInteger(weekNumber) || weekNumber < 1) {
      throw new Error("Enter a valid week number.");
    }
    if (!title || title.length > 160) {
      throw new Error("Enter a title (up to 160 characters).");
    }
    if (!prompt || prompt.length > 2000) {
      throw new Error("Enter a discussion prompt (up to 2,000 characters).");
    }
    const startsAt = new Date(startsAtRaw);
    if (Number.isNaN(startsAt.getTime())) {
      throw new Error("Enter a valid start date.");
    }

    await prisma.forumSession.create({
      data: { weekNumber, title, prompt, startsAt, createdById: session.user.id },
    });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : "Could not create the session.";
    redirect(`/admin/forum?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/admin/forum");
  revalidatePath("/community");
  redirect("/admin/forum");
}

export async function setPostHidden(postId: string, hidden: boolean) {
  await requireAdmin();
  const post = await prisma.forumPost.update({
    where: { id: postId },
    data: { hiddenAt: hidden ? new Date() : null },
    select: { sessionId: true },
  });
  revalidatePath("/admin/forum");
  revalidatePath(`/community/${post.sessionId}`);
}
