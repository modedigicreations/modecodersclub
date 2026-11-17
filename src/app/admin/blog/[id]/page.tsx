import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import prisma from "@/lib/prisma";
import { PostForm } from "../post-form";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { deleteBlogPost, setBlogPostPublished } from "../actions";

export const metadata: Metadata = { title: "Edit blog post" };

export default async function EditBlogPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { error, saved } = await searchParams;
  const post = await prisma.blogPost.findUnique({ where: { id } });
  if (!post) notFound();

  return (
    <div>
      <p><Link className="text-link text-link-back" href="/admin/blog"><span aria-hidden="true">←</span> All posts</Link></p>
      <div className="admin-header">
        <h1>{post.publishedAt ? "Edit post" : "Edit draft"}</h1>
        {post.publishedAt && <Link className="text-link" href={`/blog/${post.slug}`}>View on the blog ↗</Link>}
      </div>
      {error && <p className="auth-error">{error}</p>}
      {saved && !error && (
        <p className="auth-success">{saved === "published" ? "Published. It's live on the blog." : "Draft saved."}</p>
      )}
      {/* key: remount the editor with the saved content after each save */}
      <PostForm key={post.updatedAt.toISOString()} post={post} />
      <div className="admin-actions" style={{ marginTop: 24 }}>
        {post.publishedAt && (
          <form action={setBlogPostPublished.bind(null, post.id, false)}>
            <button type="submit">Unpublish (back to draft)</button>
          </form>
        )}
        <form action={deleteBlogPost.bind(null, post.id)}>
          <ConfirmSubmit className="danger" message="Delete this post for good? This can't be undone.">Delete post</ConfirmSubmit>
        </form>
      </div>
    </div>
  );
}
