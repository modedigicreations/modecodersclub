"use client";

import { useEffect, useState } from "react";
import { type SavedHandbook, listSaved, offlineSupported, removeHandbook } from "@/lib/offline-handbooks";

export function SavedHandbookList() {
  const [items, setItems] = useState<SavedHandbook[] | null>(null);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    // Browser-only data (localStorage, navigator.onLine), so it's read after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(offlineSupported() ? listSaved() : []);
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (items === null) return null;
  return (
    <section>
      {!online && <p className="handbook-note">You&rsquo;re offline. Saved handbooks still open.</p>}
      {items.length === 0 ? (
        <p>
          Nothing saved yet. Open a course on your dashboard, choose <strong>Read the handbook</strong>, then{" "}
          <strong>Save for offline reading</strong>.
        </p>
      ) : (
        <ul className="review-list">
          {items.map((h) => (
            <li key={h.path}>
              <p>
                <a className="text-link" href={h.path}>{h.title}</a>
              </p>
              <p>
                Saved {new Date(h.savedAt).toLocaleDateString()} ·{" "}
                <button
                  type="button"
                  className="text-link"
                  onClick={() => void removeHandbook(h.path).then(() => setItems(listSaved()))}
                >
                  Remove
                </button>
              </p>
            </li>
          ))}
        </ul>
      )}
      <p style={{ marginTop: 24 }}>
        <a className="text-link" href="/dashboard">Go to your dashboard</a>
      </p>
    </section>
  );
}
