import Link from "next/link";
import prisma from "@/lib/prisma";
import { testimonials } from "@/lib/testimonials";

// Featured courses come straight from the DB on every request (no caching)
// so a course added in /admin shows up immediately, not just after the
// cache expires — that's deliberate, not an oversight; see /courses.
export const instant = false;

const clubValues = [
  {
    number: "01",
    title: "Learn by making",
    description: "Turn new concepts into useful projects, one small step at a time.",
  },
  {
    number: "02",
    title: "Grow together",
    description: "Learn alongside peers and get guidance from experienced mentors.",
  },
  {
    number: "03",
    title: "Make an impact",
    description: "Build skills that help you contribute to your school and community.",
  },
];

export default async function Home() {
  const featuredCourses = await prisma.course.findMany({
    where: { archivedAt: null },
    orderBy: { order: "asc" },
    take: 3,
  });

  return (
    <main>
        <section className="hero">
          <div className="container hero-grid">
            <div className="hero-copy">
              <p className="eyebrow"><span /> Learn. Build. Belong.</p>
              <h1>
                Your ideas
                <br />
                deserve to
                <br />
                <span>be built.</span>
              </h1>
              <p className="hero-description">
                Mode Coders Club is a welcoming place for young learners and
                curious minds to explore technology, make real projects, and
                grow together.
              </p>
              <div className="hero-actions">
                <Link className="button button-primary" href="/courses">
                  Explore courses <span aria-hidden="true">→</span>
                </Link>
                <a className="text-link" href="#how-we-learn">
                  Discover the club <span aria-hidden="true">↓</span>
                </a>
              </div>
              <div className="hero-note">
                <span className="note-icon" aria-hidden="true">✳</span>
                <p>
                  From first lines of code to bigger ideas,
                  <strong> there’s a place for you here.</strong>
                </p>
              </div>
            </div>

            <div className="hero-art" aria-label="A playful illustration of coding">
              <div className="art-orbit orbit-one" />
              <div className="art-orbit orbit-two" />
              <div className="art-sun" />
              <div className="art-window">
                <div className="window-bar">
                  <span />
                  <span />
                  <span />
                  <b>your-next-idea.js</b>
                </div>
                <div className="code-lines" aria-hidden="true">
                  <p><i>01</i><span className="code-purple">const</span> idea = <span className="code-green">&quot;what if?&quot;</span>;</p>
                  <p><i>02</i></p>
                  <p><i>03</i><span className="code-purple">function</span> <span className="code-yellow">buildSomething</span>() {"{"}</p>
                  <p><i>04</i>&nbsp;&nbsp;learn();</p>
                  <p><i>05</i>&nbsp;&nbsp;tryAgain();</p>
                  <p><i>06</i>&nbsp;&nbsp;makeItReal();</p>
                  <p><i>07</i>{"}"}</p>
                  <p><i>08</i></p>
                  <p><i>09</i><span className="code-muted">{"// your journey starts here"}</span></p>
                  <p><i>10</i><span className="code-cursor" /></p>
                </div>
              </div>
              <div className="art-sticker sticker-top">MAKE<br />SOMETHING<br />MATTER<span>✳</span></div>
              <div className="art-sticker sticker-bottom"><span>✦</span> BUILT BY<br />CURIOUS MINDS</div>
              <span className="art-spark spark-one" aria-hidden="true">✳</span>
              <span className="art-spark spark-two" aria-hidden="true">✦</span>
            </div>
          </div>
          <div className="hero-marquee" aria-hidden="true">
            <div className="marquee-track">
              <span>CODE WITH PURPOSE</span><b>✳</b><span>LEARN BY DOING</span><b>✳</b>
              <span>BUILD TOGETHER</span><b>✳</b><span>CODE WITH PURPOSE</span><b>✳</b>
              <span>LEARN BY DOING</span><b>✳</b><span>BUILD TOGETHER</span><b>✳</b>
            </div>
          </div>
        </section>

        <section className="section courses-section" id="courses">
          <div className="container">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Find your starting point</p>
                <h2>Curiosity is a<br /><span>great first skill.</span></h2>
              </div>
              <div className="section-intro">
                <p>
                  Explore practical learning paths across programming, web
                  development, design, and data. Start with what interests you;
                  keep building from there.
                </p>
                <Link className="text-link" href="/courses">
                  See all courses <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
            <div className="course-grid">
              {featuredCourses.map((course) => (
                <article className="course-card" id={course.slug} key={course.name}>
                  <div className={`course-art ${course.color}`}>
                    <span className="course-glyph" aria-hidden="true">{course.icon}</span>
                    <span className="course-orbit" aria-hidden="true" />
                    <span className="course-label">{course.category}</span>
                  </div>
                  <div className="course-content">
                    <p className="course-kicker">A learning path</p>
                    <span className="price-badge">{course.price}</span>
                    <h3>{course.name}</h3>
                    <p>{course.description}</p>
                    <Link href={`/courses/${course.slug}`} aria-label={`Learn about ${course.name}`}>
                      Explore course <span aria-hidden="true">↗</span>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section community-section" id="how-we-learn">
          <div className="container community-grid">
            <div className="community-copy">
              <p className="eyebrow eyebrow-light">More than a course</p>
              <h2>A club for<br />the <span>doers.</span></h2>
              <p>
                Great coders aren’t made by watching alone. They grow by
                asking questions, sharing ideas, and working through real
                challenges with others.
              </p>
              <Link className="button button-light" href="/about">
                Get to know us <span aria-hidden="true">→</span>
              </Link>
            </div>
            <div className="values-list">
              {clubValues.map((value) => (
                <article className="value-row" key={value.number}>
                  <span className="value-number">{value.number}</span>
                  <div>
                    <h3>{value.title}</h3>
                    <p>{value.description}</p>
                  </div>
                  <span className="value-arrow" aria-hidden="true">↗</span>
                </article>
              ))}
            </div>
            <span className="community-decoration" aria-hidden="true">&lt; / &gt;</span>
          </div>
        </section>

        <section className="section testimonials-section">
          <div className="container">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Our students</p>
                <h2>Still deciding?<br /><span>Hear from them.</span></h2>
              </div>
              <div className="section-intro">
                <p>
                  We&rsquo;re still a growing club, but here&rsquo;s what
                  members already say about learning with us.
                </p>
              </div>
            </div>
            <div className="testimonial-grid">
              {testimonials.map((testimonial) => (
                <article className="testimonial-card" key={testimonial.name}>
                  <p className="testimonial-rating" aria-label={`${testimonial.rating} out of 5 stars`}>
                    {"★".repeat(Math.round(testimonial.rating))}
                    {"☆".repeat(5 - Math.round(testimonial.rating))}
                  </p>
                  <p className="testimonial-quote">&ldquo;{testimonial.quote}&rdquo;</p>
                  <p className="testimonial-name">{testimonial.name}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section pathways-section">
          <div className="container pathways-grid">
            <div>
              <p className="eyebrow">Learning together, wherever you are</p>
              <h2>Good things happen<br />when we <span>team up.</span></h2>
            </div>
            <div className="pathway-cards">
              <article className="pathway-card">
                <span className="pathway-icon" aria-hidden="true">⌘</span>
                <div>
                  <p className="course-kicker">For learners & families</p>
                  <h3>Find your next step</h3>
                  <p>Explore coding, meet your community, and make something you’re proud of.</p>
                </div>
                <a href="mailto:info@modecodersclub.com.ng?subject=Learner%20membership">
                  Ask about membership <span aria-hidden="true">→</span>
                </a>
              </article>
              <article className="pathway-card pathway-school">
                <span className="pathway-icon" aria-hidden="true">⌂</span>
                <div>
                  <p className="course-kicker">For schools & educators</p>
                  <h3>Bring coding to your school</h3>
                  <p>Talk to us about school cohorts, workshops, and learning resources.</p>
                </div>
                <a href="mailto:info@modecodersclub.com.ng?subject=School%20partnership">
                  Start a conversation <span aria-hidden="true">→</span>
                </a>
              </article>
            </div>
          </div>
        </section>

        <section className="closing-section">
          <div className="container closing-inner">
            <div>
              <p className="eyebrow eyebrow-light">The next idea could be yours</p>
              <h2>Let’s make<br />something <span>real.</span></h2>
            </div>
            <a
              className="button button-light"
              href="mailto:info@modecodersclub.com.ng?subject=Mode%20Coders%20Club"
            >
              Talk to the club <span aria-hidden="true">↗</span>
            </a>
            <span className="closing-star" aria-hidden="true">✳</span>
          </div>
        </section>
    </main>
  );
}
