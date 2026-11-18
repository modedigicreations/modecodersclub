import Link from "next/link";
import { trackSkills } from "@/lib/tutor/skills";

const POINTS = [
  { icon: "🎯", title: "Starts at their level", text: "A quick check finds where each learner is, from first letters and counting to paragraphs and long division." },
  { icon: "🔊", title: "Reads aloud", text: "Every question can be read out, so younger learners can work on their own." },
  { icon: "🧑‍🏫", title: "Explains mistakes", text: "Wrong answers come with the right one and why, plus a friendly AI explanation when needed." },
  { icon: "🔁", title: "Remembers what you learn", text: "Mastered skills come back for quick reviews, so they stick." },
];

/** What the tutor is, for anyone (signed in or not, with or without a school plan). */
export function TutorPromo({ signedIn, compact = false }: { signedIn: boolean; compact?: boolean }) {
  const reading = trackSkills("literacy").length;
  const maths = trackSkills("numeracy").length;
  return (
    <div className={`tutor-promo${compact ? " is-compact" : ""}`}>
      <div className="tutor-promo-copy">
        <p className="gz-kicker">Free for every learner</p>
        <h2>
          Reading, writing &amp; maths tutor <span aria-hidden="true">📖🔢</span>
        </h2>
        <p>
          Short, fun practice that grows with you: {reading} reading &amp; writing skills and {maths} maths skills,
          for all ages.{" "}
          {signedIn ? "It's included with your account, so jump in any time." : "No school plan needed. Just create a free account and start."}
        </p>
        <div className="gz-actions">
          {signedIn ? (
            <Link className="gz-btn gz-btn-primary" href="/tutor">
              Open my tutor <span aria-hidden="true">→</span>
            </Link>
          ) : (
            <>
              <Link className="gz-btn gz-btn-primary" href="/register?next=%2Ftutor">
                Start free <span aria-hidden="true">→</span>
              </Link>
              <Link className="gz-btn tutor-btn-quiet" href="/login?next=%2Ftutor">
                I have an account
              </Link>
            </>
          )}
        </div>
      </div>
      {!compact && (
        <ul className="tutor-promo-points">
          {POINTS.map((p) => (
            <li key={p.title}>
              <span aria-hidden="true">{p.icon}</span>
              <div>
                <strong>{p.title}</strong>
                <p>{p.text}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
