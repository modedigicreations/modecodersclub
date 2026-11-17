import type { Metadata } from "next";
import Link from "next/link";
import { publishedPosts, readingMinutes, type TipTapNode } from "@/lib/blog";

export const instant = false;
export const metadata: Metadata = {
  title: "Blog",
  description: "News, project ideas and coding tips from Mode Coders Club.",
};

const PAGE = 12;
const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" });

export default async function BlogIndexPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: pageRaw } = await searchParams;
  const page = Math.max(1, Math.min(500, Number.parseInt(pageRaw ?? "1", 10) || 1));
  const posts = await publishedPosts(PAGE + 1, (page - 1) * PAGE);
  const hasMore = posts.length > PAGE;
  const [lead, ...rest] = posts.slice(0, PAGE);

  return (
    <main>
      <section className="catalog-hero">
        <div className="container">
          <p className="eyebrow"><span /> The club blog</p>
          <h1>Stories, tips<br /><span>&amp; things we built.</span></h1>
          <p>News from the club, project ideas to try, and the coding tricks our mentors swear by.</p>
        </div>
      </section>
      <section className="section catalog-section">
        <div className="container">
          {!lead ? (
            <p className="admin-empty">No posts yet. Check back soon!</p>
          ) : (
            <div className="blog-grid">
              {[lead, ...rest].map((post, i) => (
                <Link key={post.id} href={`/blog/${post.slug}`} className={`blog-card${i === 0 && page === 1 ? " blog-card-lead" : ""}`}>
                  {post.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- covers can be on any host
                    <img src={post.coverImageUrl} alt="" loading={i < 2 ? "eager" : "lazy"} referrerPolicy="no-referrer" />
                  ) : (
                    <div className="blog-card-art" aria-hidden="true">{"{ }"}</div>
                  )}
                  <div className="blog-card-body">
                    {post.tags.length > 0 && <p className="blog-tags">{post.tags.slice(0, 3).map((t) => `#${t}`).join("  ")}</p>}
                    <h2>{post.title}</h2>
                    <p>{post.excerpt}</p>
                    <p className="blog-meta">
                      {dateFmt.format(post.publishedAt!)} · {readingMinutes(post.content as TipTapNode)} min read
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
          {(page > 1 || hasMore) && (
            <p className="blog-pager">
              {page > 1 && <Link className="text-link" href={page === 2 ? "/blog" : `/blog?page=${page - 1}`}>← Newer posts</Link>}
              {hasMore && <Link className="text-link" href={`/blog?page=${page + 1}`}>Older posts →</Link>}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
