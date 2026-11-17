import Link from "next/link";
import prisma from "@/lib/prisma";
import { testimonials } from "@/lib/testimonials";
import { publishedPosts } from "@/lib/blog";

// Featured courses and posts come straight from the DB on every request so
// a course or post added in /admin shows up immediately; see /courses.
export const instant = false;

const stack = ["HTML", "CSS", "JavaScript", "Python", "Java", "React", "Data & AI", "UI design", "Git", "SQL"];

const perks = [
  {
    icon: "🧪",
    title: "Labs that check your code",
    text: "Write real HTML, CSS and JS in the browser and hit “Check my work”. Instant ✓ or a nudge on what's missing.",
    className: "perk-lab",
  },
  {
    icon: "🔥",
    title: "Streaks & badges",
    text: "Show up, keep the fire going, unlock badges like Lab rat and Week warrior.",
    className: "perk-streak",
  },
  {
    icon: "🎓",
    title: "Certificates anyone can verify",
    text: "Finish a course and your certificate drops automatically, with a link you can share.",
    className: "perk-cert",
  },
  {
    icon: "📴",
    title: "Learn offline",
    text: "Save course handbooks to your phone. Bad network? No wahala.",
    className: "perk-offline",
  },
  {
    icon: "💡",
    title: "Hints when you're stuck",
    text: "AI hints that point you the right way without handing over the answer.",
    className: "perk-hints",
  },
  {
    icon: "🤝",
    title: "A crew, not just a course",
    text: "Weekly community threads, mentors who answer, and people building alongside you.",
    className: "perk-crew",
  },
];

const steps = [
  { n: "01", title: "Join the club", text: "Make a free account in under a minute." },
  { n: "02", title: "Pick a path & build", text: "Short lessons, quick quizzes, real projects." },
  { n: "03", title: "Get certified, flex it", text: "Earn a certificate and badges you can show off." },
];

const COURSE_GRADIENTS: Record<string, string> = {
  blue: "grad-blue",
  green: "grad-green",
  mint: "grad-green",
  orange: "grad-orange",
  purple: "grad-purple",
  lavender: "grad-purple",
  teal: "grad-green",
  pink: "grad-pink",
  yellow: "grad-orange",
};

export default async function Home() {
  const [featuredCourses, posts] = await Promise.all([
    prisma.course.findMany({
      where: { archivedAt: null, isDraft: false },
      orderBy: { order: "asc" },
      take: 3,
    }),
    publishedPosts(3),
  ]);

  return (
    <main className="home">
      {/* ---------- Hero ---------- */}
      <section className="gz-hero">
        <div className="gz-blob gz-blob-a" aria-hidden="true" />
        <div className="gz-blob gz-blob-b" aria-hidden="true" />
        <div className="gz-blob gz-blob-c" aria-hidden="true" />
        <div className="container gz-hero-grid">
          <div className="gz-hero-copy">
            <p className="gz-pill">
              <span className="gz-dot" aria-hidden="true" /> New: streaks, badges &amp; auto-graded labs
            </p>
            <h1>
              Learn to code.
              <br />
              Build <span className="gz-gradient-text">cool stuff.</span>
              <br />
              Flex it. <span aria-hidden="true">✨</span>
            </h1>
            <p className="gz-lead">
              Mode Coders Club is where curious minds go from &ldquo;what if?&rdquo; to &ldquo;I built that&rdquo;: real
              projects, a crew that has your back, and certificates you can actually show people.
            </p>
            <div className="gz-actions">
              <Link className="gz-btn gz-btn-primary" href="/register">
                Start free <span aria-hidden="true">→</span>
              </Link>
              <Link className="gz-btn gz-btn-ghost" href="/courses">
                Browse courses
              </Link>
            </div>
            <ul className="gz-proof" aria-label="Why learners join">
              <li><strong>Beginner</strong> friendly</li>
              <li><strong>Real</strong> projects</li>
              <li><strong>Verified</strong> certificates</li>
            </ul>
          </div>

          <div className="gz-hero-art" aria-hidden="true">
            <div className="gz-window">
              <div className="gz-window-bar">
                <span /><span /><span />
                <b>my-first-site.html</b>
              </div>
              <pre className="gz-code">
                <span className="c-tag">&lt;h1&gt;</span>Welcome to my page<span className="c-tag">&lt;/h1&gt;</span>
                {"\n"}<span className="c-tag">&lt;ul&gt;</span>
                {"\n  "}<span className="c-tag">&lt;li&gt;</span>Coding<span className="c-tag">&lt;/li&gt;</span>
                {"\n  "}<span className="c-tag">&lt;li&gt;</span>Football<span className="c-tag">&lt;/li&gt;</span>
                {"\n  "}<span className="c-tag">&lt;li&gt;</span>Afrobeats<span className="c-tag">&lt;/li&gt;</span>
                {"\n"}<span className="c-tag">&lt;/ul&gt;</span>
              </pre>
              <div className="gz-checks">
                <p><span>✓</span> Add a Welcome heading</p>
                <p><span>✓</span> List three hobbies</p>
                <p><span>✓</span> Give the page some colour</p>
              </div>
            </div>
            <div className="gz-float gz-float-streak">
              <span className="gz-float-icon">🔥</span>
              <div>
                <strong>7-day streak</strong>
                <small>Keep it going!</small>
              </div>
            </div>
            <div className="gz-float gz-float-badge">
              <span className="gz-float-icon">🧪</span>
              <div>
                <small>Badge unlocked</small>
                <strong>Lab rat</strong>
              </div>
            </div>
            <div className="gz-float gz-float-cert">
              <span className="gz-float-icon">🎓</span>
              <div>
                <strong>Certificate ready</strong>
                <small>Web Basics · verified</small>
              </div>
            </div>
          </div>
        </div>

        <div className="gz-marquee" aria-hidden="true">
          <div className="gz-marquee-track">
            {[...stack, ...stack].map((s, i) => (
              <span key={i}>{s} <b>✦</b></span>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Courses ---------- */}
      <section className="gz-section">
        <div className="container">
          <div className="gz-heading">
            <div>
              <p className="gz-kicker">Pick your path</p>
              <h2>Curiosity is a <span className="gz-gradient-text">great first skill.</span></h2>
            </div>
            <Link className="gz-link" href="/courses">See all courses →</Link>
          </div>
          <div className="gz-course-grid">
            {featuredCourses.map((course) => (
              <Link className="gz-course" href={`/courses/${course.slug}`} key={course.id}>
                <div className={`gz-course-art ${COURSE_GRADIENTS[course.color] ?? "grad-purple"}`}>
                  <span className="gz-course-glyph" aria-hidden="true">{course.icon}</span>
                  <span className="gz-course-tag">{course.category}</span>
                </div>
                <div className="gz-course-body">
                  <h3>{course.name}</h3>
                  <p>{course.description}</p>
                  <div className="gz-course-foot">
                    <span className="gz-chip">{course.price}</span>
                    <span className="gz-course-go" aria-hidden="true">↗</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Perks (bento) ---------- */}
      <section className="gz-section gz-dark" id="how-we-learn">
        <div className="container">
          <div className="gz-heading">
            <div>
              <p className="gz-kicker">What you get</p>
              <h2>Built for how <span className="gz-gradient-text">you</span> learn.</h2>
            </div>
            <p className="gz-heading-note">No boring lectures. Short lessons, quick wins, and stuff you can show your friends.</p>
          </div>
          <div className="gz-bento">
            {perks.map((perk) => (
              <article className={`gz-perk ${perk.className}`} key={perk.title}>
                <span className="gz-perk-icon" aria-hidden="true">{perk.icon}</span>
                <h3>{perk.title}</h3>
                <p>{perk.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Steps ---------- */}
      <section className="gz-section">
        <div className="container">
          <div className="gz-heading">
            <div>
              <p className="gz-kicker">How it works</p>
              <h2>Three steps. <span className="gz-gradient-text">Zero stress.</span></h2>
            </div>
          </div>
          <ol className="gz-steps">
            {steps.map((step) => (
              <li key={step.n}>
                <span className="gz-step-n">{step.n}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- Testimonials ---------- */}
      <section className="gz-section gz-soft">
        <div className="container">
          <div className="gz-heading">
            <div>
              <p className="gz-kicker">The reviews are in</p>
              <h2>Don&rsquo;t take our word. <span className="gz-gradient-text">Take theirs.</span></h2>
            </div>
            <p className="gz-heading-note">Swipe for more →</p>
          </div>
          <div className="gz-reviews" tabIndex={0} aria-label="Learner reviews">
            {testimonials.map((t) => (
              <figure className="gz-review" key={t.name}>
                <p className="gz-stars" aria-label={`${t.rating} out of 5 stars`}>
                  {"★".repeat(Math.round(t.rating))}
                  {"☆".repeat(5 - Math.round(t.rating))}
                </p>
                <blockquote>&ldquo;{t.quote}&rdquo;</blockquote>
                <figcaption>
                  <span className="gz-avatar" aria-hidden="true">{t.name.charAt(0)}</span>
                  {t.name}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Blog ---------- */}
      {posts.length > 0 && (
        <section className="gz-section">
          <div className="container">
            <div className="gz-heading">
              <div>
                <p className="gz-kicker">Fresh from the blog</p>
                <h2>Tips, news &amp; <span className="gz-gradient-text">things we built.</span></h2>
              </div>
              <Link className="gz-link" href="/blog">Read the blog →</Link>
            </div>
            <div className="gz-posts">
              {posts.map((post) => (
                <Link className="gz-post" href={`/blog/${post.slug}`} key={post.id}>
                  {post.tags[0] && <span className="gz-chip">#{post.tags[0]}</span>}
                  <h3>{post.title}</h3>
                  <p>{post.excerpt}</p>
                  <span className="gz-link">Read →</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------- Families & schools ---------- */}
      <section className="gz-section">
        <div className="container gz-duo">
          <article className="gz-duo-card">
            <p className="gz-kicker">For parents &amp; families</p>
            <h3>Screen time that builds skills.</h3>
            <p>Track progress, celebrate certificates, and watch them make things they&rsquo;re proud of.</p>
            <Link className="gz-link" href="/contact">Ask about membership →</Link>
          </article>
          <article className="gz-duo-card gz-duo-school">
            <p className="gz-kicker">For schools &amp; educators</p>
            <h3>Bring the club to your school.</h3>
            <p>School cohorts, workshops and a progress dashboard for every class.</p>
            <Link className="gz-link" href="/contact">Start a conversation →</Link>
          </article>
        </div>
      </section>

      {/* ---------- Closing ---------- */}
      <section className="gz-closing">
        <div className="gz-blob gz-blob-a" aria-hidden="true" />
        <div className="gz-blob gz-blob-c" aria-hidden="true" />
        <div className="container gz-closing-inner">
          <h2>
            Your next idea
            <br />
            <span className="gz-gradient-text">starts today.</span>
          </h2>
          <p>Free to join. Learn at your own pace. Build things that matter.</p>
          <div className="gz-actions">
            <Link className="gz-btn gz-btn-primary" href="/register">
              Join the club <span aria-hidden="true">→</span>
            </Link>
            <Link className="gz-btn gz-btn-ghost" href="/contact">
              Talk to us
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
