import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { PostForm } from "../post-form";

export const metadata: Metadata = { title: "New blog post" };

export default async function NewBlogPostPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireAdmin();
  const { error } = await searchParams;
  return (
    <div>
      <p><Link className="text-link text-link-back" href="/admin/blog"><span aria-hidden="true">←</span> All posts</Link></p>
      <div className="admin-header"><h1>New blog post</h1></div>
      {error && <p className="auth-error">{error}</p>}
      <PostForm />
    </div>
  );
}
