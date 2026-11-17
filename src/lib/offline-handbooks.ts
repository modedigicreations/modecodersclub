// Browser-side helpers for offline handbooks (see public/sw.js).
export const HANDBOOK_CACHE = "mcc-handbooks-v1";
export const STATIC_CACHE = "mcc-static-v1";
const LIST_KEY = "mcc-offline-handbooks";
const OWNER_KEY = "mcc-offline-owner";

export type SavedHandbook = { path: string; title: string; savedAt: string };

export function listSaved(): SavedHandbook[] {
  try {
    const value = JSON.parse(localStorage.getItem(LIST_KEY) ?? "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeList(list: SavedHandbook[]) {
  try {
    localStorage.setItem(LIST_KEY, JSON.stringify(list));
  } catch {
    /* storage blocked: the cache still works */
  }
}

export function offlineSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "caches" in window;
}

export async function registerServiceWorker() {
  if (!offlineSupported()) return;
  await navigator.serviceWorker.register("/sw.js").catch(() => {});
}

/** Saved handbooks belong to whoever saved them: wipe them if someone else signs in on this device. */
export async function claimOfflineFor(userId: string) {
  if (!offlineSupported()) return;
  let owner: string | null = null;
  try {
    owner = localStorage.getItem(OWNER_KEY);
  } catch {
    /* ignore */
  }
  if (owner && owner !== userId) await clearOffline();
  try {
    localStorage.setItem(OWNER_KEY, userId);
  } catch {
    /* ignore */
  }
}

export async function saveHandbook(path: string, title: string) {
  const handbooks = await caches.open(HANDBOOK_CACHE);
  const page = await fetch(path, { credentials: "same-origin", cache: "no-store" });
  if (!page.ok || page.redirected) throw new Error("Couldn't download the handbook.");
  await handbooks.put(path, page);
  const list = await fetch("/offline", { cache: "no-store" });
  const listHtml = list.ok ? await list.clone().text() : "";
  if (list.ok) await handbooks.put("/offline", list);

  // The styles, fonts and scripts this page and the saved-handbooks list use,
  // so both look right and work offline.
  const fromList = [...listHtml.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)].map((m) => m[1]!);
  const assets = performance
    .getEntriesByType("resource")
    .map((e) => new URL(e.name))
    .filter((u) => u.origin === location.origin && u.pathname.startsWith("/_next/static/"))
    .map((u) => u.pathname + u.search)
    .concat(fromList.map((a) => a.replace(/&amp;/g, "&")));
  const statics = await caches.open(STATIC_CACHE);
  await Promise.all([...new Set(assets)].map((a) => statics.add(a).catch(() => {})));

  writeList([{ path, title, savedAt: new Date().toISOString() }, ...listSaved().filter((h) => h.path !== path)]);
}

export async function removeHandbook(path: string) {
  if (offlineSupported()) await (await caches.open(HANDBOOK_CACHE)).delete(path);
  writeList(listSaved().filter((h) => h.path !== path));
}

export async function isSaved(path: string) {
  if (!offlineSupported()) return false;
  return Boolean(await (await caches.open(HANDBOOK_CACHE)).match(path));
}

/** Called on sign-out: removes every saved handbook from this device. */
export async function clearOffline() {
  try {
    localStorage.removeItem(LIST_KEY);
    localStorage.removeItem(OWNER_KEY);
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined" && "caches" in window) {
    await Promise.all([caches.delete(HANDBOOK_CACHE), caches.delete(STATIC_CACHE)]);
  }
}
