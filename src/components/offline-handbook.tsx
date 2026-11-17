"use client";

import { useEffect, useState } from "react";
import {
  claimOfflineFor,
  isSaved,
  offlineSupported,
  registerServiceWorker,
  removeHandbook,
  saveHandbook,
} from "@/lib/offline-handbooks";

/** "Save for offline" control on a course handbook page. */
export function OfflineHandbookButton({ path, title, userId }: { path: string; title: string; userId: string }) {
  const [state, setState] = useState<"checking" | "unsupported" | "saved" | "not-saved" | "saving" | "error">("checking");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!offlineSupported()) return setState("unsupported");
      await claimOfflineFor(userId);
      await registerServiceWorker();
      const saved = await isSaved(path);
      if (!cancelled) setState(saved ? "saved" : "not-saved");
    })();
    return () => {
      cancelled = true;
    };
  }, [path, userId]);

  async function save() {
    setState("saving");
    try {
      await navigator.serviceWorker.ready;
      await saveHandbook(path, title);
      setState("saved");
    } catch {
      setState("error");
    }
  }

  async function remove() {
    await removeHandbook(path);
    setState("not-saved");
  }

  if (state === "checking") return null;
  if (state === "unsupported") {
    return <p className="handbook-offline-note">This browser can&rsquo;t save pages for offline reading. Download the PDF instead.</p>;
  }
  return (
    <div className="handbook-offline" aria-live="polite">
      {state === "saved" ? (
        <>
          <span>✓ Saved on this device: open it any time, even without internet.</span>
          <button type="button" className="text-link" onClick={() => void remove()}>
            Remove
          </button>
        </>
      ) : (
        <>
          <button type="button" className="button button-primary" onClick={() => void save()} disabled={state === "saving"}>
            {state === "saving" ? "Saving…" : "Save for offline reading"}
          </button>
          {state === "error" && <span className="auth-error">Couldn&rsquo;t save. Check your connection and try again.</span>}
        </>
      )}
    </div>
  );
}
