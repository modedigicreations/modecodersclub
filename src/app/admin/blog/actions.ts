"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import prisma from "@/lib/prisma";
import { readBlogForm, uniqueSlug } from "@/lib/blog";

function revalidateBlog(slug?: string) {
  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  revalidatePath("/");
  if (slug) revalidatePath(`/blog/${slug}`);
}

/** Creates (id null) or updates a post. intent=publish also publishes it. */
export async function saveBlogPost(id: string | null, formData: FormData) {
  const session = await requireAdmin();
  const input = readBlogForm(formData);
  const back = id ? `/admin/blog/${id}` : "/admin/blog/new";
  if (typeof input === "string") redirect(`${back}?error=${encodeURIComponent(input)}`);

  const publish = formData.get("intent") === "publish";
  const existing = id ? await prisma.blogPost.findUnique({ where: { id }, select: { slug: true, publishedAt: true } }) : null;
  if (id && !existing) redirect("/admin/blog");

  const slug = await uniqueSlug(input.slug, id ?? undefined);
  const data = {
    title: input.title,
    slug,
    excerpt: input.excerpt,
    coverImageUrl: input.coverImageUrl,
    tags: input.tags,
    content: input.content as Prisma.InputJsonValue,
    ...(publish && !existing?.publishedAt ? { publishedAt: new Date() } : {}),
  };
  const post = id
    ? await prisma.blogPost.update({ where: { id }, data })
    : await prisma.blogPost.create({ data: { ...data, authorId: session.user.id } });

  revalidateBlog(slug);
  if (existing && existing.slug !== slug) revalidatePath(`/blog/${existing.slug}`);
  redirect(`/admin/blog/${post.id}?saved=${publish ? "published" : "1"}`);
}

export async function setBlogPostPublished(id: string, published: boolean) {
  await requireAdmin();
  const post = await prisma.blogPost.update({
    where: { id },
    data: { publishedAt: published ? new Date() : null },
    select: { slug: true },
  });
  revalidateBlog(post.slug);
}

export async function deleteBlogPost(id: string) {
  await requireAdmin();
  const post = await prisma.blogPost.delete({ where: { id }, select: { slug: true } });
  revalidateBlog(post.slug);
  redirect("/admin/blog?deleted=1");
}
