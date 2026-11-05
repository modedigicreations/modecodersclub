"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import prisma from "@/lib/prisma";

const ROLES = ["admin", "instructor", "learner"];

function isRedirectError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT");
}

export async function updateUser(id: string, formData: FormData) {
  const session = await requireAdmin();

  try {
    const name = String(formData.get("name") ?? "").trim();
    const role = String(formData.get("role") ?? "").trim();

    if (!name || name.length < 2 || name.length > 100) {
      throw new Error("Enter a name between 2 and 100 characters.");
    }
    if (!ROLES.includes(role)) {
      throw new Error("Choose a valid role.");
    }
    if (id === session.user.id && role !== "admin") {
      throw new Error("You can't change your own role away from admin.");
    }
    if (role !== "admin") {
      const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
      if (target?.role === "admin") {
        const adminCount = await prisma.user.count({ where: { role: "admin" } });
        if (adminCount <= 1) {
          throw new Error("At least one admin account must remain.");
        }
      }
    }

    await prisma.user.update({ where: { id }, data: { name, role } });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : "Could not update the user.";
    redirect(`/admin/users/${id}?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function deleteUser(id: string) {
  const session = await requireAdmin();

  try {
    if (id === session.user.id) {
      throw new Error("You can't delete your own account.");
    }
    const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
    if (target?.role === "admin") {
      const adminCount = await prisma.user.count({ where: { role: "admin" } });
      if (adminCount <= 1) {
        throw new Error("At least one admin account must remain.");
      }
    }
    await prisma.user.delete({ where: { id } });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : "Could not delete the user.";
    redirect(`/admin/users?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/admin/users");
  redirect("/admin/users");
}
