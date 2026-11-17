import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { readingMinutes, type TipTapNode } from "@/lib/blog";
import { BlogContent } from "@/lib/blog-render";

export const instant = false;

type Props = { params: Promise<{ slug: string }> };

function findPost(slug: string) {
  return prisma.blogPost.findFirst({
    where: { slug, publishedAt: { not: null } },
    include: { author: { select: { name: true } } },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await findPost((await params).slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      publishedTime: post.publishedAt!.toISOString(),
      ...(post.coverImageUrl ? { images: [post.coverImageUrl] } : {}),
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const post = await findPost((await params).slug);
  if (!post) notFound();
  const date = new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "Africa/Lagos" }).format(post.publishedAt!);

  return (
    <main>
      <article className="blog-article">
        <header>
          <p className="eyebrow"><span /> {post.tags[0] ? `#${post.tags[0]}` : "Club blog"}</p>
          <h1>{post.title}</h1>
          <p className="blog-meta">
            {post.author?.name ? `${post.author.name.split(" ")[0]} · ` : ""}
            {date} · {readingMinutes(post.content as TipTapNode)} min read
          </p>
        </header>
        {post.coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- covers can be on any host
          <img className="blog-cover" src={post.coverImageUrl} alt="" referrerPolicy="no-referrer" />
        )}
        <BlogContent doc={post.content} />
        {post.tags.length > 0 && <p className="blog-tags" style={{ marginTop: 32 }}>{post.tags.map((t) => `#${t}`).join("  ")}</p>}
        <div className="blog-cta">
          <p><strong>Want to build stuff like this?</strong> Our courses take you from zero to shipping real projects.</p>
          <Link className="button button-primary" href="/courses">Explore courses <span aria-hidden="true">→</span></Link>
        </div>
        <p style={{ marginTop: 32 }}>
          <Link className="text-link text-link-back" href="/blog"><span aria-hidden="true">←</span> All posts</Link>
        </p>
      </article>
    </main>
  );
}
