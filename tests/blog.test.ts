import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { BlogContent } from "@/lib/blog-render";
import { type TipTapNode, excerptFrom, parseContent, parseTags, readBlogForm, readingMinutes, safeUrl } from "@/lib/blog";

const doc = (content: unknown[]) => ({ type: "doc", content }) as TipTapNode;
const p = (...content: unknown[]) => ({ type: "paragraph", content });
const t = (text: string, marks?: unknown[]) => ({ type: "text", text, ...(marks ? { marks } : {}) });

test("renders the editor's nodes and marks", () => {
  const html = renderToStaticMarkup(
    BlogContent({
      doc: doc([
        { type: "heading", attrs: { level: 2, textAlign: "center" }, content: [t("Hi")] },
        p(t("bold", [{ type: "bold" }]), t(" "), t("site", [{ type: "link", attrs: { href: "https://example.com" } }])),
        { type: "bulletList", content: [{ type: "listItem", content: [p(t("one"))] }] },
        { type: "codeBlock", attrs: { language: "js" }, content: [t("let a = 1 < 2;")] },
        { type: "image", attrs: { src: "https://img.example/x.png", alt: "pic" } },
      ]),
    }),
  );
  assert.match(html, /<h2 style="text-align:center">.*Hi/);
  assert.match(html, /<strong>bold<\/strong>/);
  assert.match(html, /<a href="https:\/\/example.com\/" target="_blank" rel="noopener noreferrer nofollow">/);
  assert.match(html, /<ul><li><p>/);
  assert.match(html, /<pre data-language="js"><code>let a = 1 &lt; 2;<\/code><\/pre>/);
  assert.match(html, /<img src="https:\/\/img.example\/x.png" alt="pic"/);
});

test("can't inject HTML, scripts or dangerous URLs", () => {
  const html = renderToStaticMarkup(
    BlogContent({
      doc: doc([
        p(t("<script>alert(1)</script>")),
        p(t("x", [{ type: "link", attrs: { href: "javascript:alert(1)" } }])),
        p(t("y", [{ type: "link", attrs: { href: "//evil.example" } }])),
        { type: "image", attrs: { src: "data:image/svg+xml,<svg onload=alert(1)>" } },
        { type: "image", attrs: { src: "javascript:alert(1)" } },
        { type: "rawHtml", attrs: { html: "<img onerror=alert(1)>" }, content: [t("kept text")] },
        { type: "heading", attrs: { level: 1, textAlign: "x;background:url(evil)" }, content: [t("H")] },
        { type: "paragraph", attrs: { onclick: "alert(1)" }, content: [t("z")] },
      ]),
    }),
  );
  assert.ok(!html.includes("<script"), "text is escaped");
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(!/javascript:|data:|onerror|onload|onclick|evil/.test(html), html);
  assert.match(html, /<h2>.*H<\/span><\/h2>/, "level clamped, bad alignment dropped");
  assert.ok(html.includes("kept text"), "unknown nodes keep their text only");
});

test("urls, tags, excerpts and form validation", () => {
  assert.equal(safeUrl("/courses"), "/courses");
  assert.equal(safeUrl("//evil.com"), null);
  assert.equal(safeUrl("mailto:a@b.co"), null);
  assert.equal(safeUrl("mailto:a@b.co", { allowMailto: true }), "mailto:a@b.co");
  assert.deepEqual(parseTags("JavaScript, events, javascript, <b>x</b>"), ["javascript", "events", "bxb"]);

  const long = doc([p(t("word ".repeat(450)))]);
  assert.equal(readingMinutes(long), 2);
  assert.ok(excerptFrom(long).endsWith("…"));
  assert.ok(excerptFrom(long).length <= 201);
  assert.equal(parseContent('{"type":"paragraph"}'), null);
  assert.equal(parseContent("not json"), null);

  const form = (fields: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(fields)) f.set(k, v);
    return f;
  };
  const content = JSON.stringify(doc([p(t("Hello club"))]));
  assert.match(readBlogForm(form({ title: "", content })) as string, /title/);
  assert.match(readBlogForm(form({ title: "T", content: JSON.stringify(doc([p()])) })) as string, /Write something/);
  assert.match(readBlogForm(form({ title: "T", content, coverImageUrl: "javascript:x" })) as string, /Upload it again/);
  const ok = readBlogForm(form({ title: "  Hello  ", content, tags: "a, b" }));
  assert.equal(typeof ok, "object");
  assert.deepEqual(
    { ...(ok as object), content: undefined },
    { title: "Hello", slug: "Hello", excerpt: "Hello club", coverImageUrl: null, tags: ["a", "b"], content: undefined },
  );
});

test("image uploads: only real JPG/PNG/WebP/GIF bytes are accepted", async () => {
  const { sniffImage } = await import("@/lib/r2");
  const pad = (head: number[]) => new Uint8Array([...head, ...new Array(16).fill(0)]);
  assert.equal(sniffImage(pad([0xff, 0xd8, 0xff, 0xe0]))?.ext, "jpg");
  assert.equal(sniffImage(pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))?.ext, "png");
  assert.equal(sniffImage(pad([...Buffer.from("GIF89a")]))?.ext, "gif");
  assert.equal(sniffImage(new Uint8Array([...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WEBPVP8 ")]))?.ext, "webp");
  assert.equal(sniffImage(pad([...Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)">')])), null, "SVG refused");
  assert.equal(sniffImage(pad([...Buffer.from("<html><script>")])), null);
  assert.equal(sniffImage(new Uint8Array([0xff, 0xd8])), null, "too short");
});

test("R2 errors are explained to the admin without secrets", async () => {
  const { explainR2Error } = await import("@/lib/r2");
  process.env.R2_BUCKET_NAME = "my-bucket";
  process.env.R2_SECRET_ACCESS_KEY = "super-secret-value";
  const cases: [unknown, RegExp][] = [
    [{ name: "InvalidAccessKeyId" }, /R2_ACCESS_KEY_ID/],
    [{ name: "SignatureDoesNotMatch" }, /R2_SECRET_ACCESS_KEY/],
    [{ name: "NoSuchBucket" }, /"my-bucket"/],
    [{ name: "AccessDenied" }, /Read & Write/],
    [{ code: "ENOTFOUND" }, /R2_ACCOUNT_ID/],
    [{ name: "Unknown", $metadata: { httpStatusCode: 403 } }, /credentials/],
  ];
  for (const [err, re] of cases) {
    const msg = explainR2Error(err);
    assert.match(msg, re);
    assert.ok(!msg.includes("super-secret-value"));
  }
});
