import type { Metadata } from "next";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { getAchievements } from "@/lib/achievements";
import { getTrackOverview } from "@/lib/tutor/service";
import { TRACKS } from "@/lib/tutor/skills";
import type { Track } from "@/lib/tutor/types";

export const instant = false;
export const metadata: Metadata = { title: "Learning progress", robots: { index: false, follow: false } };

/** Read-only progress for a parent or guardian, opened from an emailed private link. */
export default async function ParentProgressPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{48}$/.test(token)) notFound();
  const link = await prisma.tutorParentLink.findUnique({
    where: { token },
    select: { userId: true, revokedAt: true, user: { select: { name: true } } },
  });
  if (!link || link.revokedAt) notFound();
  const [literacy, numeracy, achievements, writing] = await Promise.all([
    getTrackOverview(link.userId, "literacy"),
    getTrackOverview(link.userId, "numeracy"),
    getAchievements(link.userId),
    prisma.tutorWriting.findMany({
      where: { userId: link.userId },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { prompt: true, text: true, score: true, createdAt: true },
    }),
  ]);
  const practisedThisWeek = [...literacy.skills, ...numeracy.skills].filter((s) => s.attempts > 0).length;
  const name = link.user.name.split(/[\s,]+/).filter(Boolean)[0] ?? link.user.name;

  return (
    <main className="tutor-page">
      <div className="container tutor-narrow">
        <section className="tutor-hero" style={{ padding: "28px 0 8px" }}>
          <p className="gz-kicker">Progress report</p>
          <h1>{name}&rsquo;s reading &amp; maths</h1>
          <p className="tutor-muted">
            🔥 Current streak: {achievements.current} day{achievements.current === 1 ? "" : "s"} · Best: {achievements.longest} ·{" "}
            {achievements.badges.filter((b) => b.awardedAt).length} badges earned · {practisedThisWeek} skills practised so far
          </p>
        </section>
        {[literacy, numeracy].map((t) => {
          const meta = TRACKS[t.track as Track];
          const weak = t.skills.filter((s) => !s.mastered && s.accuracy !== null && s.accuracy < 60 && s.attempts >= 5);
          return (
            <div key={t.track} className="tutor-card">
              <h2 className="tutor-h2">
                {meta.emoji} {meta.title}: Stage {t.stage}
              </h2>
              <p>
                {t.mastered} of {t.total} skills mastered.{" "}
                {t.current ? (
                  <>
                    Working on <strong>{t.current.title}</strong>: {t.current.description.toLowerCase()}
                  </>
                ) : (
                  "Every skill mastered!"
                )}
              </p>
              <div className="tutor-progress">
                <span style={{ width: `${Math.round((t.mastered / t.total) * 100)}%` }} />
              </div>
              {weak.length > 0 && (
                <p className="tutor-muted" style={{ marginTop: 10 }}>
                  Could use extra help with: {weak.map((w) => w.title).join(", ")}.
                </p>
              )}
            </div>
          );
        })}
        {writing.length > 0 && (
          <div className="tutor-card">
            <h2 className="tutor-h2">✏️ Recent writing</h2>
            {writing.map((w) => (
              <div key={w.createdAt.toISOString()} className="tutor-writing-sample">
                <p className="tutor-muted">
                  {w.prompt} · {w.score}% · {new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Africa/Lagos" }).format(w.createdAt)}
                </p>
                <blockquote>{w.text}</blockquote>
              </div>
            ))}
          </div>
        )}
        <p className="tutor-muted" style={{ textAlign: "center", margin: "24px 0" }}>
          Mode Coders Club tutor · This private page was shared with you by {name}.
        </p>
      </div>
    </main>
  );
}
