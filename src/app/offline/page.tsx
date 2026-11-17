import type { Metadata } from "next";
import { SavedHandbookList } from "./saved-list";

export const metadata: Metadata = { title: "Saved handbooks", robots: { index: false, follow: false } };

// A static page: it lists what this device has saved (from browser storage),
// so it works with no connection and needs no sign-in to render.
export default function OfflinePage() {
  return (
    <main className="handbook">
      <header className="handbook-cover">
        <p className="eyebrow"><span /> Offline reading</p>
        <h1>Saved handbooks</h1>
        <p>Course handbooks you&rsquo;ve saved on this device. They open even without an internet connection.</p>
      </header>
      <SavedHandbookList />
    </main>
  );
}
