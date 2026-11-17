"use client";

// Rich text editor for blog posts. Ported from the modecbt QuestionEditor
// (TipTap + the same toolbar layout), without the math, colour and media
// library pieces this site doesn't have; images are added by web address.
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { useState } from "react";

type Panel = null | "link" | "image";

function ToolButton({
  label,
  onClick,
  active = false,
  disabled = false,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={active ? "active" : undefined}
      aria-label={label}
      aria-pressed={active}
      title={label}
      onMouseDown={(e) => e.preventDefault()} /* keep the editor's selection */
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function MenuBar({ editor }: { editor: Editor }) {
  const [panel, setPanel] = useState<Panel>(null);
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");
  const [error, setError] = useState("");
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      code: e.isActive("code"),
      highlight: e.isActive("highlight"),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      codeBlock: e.isActive("codeBlock"),
      link: e.isActive("link"),
      center: e.isActive({ textAlign: "center" }),
      right: e.isActive({ textAlign: "right" }),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const chain = () => editor.chain().focus();

  function openPanel(next: Panel) {
    setError("");
    setAlt("");
    setUrl(next === "link" ? String(editor.getAttributes("link").href ?? "") : "");
    setPanel(panel === next ? null : next);
  }

  function apply() {
    const value = url.trim();
    if (panel === "link") {
      if (!value) {
        chain().extendMarkRange("link").unsetLink().run();
      } else if (/^(https?:\/\/|mailto:|\/(?!\/))/i.test(value)) {
        chain().extendMarkRange("link").setLink({ href: value }).run();
      } else {
        return setError("Links must start with https://, mailto: or /");
      }
    } else if (panel === "image") {
      if (!/^https?:\/\//i.test(value)) return setError("Paste an image address starting with https://");
      chain().setImage({ src: value, alt: alt.trim() }).run();
    }
    setPanel(null);
  }

  return (
    <div className="blog-editor-toolbar">
      <div className="blog-editor-tools" role="toolbar" aria-label="Formatting">
        <ToolButton label="Bold" active={state.bold} onClick={() => chain().toggleBold().run()}><b>B</b></ToolButton>
        <ToolButton label="Italic" active={state.italic} onClick={() => chain().toggleItalic().run()}><i>I</i></ToolButton>
        <ToolButton label="Underline" active={state.underline} onClick={() => chain().toggleUnderline().run()}><u>U</u></ToolButton>
        <ToolButton label="Strikethrough" active={state.strike} onClick={() => chain().toggleStrike().run()}><s>S</s></ToolButton>
        <ToolButton label="Inline code" active={state.code} onClick={() => chain().toggleCode().run()}>{"</>"}</ToolButton>
        <ToolButton label="Highlight" active={state.highlight} onClick={() => chain().toggleHighlight().run()}>🖍</ToolButton>
        <span className="sep" aria-hidden="true" />
        <ToolButton label="Heading" active={state.h2} onClick={() => chain().toggleHeading({ level: 2 }).run()}>H2</ToolButton>
        <ToolButton label="Subheading" active={state.h3} onClick={() => chain().toggleHeading({ level: 3 }).run()}>H3</ToolButton>
        <ToolButton label="Bullet list" active={state.bullet} onClick={() => chain().toggleBulletList().run()}>• List</ToolButton>
        <ToolButton label="Numbered list" active={state.ordered} onClick={() => chain().toggleOrderedList().run()}>1. List</ToolButton>
        <ToolButton label="Quote" active={state.quote} onClick={() => chain().toggleBlockquote().run()}>❝</ToolButton>
        <ToolButton label="Code block" active={state.codeBlock} onClick={() => chain().toggleCodeBlock().run()}>{"{ }"}</ToolButton>
        <ToolButton label="Divider" onClick={() => chain().setHorizontalRule().run()}>―</ToolButton>
        <span className="sep" aria-hidden="true" />
        <ToolButton label="Align left" active={!state.center && !state.right} onClick={() => chain().setTextAlign("left").run()}>⇤</ToolButton>
        <ToolButton label="Align centre" active={state.center} onClick={() => chain().setTextAlign("center").run()}>↔</ToolButton>
        <ToolButton label="Align right" active={state.right} onClick={() => chain().setTextAlign("right").run()}>⇥</ToolButton>
        <span className="sep" aria-hidden="true" />
        <ToolButton label="Link" active={state.link || panel === "link"} onClick={() => openPanel("link")}>🔗 Link</ToolButton>
        <ToolButton label="Image" active={panel === "image"} onClick={() => openPanel("image")}>🖼 Image</ToolButton>
        <span className="sep" aria-hidden="true" />
        <ToolButton label="Undo" disabled={!state.canUndo} onClick={() => chain().undo().run()}>↶</ToolButton>
        <ToolButton label="Redo" disabled={!state.canRedo} onClick={() => chain().redo().run()}>↷</ToolButton>
      </div>
      {panel && (
        <div className="blog-editor-panel">
          <label>
            {panel === "link" ? "Link address (leave empty to remove the link)" : "Image address"}
            <input
              type="url"
              value={url}
              autoFocus
              placeholder="https://"
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  apply();
                }
              }}
            />
          </label>
          {panel === "image" && (
            <label>
              Description for screen readers
              <input value={alt} maxLength={200} onChange={(e) => setAlt(e.target.value)} placeholder="e.g. Students at the hackathon" />
            </label>
          )}
          {error && <p className="auth-error">{error}</p>}
          <div className="blog-editor-panel-actions">
            <button type="button" className="button button-small button-primary" onClick={apply}>
              {panel === "link" ? "Apply link" : "Insert image"}
            </button>
            <button type="button" className="text-link" onClick={() => setPanel(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * The editor keeps its JSON in a hidden form field (`name`), so it works with
 * a plain <form action={serverAction}>.
 */
export function BlogEditor({
  name,
  initialContent,
  placeholder = "Tell the club what's new…",
}: {
  name: string;
  initialContent: unknown;
  placeholder?: string;
}) {
  const [json, setJson] = useState(() => JSON.stringify(initialContent));
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
      }),
      Highlight,
      Image.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: initialContent as object,
    editorProps: { attributes: { class: "blog-prose blog-editor-content", "aria-label": "Post content" } },
    onUpdate: ({ editor: e }) => setJson(JSON.stringify(e.getJSON())),
  });

  return (
    <div className="blog-editor">
      {editor ? <MenuBar editor={editor} /> : <div className="blog-editor-toolbar" style={{ minHeight: 44 }} />}
      <EditorContent editor={editor} />
      <input type="hidden" name={name} value={json} />
    </div>
  );
}
