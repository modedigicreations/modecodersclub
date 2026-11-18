import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { TutorPromo } from "@/components/tutor/tutor-promo";
import { getTrackOverview } from "@/lib/tutor/service";
import { TRACKS } from "@/lib/tutor/skills";
import type { Track } from "@/lib/tutor/types";
import { getAchievements } from "@/lib/achievements";
import { ParentLinks } from "./parent-links";

export const instant = false;
export const metadata: Metadata = { title: "Reading & Maths Tutor" };

export default async function TutorHome({
  searchParams,
}: {
  searchParams: Promise<{ parentAdded?: string; parentError?: string }>;
}) {
  const session = await getSession();
  if (!session) {
    return (
      <main className="tutor-page">
        <section className="container tutor-public">
          <TutorPromo signedIn={false} />
        </section>
      </main>
    );
  }
  const { parentAdded, parentError } = await searchParams;
  const [literacy, numeracy, achievements] = await Promise.all([
    getTrackOverview(session.user.id, "literacy"),
    getTrackOverview(session.user.id, "numeracy"),
    getAchievements(session.user.id),
  ]);
  const first = session.user.name.split(/[\s,]+/).filter(Boolean)[0] ?? "there";

  return (
    <main className="tutor-page">
      <section className="tutor-hero">
        <div className="container">
          <p className="gz-kicker">Reading, writing &amp; maths tutor</p>
          <h1>Hi {first}! What shall we practise?</h1>
          <p className="tutor-muted">
            Short practice sessions that grow with you. Master a skill and the next one unlocks.
            {achievements.current > 0 && ` 🔥 ${achievements.current}-day streak!`}
          </p>
        </div>
      </section>
      <section className="container tutor-tracks">
        {[literacy, numeracy].map((t) => {
          const meta = TRACKS[t.track as Track];
          const started = Boolean(t.placement) || t.skills.some((s) => s.attempts > 0);
          const pct = Math.round((t.mastered / t.total) * 100);
          return (
            <article key={t.track} className={`tutor-track tutor-track-${t.track}`}>
              <div className="tutor-track-head">
                <span className="tutor-track-emoji" aria-hidden="true">{meta.emoji}</span>
                <div>
                  <h2>{meta.title}</h2>
                  <p>
                    Stage {t.stage} · {t.mastered} of {t.total} skills mastered
                    {t.reviewsDue > 0 && ` · ${t.reviewsDue} to review`}
                  </p>
                </div>
              </div>
              <div className="tutor-progress" aria-label={`${pct}% of skills mastered`}>
                <span style={{ width: `${pct}%` }} />
              </div>
              {t.current ? (
                <p className="tutor-next-skill">
                  Next up: <strong>{t.current.title}</strong>
                  <br />
                  <span>{t.current.description}</span>
                </p>
              ) : (
                <p className="tutor-next-skill">🏆 You&rsquo;ve mastered every skill. Keep them sharp with reviews!</p>
              )}
              <Link className="gz-btn gz-btn-primary" href={started ? `/tutor/${t.track}` : `/tutor/${t.track}/placement`}>
                {started ? "Continue →" : "Start →"}
              </Link>
              <details className="tutor-skillmap">
                <summary>See all {t.total} skills</summary>
                <ol>
                  {t.skills.map((s) => (
                    <li key={s.id} className={s.mastered ? "is-mastered" : s.id === t.current?.id ? "is-current" : ""}>
                      <span aria-hidden="true">{s.mastered ? (s.reviewDue ? "🔁" : "✅") : s.id === t.current?.id ? "▶️" : "⚪"}</span>
                      <span>
                        <strong>{s.title}</strong>
                        <small>
                          Stage {s.level}
                          {s.placed && s.attempts === 0 ? " · from placement" : ""}
                          {s.accuracy !== null ? ` · ${s.accuracy}% right` : ""}
                          {!s.mastered && s.percent > 0 ? ` · ${s.percent}% to mastery` : ""}
                        </small>
                      </span>
                    </li>
                  ))}
                </ol>
              </details>
            </article>
          );
        })}
      </section>
      <section className="container tutor-family">
        <ParentLinks added={Boolean(parentAdded)} error={parentError} />
      </section>
    </main>
  );
}
