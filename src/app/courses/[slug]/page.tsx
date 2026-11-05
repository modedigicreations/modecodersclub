import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { courses, getCourse } from "@/lib/courses";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return courses.map((course) => ({ slug: course.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const course = getCourse(slug);
  if (!course) return {};

  return {
    title: course.name,
    description: course.description,
  };
}

export default async function CourseDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const course = getCourse(slug);
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

          <div className="course-detail-cta">
            <p>
              Ready to start, or still have questions? We&rsquo;re happy to talk
              you through what the {course.name} path involves.
            </p>
            <a
              className="button button-primary"
              href={`mailto:info@modecodersclub.com.ng?subject=${encodeURIComponent(`Course enquiry: ${course.name}`)}`}
            >
              Ask about this course <span aria-hidden="true">↗</span>
            </a>
          </div>

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
