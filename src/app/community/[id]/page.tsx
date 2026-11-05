import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import prisma from "@/lib/prisma";
import { createPost } from "../actions";

export const instant = false;

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const session = await prisma.forumSession.findUnique({ where: { id } });
  if (!session) return {};
  return { title: `Week ${session.weekNumber}: ${session.title}` };
}

export default async function CommunitySessionPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { error } = await searchParams;
  const [forumSession, viewerSession] = await Promise.all([
    prisma.forumSession.findUnique({ where: { id } }),
    getSession(),
  ]);
  if (!forumSession) notFound();

  const isAdmin = viewerSession?.user.role === "admin";
  const posts = await prisma.forumPost.findMany({
    where: { sessionId: id, ...(isAdmin ? {} : { hiddenAt: null }) },
    orderBy: { createdAt: "asc" },
    include: { author: { select: { name: true } } },
  });

  return (
    <main>
      <section className="catalog-hero">
        <div className="container">
          <p className="eyebrow"><span /> Week {forumSession.weekNumber}</p>
          <h1 style={{ fontSize: "clamp(32px, 4.4vw, 48px)" }}>{forumSession.title}</h1>
          <p>{forumSession.prompt}</p>
        </div>
      </section>

      <section className="section catalog-section">
        <div className="container" style={{ maxWidth: 720 }}>
          {error && <p className="auth-error">{error}</p>}

          {posts.length === 0 ? (
            <p className="admin-empty">No replies yet — be the first to share your thoughts.</p>
          ) : (
            <div className="post-list">
              {posts.map((post) => (
                <article className="post-item" key={post.id}>
                  <div className="post-item-header">
                    <strong>{post.author.name}</strong>
                    <span>
                      {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(post.createdAt)}
                    </span>
                    {post.hiddenAt && <span>(hidden)</span>}
                  </div>
                  <p>{post.body}</p>
                </article>
              ))}
            </div>
          )}

          {viewerSession ? (
            <form className="reply-form" action={createPost.bind(null, id)}>
              <textarea name="body" placeholder="Share your thoughts or ask a question…" required maxLength={4000} />
              <button className="button button-primary" type="submit">
                Post reply
              </button>
            </form>
          ) : (
            <p className="reply-signin-note">
              <a href="/login">Sign in</a> or <a href="/register">create an account</a> to join the discussion.
            </p>
          )}

          <p style={{ marginTop: 32 }}>
            <Link className="text-link text-link-back" href="/community">
              <span aria-hidden="true">←</span> Back to all sessions
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
