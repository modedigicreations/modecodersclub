// Converts a normal YouTube/Vimeo share link into an embeddable iframe src,
// so an instructor can paste the link they'd naturally copy from the
// browser instead of hand-crafting an embed URL. Returns null for anything
// it doesn't recognize — render nothing rather than guessing.
const VIDEO_ID = /^[\w-]{6,20}$/; // YouTube IDs; anything else is rejected, never pasted into a URL

export function toEmbedUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  const host = parsed.hostname.replace(/^www\./, "");

  if (host === "youtube.com" || host === "m.youtube.com") {
    const id = parsed.searchParams.get("v");
    if (id && VIDEO_ID.test(id)) return `https://www.youtube.com/embed/${id}`;
    const shortsMatch = parsed.pathname.match(/^\/shorts\/([\w-]+)/);
    if (shortsMatch && VIDEO_ID.test(shortsMatch[1]!)) return `https://www.youtube.com/embed/${shortsMatch[1]}`;
    return null;
  }

  if (host === "youtu.be") {
    const id = parsed.pathname.slice(1);
    return VIDEO_ID.test(id) ? `https://www.youtube.com/embed/${id}` : null;
  }

  if (host === "vimeo.com") {
    const id = parsed.pathname.match(/^\/(\d+)/)?.[1];
    return id ? `https://player.vimeo.com/video/${id}` : null;
  }

  return null;
}
