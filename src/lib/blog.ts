import prisma from "@/lib/prisma";
import { slugify } from "@/lib/course-generator/clamp";

export const BLOG_TITLE_MAX = 160;
export const BLOG_EXCERPT_MAX = 300;
export const BLOG_CONTENT_MAX_BYTES = 300_000;
export const BLOG_TAGS_MAX = 8;

/** Minimal TipTap JSON node shape. */
export type TipTapNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type?: string; attrs?: Record<string, unknown> }[];
  content?: TipTapNode[];
};

export const EMPTY_DOC: TipTapNode = { type: "doc", content: [{ type: "paragraph" }] };

/** Parses editor JSON from a form field. Returns null if it isn't a TipTap document. */
export function parseContent(raw: unknown): TipTapNode | null {
  if (typeof raw !== "string" || raw.length > BLOG_CONTENT_MAX_BYTES) return null;
  try {
    const doc = JSON.parse(raw) as TipTapNode;
    return doc && typeof doc === "object" && doc.type === "doc" ? doc : null;
  } catch {
    return null;
  }
}

/** All the text in a document, for excerpts, reading time and "is it empty?". */
export function plainText(node: TipTapNode | null | undefined): string {
  if (!node) return "";
  if (typeof node.text === "string") return node.text;
  const inner = (node.content ?? []).map(plainText);
  const block = ["paragraph", "heading", "listItem", "blockquote", "codeBlock"].includes(node.type ?? "");
  return inner.join(block ? "" : " ") + (block ? "\n" : "");
}

export function excerptFrom(doc: TipTapNode, max = 200): string {
  const text = plainText(doc).replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max).replace(/\s+\S*$/, "")}…`;
}

export function readingMinutes(doc: TipTapNode): number {
  const words = plainText(doc).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Only absolute http(s) URLs (or site-relative paths) are allowed for links and images. */
export function safeUrl(value: unknown, { allowRelative = true, allowMailto = false } = {}): string | null {
  if (typeof value !== "string") return null;
  const url = value.trim();
  if (!url || url.length > 1000) return null;
  if (allowRelative && url.startsWith("/") && !url.startsWith("//")) return url;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") return parsed.toString();
    if (allowMailto && parsed.protocol === "mailto:") return parsed.toString();
  } catch {
    /* not a URL */
  }
  return null;
}

export function parseTags(raw: unknown): string[] {
  if (typeof raw !== "string") return [];
  const tags = raw
    .split(",")
    .map((t) => t.trim().toLowerCase().replace(/[^a-z0-9 +#.-]/g, "").slice(0, 30))
    .filter(Boolean);
  return [...new Set(tags)].slice(0, BLOG_TAGS_MAX);
}

/** A unique slug from the given text (falls back to "post"). */
export async function uniqueSlug(text: string, exceptId?: string): Promise<string> {
  const base = slugify(text) || "post";
  for (let n = 1; n < 100; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    const clash = await prisma.blogPost.findUnique({ where: { slug }, select: { id: true } });
    if (!clash || clash.id === exceptId) return slug;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export type BlogInput = {
  title: string;
  slug: string;
  excerpt: string;
  coverImageUrl: string | null;
  tags: string[];
  content: TipTapNode;
};

/** Validates the editor form. Returns the clean input or an error message. */
export function readBlogForm(form: FormData): BlogInput | string {
  const title = String(form.get("title") ?? "").trim();
  if (!title) return "Give the post a title.";
  if (title.length > BLOG_TITLE_MAX) return `Keep the title under ${BLOG_TITLE_MAX} characters.`;
  const content = parseContent(form.get("content"));
  if (!content) return "The post content couldn't be read. Try again.";
  if (!plainText(content).trim() && !JSON.stringify(content).includes('"image"')) return "Write something before saving.";
  const excerptRaw = String(form.get("excerpt") ?? "").trim();
  if (excerptRaw.length > BLOG_EXCERPT_MAX) return `Keep the summary under ${BLOG_EXCERPT_MAX} characters.`;
  const coverRaw = String(form.get("coverImageUrl") ?? "").trim();
  const coverImageUrl = coverRaw ? safeUrl(coverRaw) : null;
  if (coverRaw && !coverImageUrl) return "The cover image couldn't be read. Upload it again.";
  return {
    title,
    slug: String(form.get("slug") ?? "").trim() || title,
    excerpt: excerptRaw || excerptFrom(content),
    coverImageUrl,
    tags: parseTags(form.get("tags")),
    content,
  };
}

export function publishedPosts(take = 20, skip = 0) {
  return prisma.blogPost.findMany({
    where: { publishedAt: { not: null } },
    orderBy: { publishedAt: "desc" },
    take,
    skip,
    select: {
      id: true, slug: true, title: true, excerpt: true, coverImageUrl: true, tags: true, publishedAt: true,
      content: true, author: { select: { name: true } },
    },
  });
}
