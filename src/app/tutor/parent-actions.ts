"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { sendEmail } from "@/lib/email";
import { newParentToken } from "@/lib/tutor/token";

const MAX_PARENTS = 3;

function escapeHtml(v: string) {
  return v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Share a read-only progress link with a parent or guardian. */
export async function addParentLink(formData: FormData) {
  const session = await requireUser();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    redirect("/tutor?parentError=" + encodeURIComponent("Enter a valid email address.") + "#family");
  }
  const active = await prisma.tutorParentLink.count({ where: { userId: session.user.id, revokedAt: null } });
  const existing = await prisma.tutorParentLink.findUnique({ where: { userId_email: { userId: session.user.id, email } } });
  if (!existing?.revokedAt && existing) redirect("/tutor?parentError=" + encodeURIComponent("That email already has a link.") + "#family");
  if (active >= MAX_PARENTS) redirect("/tutor?parentError=" + encodeURIComponent(`You can share with up to ${MAX_PARENTS} people.`) + "#family");

  const token = newParentToken();
  await prisma.tutorParentLink.upsert({
    where: { userId_email: { userId: session.user.id, email } },
    create: { userId: session.user.id, email, token },
    update: { token, revokedAt: null, createdAt: new Date() },
  });
  const base = process.env.BETTER_AUTH_URL;
  if (base) {
    const link = new URL(`/tutor/parent/${token}`, base).toString();
    const name = session.user.name;
    await sendEmail({
      to: email,
      subject: `See ${name}'s reading and maths progress`,
      text: `${name} has shared their progress on the Mode Coders Club reading, writing and maths tutor with you.\n\nSee what they're learning and how they're doing: ${link}\n\nThis private link shows progress only. Anyone with the link can view it, so please don't share it.`,
      html: `<p>${escapeHtml(name)} has shared their progress on the Mode Coders Club reading, writing and maths tutor with you.</p><p><a href="${escapeHtml(link)}">See what they're learning and how they're doing</a></p><p style="color:#666">This private link shows progress only. Anyone with the link can view it, so please don't share it.</p>`,
    }).catch((err) => console.error("[tutor] parent email failed:", err instanceof Error ? err.message : err));
  }
  revalidatePath("/tutor");
  redirect("/tutor?parentAdded=1#family");
}

export async function revokeParentLink(id: string) {
  const session = await requireUser();
  await prisma.tutorParentLink.updateMany({
    where: { id, userId: session.user.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  revalidatePath("/tutor");
}
