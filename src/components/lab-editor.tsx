"use client";

import Editor from "@monaco-editor/react";
import { useEffect, useRef, useState } from "react";
import { saveLabSubmission } from "@/app/dashboard/actions";

type Code = { html: string; css: string; js: string };
type Tab = "html" | "css" | "js";

function buildPreviewDoc(code: Code): string {
  return (
    "<!doctype html><html><head><meta charset=\"utf-8\"><style>" +
    code.css +
    "</style></head><body>" +
    code.html +
    "<script>" +
    code.js +
    "<\/script></body></html>"
  );
}

export function LabEditor({
  lessonId,
  labId,
  hintsEnabled,
  initial,
}: {
  lessonId: string;
  labId: string;
  hintsEnabled: boolean;
  initial: Code;
}) {
  const [tab, setTab] = useState<Tab>("html");
  const [code, setCode] = useState<Code>(initial);
  const [preview, setPreview] = useState(() => buildPreviewDoc(initial));
  const [hint, setHint] = useState<string | null>(null);
  const [hintStatus, setHintStatus] = useState<"idle" | "loading" | "error">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  function updateCode(field: Tab, value: string) {
    setCode((previous) => {
      const next = { ...previous, [field]: value };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        saveLabSubmission(labId, next.html, next.css, next.js).catch(() => {});
      }, 2000);
      return next;
    });
  }

  function run() {
    setPreview(buildPreviewDoc(code));
  }

  async function getHint() {
    setHintStatus("loading");
    setHint(null);
    try {
      const response = await fetch(`/api/labs/${lessonId}/hint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(code),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Couldn't get a hint.");
      setHint(data.hint);
      setHintStatus("idle");
    } catch (error) {
      setHint(error instanceof Error ? error.message : "Couldn't get a hint.");
      setHintStatus("error");
    }
  }

  const editorOptions = { minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false };

  return (
    <div className="lab-editor">
      <div className="lab-editor-tabs">
        {(["html", "css", "js"] as const).map((key) => (
          <button
            key={key}
            type="button"
            className={tab === key ? "active" : ""}
            onClick={() => setTab(key)}
          >
            {key.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="lab-editor-pane">
        <div style={{ display: tab === "html" ? "block" : "none" }}>
          <Editor height="220px" language="html" value={code.html} theme="vs-dark" options={editorOptions} onChange={(value) => updateCode("html", value ?? "")} />
        </div>
        <div style={{ display: tab === "css" ? "block" : "none" }}>
          <Editor height="220px" language="css" value={code.css} theme="vs-dark" options={editorOptions} onChange={(value) => updateCode("css", value ?? "")} />
        </div>
        <div style={{ display: tab === "js" ? "block" : "none" }}>
          <Editor height="220px" language="javascript" value={code.js} theme="vs-dark" options={editorOptions} onChange={(value) => updateCode("js", value ?? "")} />
        </div>
      </div>

      <div className="lab-editor-actions">
        <button type="button" className="button button-primary" onClick={run}>
          Run
        </button>
        {hintsEnabled && (
          <button type="button" className="button button-small" onClick={getHint} disabled={hintStatus === "loading"}>
            {hintStatus === "loading" ? "Thinking…" : "Get a hint"}
          </button>
        )}
      </div>

      {hint && <p className={hintStatus === "error" ? "auth-error" : "lab-hint"}>{hint}</p>}

      <iframe className="lab-preview" sandbox="allow-scripts" srcDoc={preview} title="Lab preview" />
    </div>
  );
}
