"use client";

import { useState } from "react";

type LabDraft = { instructions: string; starterHtml: string; starterCss: string; starterJs: string };
type AssessmentDraft = { questions: { question: string; options: string[]; correctIndex: number }[] };

function setFieldValue(id: string, value: string) {
  const el = document.getElementById(id);
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) el.value = value;
}

function DifficultyPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="beginner">Beginner</option>
      <option value="intermediate">Intermediate</option>
      <option value="advanced">Advanced</option>
    </select>
  );
}

export function GenerateLabButton({ lessonId }: { lessonId: string }) {
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("beginner");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  async function generate() {
    if (!topic.trim()) return;
    setStatus("loading");
    try {
      const response = await fetch(`/api/instructor/labs/${lessonId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, difficulty }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Generation failed.");
      const draft = data.draft as LabDraft;
      setFieldValue("instructions", draft.instructions);
      setFieldValue("starterHtml", draft.starterHtml);
      setFieldValue("starterCss", draft.starterCss);
      setFieldValue("starterJs", draft.starterJs);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="ai-generate-row">
      <input
        placeholder="Topic, e.g. CSS flexbox centering"
        value={topic}
        onChange={(event) => setTopic(event.target.value)}
      />
      <DifficultyPicker value={difficulty} onChange={setDifficulty} />
      <button type="button" className="button button-small" onClick={generate} disabled={status === "loading"}>
        {status === "loading" ? "Generating…" : "Generate draft with AI"}
      </button>
      {status === "error" && <span className="auth-error">AI generation failed — try again.</span>}
    </div>
  );
}

export function GenerateAssessmentButton({ lessonId }: { lessonId: string }) {
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("beginner");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  async function generate() {
    if (!topic.trim()) return;
    setStatus("loading");
    try {
      const response = await fetch(`/api/instructor/assessments/${lessonId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, difficulty, count: 5 }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Generation failed.");
      const draft = data.draft as AssessmentDraft;
      setFieldValue("questions", JSON.stringify(draft.questions, null, 2));
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="ai-generate-row">
      <input
        placeholder="Topic, e.g. JavaScript array methods"
        value={topic}
        onChange={(event) => setTopic(event.target.value)}
      />
      <DifficultyPicker value={difficulty} onChange={setDifficulty} />
      <button type="button" className="button button-small" onClick={generate} disabled={status === "loading"}>
        {status === "loading" ? "Generating…" : "Generate 5 questions with AI"}
      </button>
      {status === "error" && <span className="auth-error">AI generation failed — try again.</span>}
    </div>
  );
}
