import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About the club",
  description:
    "Discover the Mode Coders Club community: practical workshops, collaborative projects, coding challenges, and tech talks.",
};

const activities = [
  {
    number: "01",
    title: "Hands-on workshops",
    description: "Explore coding concepts through guided practice and real-world examples.",
  },
  {
    number: "02",
    title: "Project collaboration",
    description: "Work with others, learn through iteration, and build a portfolio of projects.",
  },
  {
    number: "03",
    title: "Challenges and hackathons",
    description: "Practice problem-solving in a supportive, creative environment.",
  },
  {
    number: "04",
    title: "Tech talks and networking",
    description: "Hear new perspectives and connect with people across the tech community.",
  },
];

export default function AboutPage() {
  return (
    <>
      <header className="site-header">
        <div className="container header-inner">
          <Link className="brand" href="/" aria-label="Mode Coders Club home">
            <span className="brand-mark" aria-hidden="true">&lt;/&gt;</span>
            <span className="brand-name">MODE<span>CODERS CLUB</span></span>
          </Link>
          <nav className="main-nav" aria-label="Main navigation">
            <Link href="/courses">Courses</Link>
            <Link aria-current="page" href="/about">About the club</Link>
            <a href="mailto:info@modecodersclub.com.ng?subject=School%20partnership">For schools</a>
          </nav>
          <a className="button button-small button-dark" href="mailto:info@modecodersclub.com.ng?subject=Mode%20Coders%20Club%20membership">
            Get in touch <span aria-hidden="true">↗</span>
          </a>
        </div>
      </header>
      <main>
        <section className="catalog-hero about-hero">
          <div className="container">
            <p className="eyebrow"><span /> Our community</p>
            <h1>Curious minds.<br /><span>Shared progress.</span></h1>
            <p>
              Mode Coders Club brings learners and technology enthusiasts
              together to discover, create, and support each other’s growth.
              No matter where your coding journey begins, there’s room to learn.
            </p>
          </div>
        </section>
        <section className="section activities-section">
          <div className="container">
            <div className="section-heading">
              <div>
                <p className="eyebrow">What we do</p>
                <h2>Make room<br />for <span>possibility.</span></h2>
              </div>
              <div className="section-intro">
                <p>
                  We believe the best way to learn technology is to participate
                  in it: ask questions, try things, share what works, and keep
                  making.
                </p>
              </div>
            </div>
            <div className="activity-grid">
              {activities.map((activity) => (
                <article className="activity-card" key={activity.number}>
                  <span>{activity.number}</span>
                  <h2>{activity.title}</h2>
                  <p>{activity.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className="community-section about-values">
          <div className="container about-values-inner">
            <p className="eyebrow eyebrow-light">What we believe</p>
            <h2>Build with curiosity.<br /><span>Grow with integrity.</span></h2>
            <p>
              We value excellence, innovation, collaboration, inclusion,
              ethical technology, and lifelong learning. We use our skills
              responsibly and make space for people to learn at their own pace.
            </p>
            <Link className="button button-light" href="/courses">
              Explore learning paths <span aria-hidden="true">→</span>
            </Link>
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
