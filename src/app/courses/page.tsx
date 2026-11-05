import type { Metadata } from "next";
import Link from "next/link";
import prisma from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Explore coding courses",
  description:
    "Explore Mode Coders Club learning paths in programming, web development, data science, cybersecurity, and design.",
};

// Reads the DB directly on every request (no caching) so a course added in
// /admin shows up immediately instead of waiting out a cache window.
export const instant = false;

export default async function CoursesPage() {
  const [courses, freeResources] = await Promise.all([
    prisma.course.findMany({ where: { archivedAt: null }, orderBy: { order: "asc" } }),
    prisma.freeResource.findMany({ where: { archivedAt: null }, orderBy: { order: "asc" } }),
  ]);

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
                    <span className="price-badge">{course.price}</span>
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

        <section className="section catalog-section resources-section">
          <div className="container">
            <div className="catalog-heading">
              <p>{freeResources.length} free resources</p>
              <p>Quick skills checks and software basics — no subscription needed.</p>
            </div>
            <div className="resource-grid">
              {freeResources.map((resource) => (
                <article className="resource-card" key={resource.slug}>
                  <div className={`resource-icon ${resource.color}`} aria-hidden="true">
                    {resource.icon}
                  </div>
                  <div>
                    <div className="resource-card-heading">
                      <p className="course-kicker">{resource.category}</p>
                      <span className="price-badge is-free">Free</span>
                    </div>
                    <h3>{resource.name}</h3>
                    <p>{resource.description}</p>
                    <div className="resource-card-footer">
                      <span>{resource.time}</span>
                      <a
                        href={`mailto:info@modecodersclub.com.ng?subject=${encodeURIComponent(`Enquiry: ${resource.name}`)}`}
                      >
                        Ask about this <span aria-hidden="true">↗</span>
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
    </main>
  );
}
