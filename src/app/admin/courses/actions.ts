"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import prisma from "@/lib/prisma";

const COLORS = ["orange", "mint", "lavender", "blue", "pink", "teal"];

function readCourseFields(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const level = String(formData.get("level") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const icon = String(formData.get("icon") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim();
  const duration = String(formData.get("duration") ?? "").trim();
  const price = String(formData.get("price") ?? "").trim();
  const audience = String(formData.get("audience") ?? "").trim();
  const outcomes = String(formData.get("outcomes") ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new Error("Slug must be lowercase letters, numbers, and hyphens only.");
  }
  if (!name || !category || !level || !description || !icon || !duration || !price || !audience) {
    throw new Error("All fields are required.");
  }
  if (!COLORS.includes(color)) {
    throw new Error("Choose a valid color.");
  }
  if (outcomes.length === 0) {
    throw new Error("Add at least one outcome (one per line).");
  }

  return { slug, name, category, level, description, icon, color, duration, price, audience, outcomes };
}

function errorRedirect(basePath: string, error: unknown): never {
  const message = error instanceof Error ? error.message : "Something went wrong.";
  redirect(`${basePath}?error=${encodeURIComponent(message)}`);
}

export async function createCourse(formData: FormData) {
  await requireAdmin();
  try {
    const fields = readCourseFields(formData);
    const maxOrder = await prisma.course.aggregate({ _max: { order: true } });
    await prisma.course.create({
      data: { ...fields, order: (maxOrder._max.order ?? -1) + 1 },
    });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    errorRedirect("/admin/courses", error);
  }

  revalidatePath("/admin/courses");
  revalidatePath("/courses");
  revalidatePath("/");
  redirect("/admin/courses");
}

export async function updateCourse(id: string, formData: FormData) {
  await requireAdmin();
  let slug = "";
  try {
    const fields = readCourseFields(formData);
    slug = fields.slug;
    await prisma.course.update({ where: { id }, data: fields });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    errorRedirect(`/admin/courses/${id}`, error);
  }

  revalidatePath("/admin/courses");
  revalidatePath("/courses");
  revalidatePath(`/courses/${slug}`);
  revalidatePath("/");
  redirect("/admin/courses");
}

export async function setCourseArchived(id: string, archived: boolean) {
  await requireAdmin();
  await prisma.course.update({
    where: { id },
    data: { archivedAt: archived ? new Date() : null },
  });
  revalidatePath("/admin/courses");
  revalidatePath("/courses");
  revalidatePath("/");
}

export async function deleteCourse(id: string) {
  await requireAdmin();
  await prisma.course.delete({ where: { id } });
  revalidatePath("/admin/courses");
  revalidatePath("/courses");
  revalidatePath("/");
}

// Next's redirect() works by throwing a special error that the framework
// catches higher up — our own try/catch here would otherwise swallow it
// and treat a successful redirect as a thrown validation error.
function isRedirectError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT");
}
