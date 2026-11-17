import { requireAdmin } from "@/lib/session";
import type { Metadata } from "next";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { COURSE_GENERATE_MODEL, COURSE_GENERATE_PRICE_PER_MTOK } from "@/lib/anthropic";
import { DAILY_JOB_LIMIT, LESSON_MAX, LESSON_MIN, failStaleJobs } from "@/lib/course-generator/run";
import { publishCourseDraft, startCourseGeneration } from "./actions";
import { AutoRefresh } from "./auto-refresh";

export const metadata: Metadata = { title: "AI course generator" };

function approxCost(input: number, output: number) {
  const usd =
    (input * COURSE_GENERATE_PRICE_PER_MTOK.input + output * COURSE_GENERATE_PRICE_PER_MTOK.output) / 1_000_000;
  return usd > 0 ? `approx. $${usd.toFixed(2)}` : "";
}

const STATUS_LABEL: Record<string, string> = {
  queued: "Queued",
  running: "Generating…",
  succeeded: "Done",
  failed: "Failed",
};

export default async function CourseGeneratorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; started?: string; published?: string }>;
}) {
  // Every admin page checks itself: the layout's check alone doesn't stop this
  // page rendering (layouts and pages render in parallel), which leaked admin data.
  await requireAdmin();
  const { error, started, published } = await searchParams;
  await failStaleJobs();
  const jobs = await prisma.courseGenerationJob.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      createdBy: { select: { name: true } },
      course: { select: { id: true, name: true, isDraft: true, _count: { select: { lessons: true } } } },
    },
  });
  const active = jobs.some((j) => j.status === "queued" || j.status === "running");
  const keyConfigured = Boolean(process.env.ANTHROPIC_API_KEY);

  return (
    <div>
      <AutoRefresh active={active} />
      <div className="admin-header">
        <h1>AI course generator</h1>
      </div>
      <p style={{ color: "var(--muted)", maxWidth: 720, marginBottom: 20 }}>
        A-EduNet plans a course from your brief, writes every lesson with a quiz (and browser coding labs where they fit),
        and saves it as a <strong>draft</strong>: hidden from the catalogue and closed to enrolments until you review it and
        press Publish. Every course also has a downloadable PDF handbook. Uses {COURSE_GENERATE_MODEL}; up to{" "}
        {DAILY_JOB_LIMIT} courses per admin per day.
      </p>

      {error && <p className="auth-error">{error}</p>}
      {started && !error && (
        <p className="auth-success">
          Generation started. This page updates as lessons are written (usually a few minutes).
        </p>
      )}
      {published && <p className="auth-success">Course published. It&rsquo;s now in the catalogue and open to enrolments.</p>}
      {!keyConfigured && (
        <p className="auth-error">ANTHROPIC_API_KEY isn&rsquo;t set on the server, so generation is switched off.</p>
      )}

      <form className="admin-form" action={startCourseGeneration}>
        <label>
          Course topic *
          <textarea
            name="topic"
            required
            minLength={3}
            maxLength={300}
            rows={2}
            placeholder="e.g. Build your first website with HTML, CSS and JavaScript"
          />
        </label>
        <label>
          Who it&rsquo;s for
          <input name="audience" maxLength={300} placeholder="e.g. Secondary-school students with no coding experience" />
        </label>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <label>
            Level
            <select name="level" defaultValue="Beginner">
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Advanced</option>
            </select>
          </label>
          <label>
            Number of lessons
            <input name="lessons" type="number" min={LESSON_MIN} max={LESSON_MAX} defaultValue={10} />
          </label>
          <label>
            Price (display text)
            <input name="price" maxLength={80} defaultValue="Included with subscription" />
          </label>
        </div>
        <label className="admin-checkbox">
          <input type="checkbox" name="includeLabs" defaultChecked /> Add browser coding labs where they fit (HTML, CSS,
          JavaScript)
        </label>
        <label className="admin-checkbox">
          <input type="checkbox" name="isFree" /> Free course (otherwise it needs an active subscription)
        </label>
        <label className="admin-checkbox">
          <input type="checkbox" name="autoPublish" /> Publish automatically when finished (skips your review; leave off
          unless you trust the topic)
        </label>
        <button type="submit" className="button button-primary" disabled={!keyConfigured || active}>
          {active ? "A course is being generated…" : "Generate course"}
        </button>
      </form>

      <h2 style={{ fontSize: 16, margin: "28px 0 12px" }}>Recent runs</h2>
      {jobs.length === 0 ? (
        <p className="admin-empty">No courses generated yet.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Brief</th>
              <th>Status</th>
              <th>Course</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => {
              const cost = approxCost(job.inputTokens, job.outputTokens);
              return (
                <tr key={job.id}>
                  <td>
                    <strong>{job.topic}</strong>
                    <br />
                    <span style={{ color: "var(--muted)", fontSize: 11 }}>
                      {job.level} · {job.lessonTarget} lessons{job.autoPublish ? " · auto-publish" : ""} · by{" "}
                      {job.createdBy.name} · {job.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                    </span>
                  </td>
                  <td>
                    <strong>{STATUS_LABEL[job.status] ?? job.status}</strong>
                    <br />
                    <span style={{ color: "var(--muted)", fontSize: 11 }}>
                      {job.status === "running" && job.lessonsTotal > 0
                        ? `${job.lessonsDone} of ${job.lessonsTotal} lessons · ${job.stage}`
                        : job.stage}
                      {cost ? ` · ${cost}` : ""}
                    </span>
                    {job.error && (
                      <>
                        <br />
                        <span style={{ color: "#b42318", fontSize: 11 }}>{job.error}</span>
                      </>
                    )}
                  </td>
                  <td>
                    {job.course ? (
                      <>
                        {job.course.name}
                        <br />
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: job.course.isDraft ? "#7a4b00" : "var(--green-dark)",
                          }}
                        >
                          {job.course.isDraft ? "Draft (hidden)" : "Published"} · {job.course._count.lessons} lessons
                        </span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    {job.course && (
                      <div className="admin-actions">
                        <Link href={`/instructor/courses/${job.course.id}`}>Review lessons</Link>
                        <Link href={`/admin/courses/${job.course.id}`}>Edit details</Link>
                        <a href={`/api/courses/${job.course.id}/handbook`}>Handbook PDF</a>
                        {job.course.isDraft && (
                          <form action={publishCourseDraft.bind(null, job.course.id)}>
                            <button type="submit">Publish</button>
                          </form>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
