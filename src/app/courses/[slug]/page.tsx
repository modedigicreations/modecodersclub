import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EnrolPanel } from "./enrol-panel";
import prisma from "@/lib/prisma";

type PageProps = {
  params: Promise<{ slug: string }>;
};

// Courses are admin-managed and change without a redeploy, so this route
// can't enumerate them at build time — it's a normal on-demand dynamic
// route instead of a prerendered one.
export const instant = false;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const course = await prisma.course.findFirst({ where: { slug, archivedAt: null, isDraft: false } });
  if (!course) return {};

  return {
    title: course.name,
    description: course.description,
  };
}

export default async function CourseDetailPage({
  params,
  searchParams,
}: PageProps & { searchParams: Promise<{ error?: string }> }) {
  const { slug } = await params;
  const { error } = await searchParams;
  const course = await prisma.course.findFirst({ where: { slug, archivedAt: null, isDraft: false } });
  if (!course) notFound();

  return (
    <main>
      <section className="catalog-hero">
        <div className="container">
          <div className="course-detail-hero">
            <div className={`course-detail-icon ${course.color}`} aria-hidden="true">
              {course.icon}
            </div>
            <div>
              <p className="eyebrow"><span /> {course.category}</p>
              <h1 style={{ fontSize: "clamp(34px, 4.6vw, 52px)" }}>{course.name}</h1>
            </div>
          </div>
          <p>{course.description}</p>
          <div className="course-detail-meta">
            <div>
              <p>Duration</p>
              <p>{course.duration}</p>
            </div>
            <div>
              <p>Price</p>
              <p>{course.price}</p>
            </div>
            <div>
              <p>Who it&rsquo;s for</p>
              <p>{course.audience}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section catalog-section">
        <div className="container">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{course.level}</p>
              <h2>What you&rsquo;ll<br /><span>walk away with.</span></h2>
            </div>
          </div>
          <ul className="outcomes-list">
            {course.outcomes.map((outcome) => (
              <li key={outcome}>{outcome}</li>
            ))}
          </ul>

          {error && <p className="auth-error" style={{ marginTop: 24 }}>{error}</p>}
          <Suspense fallback={<div className="course-detail-cta"><p>Loading enrolment options…</p></div>}>
            <EnrolPanel courseId={course.id} isFree={course.isFree} courseName={course.name} />
          </Suspense>
          <p style={{ marginTop: 16, color: "var(--muted)" }}>
            Still have questions? <Link className="text-link" href="/contact">Ask about this course</Link>.
          </p>

          <p style={{ marginTop: 40 }}>
            <Link className="text-link text-link-back" href="/courses">
              <span aria-hidden="true">←</span> Back to all courses
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
