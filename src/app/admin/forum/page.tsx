import Link from "next/link";
import prisma from "@/lib/prisma";
import { createForumSession, setPostHidden } from "./actions";

export default async function AdminForumPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const [sessions, posts] = await Promise.all([
    prisma.forumSession.findMany({
      orderBy: { startsAt: "desc" },
      include: { _count: { select: { posts: true } } },
    }),
    prisma.forumPost.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { author: { select: { name: true, email: true } }, session: { select: { title: true } } },
    }),
  ]);

  return (
    <div>
      <div className="admin-header">
        <h1>Community forum</h1>
      </div>

      {error && <p className="auth-error">{error}</p>}

      <form className="admin-form" action={createForumSession}>
        <div className="admin-form-row">
          <div>
            <label htmlFor="weekNumber">Week number</label>
            <input id="weekNumber" name="weekNumber" type="number" min={1} required />
          </div>
          <div>
            <label htmlFor="startsAt">Starts</label>
            <input id="startsAt" name="startsAt" type="date" required />
          </div>
        </div>
        <div>
          <label htmlFor="title">Title</label>
          <input id="title" name="title" required />
        </div>
        <div>
          <label htmlFor="prompt">Discussion prompt</label>
          <textarea id="prompt" name="prompt" style={{ minHeight: 100 }} required />
        </div>
        <button className="button button-primary" type="submit" style={{ justifySelf: "start" }}>
          Create session
        </button>
      </form>

      <h2 style={{ fontSize: 16, marginBottom: 12 }}>Sessions</h2>
      {sessions.length === 0 ? (
        <p className="admin-empty">No sessions yet.</p>
      ) : (
        <table className="admin-table" style={{ marginBottom: 36 }}>
          <thead>
            <tr>
              <th>Week</th>
              <th>Title</th>
              <th>Starts</th>
              <th>Posts</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.id}>
                <td>{session.weekNumber}</td>
                <td>{session.title}</td>
                <td>{new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(session.startsAt)}</td>
                <td>{session._count.posts}</td>
                <td>
                  <div className="admin-actions">
                    <Link href={`/community/${session.id}`} target="_blank">
                      View
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2 style={{ fontSize: 16, marginBottom: 12 }}>Recent posts</h2>
      {posts.length === 0 ? (
        <p className="admin-empty">No posts yet.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Author</th>
              <th>Session</th>
              <th>Post</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.id}>
                <td>{post.author.name}</td>
                <td>{post.session.title}</td>
                <td style={{ maxWidth: 320 }}>{post.body}</td>
                <td>{post.hiddenAt ? "Hidden" : "Visible"}</td>
                <td>
                  <form action={setPostHidden.bind(null, post.id, !post.hiddenAt)}>
                    <div className="admin-actions">
                      <button type="submit">{post.hiddenAt ? "Unhide" : "Hide"}</button>
                    </div>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
