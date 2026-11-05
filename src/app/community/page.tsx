import type { Metadata } from "next";
import Link from "next/link";
import prisma from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Community",
  description: "Weekly discussion sessions where Mode Coders Club learners trade ideas and solutions with their peers.",
};

// Needs the live list of sessions on every request.
export const instant = false;

function mostRecentStartedSessionId(sessions: { id: string; startsAt: Date }[]): string | undefined {
  const now = Date.now();
  return sessions.find((s) => s.startsAt.getTime() <= now)?.id;
}

export default async function CommunityPage() {
  const sessions = await prisma.forumSession.findMany({
    orderBy: { startsAt: "desc" },
    include: { _count: { select: { posts: true } } },
  });
  const currentId = mostRecentStartedSessionId(sessions);

  return (
    <main>
      <section className="catalog-hero">
        <div className="container">
          <p className="eyebrow"><span /> Weekly sessions</p>
          <h1>Think out loud.<br /><span>Build with others.</span></h1>
          <p>
            Every week, Mode Coders Club picks a new topic for learners to discuss,
            debate, and solve together. Browse this week&rsquo;s session or catch up
            on past ones.
          </p>
        </div>
      </section>

      <section className="section catalog-section">
        <div className="container">
          {sessions.length === 0 ? (
            <p className="admin-empty">No sessions yet — check back soon.</p>
          ) : (
            <div className="session-grid">
              {sessions.map((session) => (
                <Link className={`session-card ${session.id === currentId ? "is-current" : ""}`} href={`/community/${session.id}`} key={session.id}>
                  <div className="session-meta-row">
                    <span>Week {session.weekNumber}</span>
                    <span>·</span>
                    <span>{new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(session.startsAt)}</span>
                    {session.id === currentId && <span>· Current</span>}
                  </div>
                  <h3>{session.title}</h3>
                  <p>{session.prompt}</p>
                  <p style={{ marginTop: 10, color: "var(--green-dark)", fontWeight: 700, fontSize: 12 }}>
                    {session._count.posts} {session._count.posts === 1 ? "reply" : "replies"}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
