import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import prisma from "@/lib/prisma";
import { setBlogPostPublished } from "./actions";

export const metadata: Metadata = { title: "Blog" };

export default async function AdminBlogPage({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  await requireAdmin();
  const { deleted } = await searchParams;
  const posts = await prisma.blogPost.findMany({
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, slug: true, publishedAt: true, updatedAt: true, author: { select: { name: true } } },
  });

  return (
    <div>
      <div className="admin-header">
        <h1>Blog</h1>
        <Link className="button button-primary" href="/admin/blog/new">New post</Link>
      </div>
      {deleted && <p className="auth-success">Post deleted.</p>}
      {posts.length === 0 ? (
        <p className="admin-empty">No posts yet. Write the first one.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Last edited</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {posts.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link href={`/admin/blog/${p.id}`}><strong>{p.title}</strong></Link>
                  <br />
                  <span style={{ color: "var(--muted)", fontSize: 11 }}>/blog/{p.slug}{p.author ? ` · by ${p.author.name}` : ""}</span>
                </td>
                <td>{p.publishedAt ? "Published" : "Draft"}</td>
                <td>{p.updatedAt.toISOString().slice(0, 16).replace("T", " ")}</td>
                <td>
                  <div className="admin-actions">
                    <Link href={`/admin/blog/${p.id}`}>Edit</Link>
                    {p.publishedAt && <Link href={`/blog/${p.slug}`}>View</Link>}
                    <form action={setBlogPostPublished.bind(null, p.id, !p.publishedAt)}>
                      <button type="submit">{p.publishedAt ? "Unpublish" : "Publish"}</button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
