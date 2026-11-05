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
    <>
      <header className="site-header">
        <div className="container header-inner">
          <Link className="brand" href="/" aria-label="Mode Coders Club home">
            <span className="brand-mark" aria-hidden="true">&lt;/&gt;</span>
            <span className="brand-name">MODE<span>CODERS CLUB</span></span>
          </Link>
          <nav className="main-nav" aria-label="Main navigation">
            <Link aria-current="page" href="/courses">Courses</Link>
            <Link href="/about">About the club</Link>
            <a href="mailto:info@modecodersclub.com.ng?subject=School%20partnership">For schools</a>
          </nav>
          <a className="button button-small button-dark" href="mailto:info@modecodersclub.com.ng?subject=Mode%20Coders%20Club%20membership">
            Get in touch <span aria-hidden="true">↗</span>
          </a>
        </div>
      </header>
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
                    <a href={`mailto:info@modecodersclub.com.ng?subject=${encodeURIComponent(`Course enquiry: ${course.name}`)}`}>
                      Ask about this course <span aria-hidden="true">↗</span>
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <footer className="site-footer">
        <div className="container footer-main">
          <Link className="brand brand-footer" href="/" aria-label="Mode Coders Club home">
            <span className="brand-mark" aria-hidden="true">&lt;/&gt;</span>
            <span className="brand-name">MODE<span>CODERS CLUB</span></span>
          </Link>
          <p>Empowering the future, one coder at a time.</p>
          <div className="footer-links">
            <Link href="/courses">Courses</Link>
            <Link href="/about">About</Link>
            <a href="mailto:info@modecodersclub.com.ng">Contact</a>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>© {new Date().getFullYear()} Mode Coders Club</span>
          <span>Learn with purpose. Build with care.</span>
        </div>
      </footer>
    </>
  );
}
