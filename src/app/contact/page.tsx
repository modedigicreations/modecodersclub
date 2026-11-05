import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact us",
  description: "Get in touch with Mode Coders Club by phone or email.",
};

export default function ContactPage() {
  return (
    <main>
      <section className="catalog-hero">
        <div className="container">
          <p className="eyebrow"><span /> Get in touch</p>
          <h1>We&rsquo;d love<br /><span>to hear from you.</span></h1>
          <p>
            Questions about a course, a school partnership, or just want to
            say hello? Reach us directly below.
          </p>
        </div>
      </section>

      <section className="section catalog-section">
        <div className="container">
          <div className="pathway-cards" style={{ maxWidth: 640 }}>
            <article className="pathway-card">
              <span className="pathway-icon" aria-hidden="true">☎</span>
              <div>
                <p className="course-kicker">Call or WhatsApp</p>
                <h3>+234 806 518 0018</h3>
                <p>Mondays to Fridays, 9am&ndash;5pm WAT.</p>
                <a href="tel:+2348065180018">
                  Call now <span aria-hidden="true">→</span>
                </a>
              </div>
            </article>
            <article className="pathway-card pathway-school">
              <span className="pathway-icon" aria-hidden="true">✉</span>
              <div>
                <p className="course-kicker">Email</p>
                <h3>info@modecodersclub.com.ng</h3>
                <p>For course enquiries, school partnerships, and everything else.</p>
                <a href="mailto:info@modecodersclub.com.ng">
                  Send an email <span aria-hidden="true">→</span>
                </a>
              </div>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}
