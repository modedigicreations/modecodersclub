import type { Metadata } from "next";
import Link from "next/link";
import { courses } from "@/lib/courses";

export const metadata: Metadata = {
  title: "Explore coding courses",
  description:
    "Explore Mode Coders Club learning paths in programming, web development, data science, cybersecurity, and design.",
};

export default function CoursesPage() {
  return (
    <main>
        <section className="catalog-hero">
          <div className="container">
            <p className="eyebrow"><span /> Find your starting point</p>
            <h1>Learn something.<br /><span>Make something.</span></h1>
            <p>
              Explore the learning paths Mode Coders Club offers. Choose a
              subject that sparks your interest and start growing your skills.
            </p>
          </div>
        </section>
        <section className="section catalog-section">
          <div className="container">
            <div className="catalog-heading">
              <p>{courses.length} learning paths</p>
              <p>Practical, project-minded learning for curious people.</p>
            </div>
            <div className="course-grid">
              {courses.map((course) => (
                <article className="course-card" id={course.slug} key={course.slug}>
                  <div className={`course-art ${course.color}`}>
                    <span className="course-glyph" aria-hidden="true">{course.icon}</span>
                    <span className="course-orbit" aria-hidden="true" />
                    <span className="course-label">{course.category}</span>
                  </div>
                  <div className="course-content">
                    <p className="course-kicker">{course.level}</p>
                    <h2>{course.name}</h2>
                    <p>{course.description}</p>
                    <Link href={`/courses/${course.slug}`}>
                      View course details <span aria-hidden="true">↗</span>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
    </main>
  );
}
