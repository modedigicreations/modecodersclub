import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import prisma from "@/lib/prisma";
import { stars } from "@/lib/reviews";
import { setReviewHidden } from "./actions";

export const metadata: Metadata = { title: "Course reviews" };

export default async function AdminReviewsPage() {
  await requireAdmin();
  const reviews = await prisma.courseReview.findMany({
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: {
      user: { select: { name: true, email: true } },
      course: { select: { name: true, slug: true } },
    },
  });

  return (
    <div>
      <div className="admin-header">
        <h1>Course reviews</h1>
      </div>
      <p style={{ color: "var(--muted)", maxWidth: 720, marginBottom: 20 }}>
        Learners who have finished at least one lesson can rate a course. Hidden reviews don&rsquo;t appear on the course
        page or count towards its average. The latest 100 are shown.
      </p>
      {reviews.length === 0 ? (
        <p className="admin-empty">No reviews yet.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Course</th>
              <th>Learner</th>
              <th>Review</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((r) => (
              <tr key={r.id}>
                <td>
                  <Link href={`/courses/${r.course.slug}`}>{r.course.name}</Link>
                </td>
                <td>
                  {r.user.name}
                  <br />
                  <span style={{ color: "var(--muted)", fontSize: 11 }}>{r.user.email}</span>
                </td>
                <td>
                  <span className="review-stars" aria-label={`${r.rating} out of 5 stars`}>{stars(r.rating)}</span>
                  {r.comment && (
                    <>
                      <br />
                      {r.comment}
                    </>
                  )}
                </td>
                <td>{r.hiddenAt ? "Hidden" : "Visible"}</td>
                <td>
                  <form action={setReviewHidden.bind(null, r.id, !r.hiddenAt)}>
                    <button type="submit">{r.hiddenAt ? "Show" : "Hide"}</button>
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
