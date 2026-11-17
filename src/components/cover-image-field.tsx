"use client";

import { useRef, useState } from "react";
import { IMAGE_ACCEPT, uploadImageFile } from "@/lib/upload-image-client";

/** Cover image picker: uploads to R2 and keeps the URL in a hidden form field. */
export function CoverImageField({ name, initialUrl }: { name: string; initialUrl: string | null }) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const [state, setState] = useState<"idle" | "uploading">("idle");
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setState("uploading");
    try {
      setUrl(await uploadImageFile(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "The upload failed.");
    } finally {
      setState("idle");
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="cover-field">
      <span className="cover-field-label">Cover image (optional, shown on the blog list and when shared)</span>
      {url && (
        // eslint-disable-next-line @next/next/no-img-element -- preview of the uploaded file
        <img className="cover-field-preview" src={url} alt="Cover image preview" />
      )}
      <div className="blog-editor-panel-actions">
        <button type="button" className="button button-small" disabled={state === "uploading"} onClick={() => input.current?.click()}>
          {state === "uploading" ? "Uploading…" : url ? "Replace cover image" : "Upload cover image"}
        </button>
        {url && state === "idle" && (
          <button type="button" className="text-link" onClick={() => setUrl("")}>Remove</button>
        )}
      </div>
      {error && <p className="auth-error">{error}</p>}
      <input ref={input} type="file" accept={IMAGE_ACCEPT} hidden onChange={(e) => void onFile(e.target.files?.[0])} />
      <input type="hidden" name={name} value={url} />
    </div>
  );
}
