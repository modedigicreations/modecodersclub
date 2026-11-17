import type { CSSProperties, ReactNode } from "react";
import { type TipTapNode, safeUrl } from "@/lib/blog";

// Server-side renderer for TipTap JSON. Only the nodes and marks the editor
// offers are rendered, every attribute is checked, and React escapes all
// text, so a stored post can't inject HTML or scripts into the page.

const ALIGN = new Set(["left", "center", "right", "justify"]);

function alignStyle(attrs: TipTapNode["attrs"]): CSSProperties | undefined {
  const a = attrs?.textAlign;
  return typeof a === "string" && ALIGN.has(a) && a !== "left" ? { textAlign: a as CSSProperties["textAlign"] } : undefined;
}

function renderText(node: TipTapNode, key: number): ReactNode {
  let out: ReactNode = node.text ?? "";
  for (const mark of node.marks ?? []) {
    switch (mark.type) {
      case "bold":
        out = <strong>{out}</strong>;
        break;
      case "italic":
        out = <em>{out}</em>;
        break;
      case "underline":
        out = <u>{out}</u>;
        break;
      case "strike":
        out = <s>{out}</s>;
        break;
      case "code":
        out = <code>{out}</code>;
        break;
      case "highlight":
        out = <mark>{out}</mark>;
        break;
      case "link": {
        const href = safeUrl(mark.attrs?.href, { allowMailto: true });
        if (href) {
          const external = !href.startsWith("/");
          out = (
            <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer nofollow" } : {})}>
              {out}
            </a>
          );
        }
        break;
      }
    }
  }
  return <span key={key}>{out}</span>;
}

function children(node: TipTapNode): ReactNode[] {
  return (node.content ?? []).map((child, i) => renderNode(child, i));
}

export function renderNode(node: TipTapNode, key = 0): ReactNode {
  switch (node.type) {
    case "doc":
      return <>{children(node)}</>;
    case "text":
      return renderText(node, key);
    case "paragraph":
      return <p key={key} style={alignStyle(node.attrs)}>{children(node)}</p>;
    case "heading": {
      const level = Math.min(4, Math.max(2, Number(node.attrs?.level) || 2));
      const Tag = `h${level}` as "h2" | "h3" | "h4";
      return <Tag key={key} style={alignStyle(node.attrs)}>{children(node)}</Tag>;
    }
    case "bulletList":
      return <ul key={key}>{children(node)}</ul>;
    case "orderedList": {
      const start = Number(node.attrs?.start);
      return <ol key={key} start={Number.isInteger(start) && start > 1 ? start : undefined}>{children(node)}</ol>;
    }
    case "listItem":
      return <li key={key}>{children(node)}</li>;
    case "blockquote":
      return <blockquote key={key}>{children(node)}</blockquote>;
    case "codeBlock": {
      const lang = typeof node.attrs?.language === "string" ? node.attrs.language.replace(/[^a-z0-9+#-]/gi, "").slice(0, 20) : "";
      return (
        <pre key={key} data-language={lang || undefined}>
          <code>{(node.content ?? []).map((c) => c.text ?? "").join("")}</code>
        </pre>
      );
    }
    case "horizontalRule":
      return <hr key={key} />;
    case "hardBreak":
      return <br key={key} />;
    case "image": {
      const src = safeUrl(node.attrs?.src);
      if (!src) return null;
      const alt = typeof node.attrs?.alt === "string" ? node.attrs.alt.slice(0, 200) : "";
      // eslint-disable-next-line @next/next/no-img-element -- images can be on any host the author links
      return <img key={key} src={src} alt={alt} loading="lazy" decoding="async" referrerPolicy="no-referrer" />;
    }
    default:
      // Unknown node types: keep their text, drop the wrapper.
      return node.content ? <span key={key}>{children(node)}</span> : null;
  }
}

export function BlogContent({ doc }: { doc: unknown }) {
  if (!doc || typeof doc !== "object") return null;
  return <div className="blog-prose">{renderNode(doc as TipTapNode)}</div>;
}
