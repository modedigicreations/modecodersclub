import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { canViewTutorReport, getTutorClassReport, tutorSchools } from "@/lib/tutor/class-report";

export const instant = false;
export const metadata: Metadata = { title: "Tutor progress" };

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Africa/Lagos" });

export default async function InstructorTutorPage({ searchParams }: { searchParams: Promise<{ school?: string; q?: string }> }) {
  const session = await requireUser();
  if (session.user.role !== "admin" && session.user.role !== "instructor") redirect("/");
  if (!(await canViewTutorReport(session.user))) {
    return (
      <main>
        <section className="section catalog-section">
          <div className="container">
            <h1>Reading &amp; maths tutor</h1>
            <p className="admin-empty">
              Learner progress is visible once an admin has assigned you to a course. Ask an admin to set this up.
            </p>
            <p style={{ marginTop: 24 }}>
              <Link className="text-link text-link-back" href="/instructor"><span aria-hidden="true">←</span> Back to courses</Link>
            </p>
          </div>
        </section>
      </main>
    );
  }
  const { school, q } = await searchParams;
  const [rows, schools] = await Promise.all([
    getTutorClassReport({ school: school || undefined, search: q?.trim().slice(0, 80) || undefined }),
    tutorSchools(),
  ]);
  const csvParams = new URLSearchParams();
  if (school) csvParams.set("school", school);
  if (q?.trim()) csvParams.set("q", q.trim().slice(0, 80));
  const csvHref = `/api/instructor/tutor/progress${csvParams.size ? `?${csvParams}` : ""}`;

  return (
    <main>
      <section className="catalog-hero">
        <div className="container">
          <p className="eyebrow"><span /> Instructor workspace</p>
          <h1>Reading &amp; maths tutor.</h1>
          <p>Each learner&rsquo;s stage, what they&rsquo;re working on, and where they need help.</p>
        </div>
      </section>
      <section className="section catalog-section">
        <div className="container">
          <form className="tutor-input-row" style={{ marginBottom: 18 }}>
            <select name="school" defaultValue={school ?? ""} className="tutor-input" style={{ fontSize: 16, minHeight: 48 }} aria-label="School">
              <option value="">All learners</option>
              {schools.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <input name="q" defaultValue={q ?? ""} placeholder="Search name or email" className="tutor-input" style={{ fontSize: 16, minHeight: 48 }} />
            <button type="submit" className="button button-primary">Filter</button>
            <a className="text-link" href={csvHref} style={{ alignSelf: "center" }}>Download CSV ↓</a>
          </form>
          {rows.length === 0 ? (
            <p className="admin-empty">No learners have used the tutor yet{school ? " at this school" : ""}.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Learner</th>
                    <th>📖 Reading</th>
                    <th>🔢 Maths</th>
                    <th>Needs help with</th>
                    <th>Writing</th>
                    <th>Last practised</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.userId}>
                      <td>
                        <strong>{r.name}</strong>
                        <br />
                        <span style={{ color: "var(--muted)", fontSize: 11 }}>{r.email}{r.school ? ` · ${r.school}` : ""}</span>
                      </td>
                      <td>
                        Stage {r.reading.stage} · {r.reading.mastered}/{r.reading.total}
                        <br />
                        <span style={{ color: "var(--muted)", fontSize: 11 }}>{r.reading.current ?? "All mastered"}</span>
                      </td>
                      <td>
                        Stage {r.maths.stage} · {r.maths.mastered}/{r.maths.total}
                        <br />
                        <span style={{ color: "var(--muted)", fontSize: 11 }}>{r.maths.current ?? "All mastered"}</span>
                      </td>
                      <td>{r.needsHelp.length ? r.needsHelp.join(", ") : "—"}</td>
                      <td>{r.writingAverage === null ? "—" : `${r.writingAverage}%`}</td>
                      <td>{r.lastPractised ? dateFmt.format(r.lastPractised) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p style={{ marginTop: 24 }}>
            <Link className="text-link text-link-back" href="/instructor"><span aria-hidden="true">←</span> Back to courses</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
