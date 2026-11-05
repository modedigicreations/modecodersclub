"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import prisma from "@/lib/prisma";

const COLORS = ["orange", "mint", "lavender", "blue", "pink", "teal"];

function readResourceFields(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const icon = String(formData.get("icon") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim();
  const time = String(formData.get("time") ?? "").trim();

  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new Error("Slug must be lowercase letters, numbers, and hyphens only.");
  }
  if (!name || !category || !description || !icon || !time) {
    throw new Error("All fields are required.");
  }
  if (!COLORS.includes(color)) {
    throw new Error("Choose a valid color.");
  }

  return { slug, name, category, description, icon, color, time };
}

function isRedirectError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT");
}

function errorRedirect(basePath: string, error: unknown): never {
  const message = error instanceof Error ? error.message : "Something went wrong.";
  redirect(`${basePath}?error=${encodeURIComponent(message)}`);
}

export async function createResource(formData: FormData) {
  await requireAdmin();
  try {
    const fields = readResourceFields(formData);
    const maxOrder = await prisma.freeResource.aggregate({ _max: { order: true } });
    await prisma.freeResource.create({
      data: { ...fields, order: (maxOrder._max.order ?? -1) + 1 },
    });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    errorRedirect("/admin/resources", error);
  }

  revalidatePath("/admin/resources");
  revalidatePath("/courses");
  redirect("/admin/resources");
}

export async function updateResource(id: string, formData: FormData) {
  await requireAdmin();
  try {
    const fields = readResourceFields(formData);
    await prisma.freeResource.update({ where: { id }, data: fields });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    errorRedirect(`/admin/resources/${id}`, error);
  }

  revalidatePath("/admin/resources");
  revalidatePath("/courses");
  redirect("/admin/resources");
}

export async function setResourceArchived(id: string, archived: boolean) {
  await requireAdmin();
  await prisma.freeResource.update({
    where: { id },
    data: { archivedAt: archived ? new Date() : null },
  });
  revalidatePath("/admin/resources");
  revalidatePath("/courses");
}

export async function deleteResource(id: string) {
  await requireAdmin();
  await prisma.freeResource.delete({ where: { id } });
  revalidatePath("/admin/resources");
  revalidatePath("/courses");
}
