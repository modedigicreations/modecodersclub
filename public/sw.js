// Mode Coders Club service worker: offline course handbooks only.
// Handbooks are saved on request (the "Save for offline" button) into
// HANDBOOKS; nothing else is cached except the site's own hashed static
// files that a saved handbook needs to look right. Sign-out deletes both.
const HANDBOOKS = "mcc-handbooks-v1";
const STATIC = "mcc-static-v1";
const HANDBOOK_PATH = /^\/dashboard\/courses\/[^/]+\/handbook\/?$/;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate" && (HANDBOOK_PATH.test(url.pathname) || url.pathname === "/offline")) {
    event.respondWith(networkFirst(request, url.pathname));
    return;
  }
  if (url.pathname.startsWith("/_next/static/")) {
    // Hashed, immutable files: use a saved copy if there is one, else the network.
    // (caches.match with cacheName doesn't create the cache, so sign-out's delete sticks.)
    event.respondWith(caches.match(request, { cacheName: STATIC }).then((hit) => hit || fetch(request)));
  }
});

async function networkFirst(request, path) {
  const cache = await caches.open(HANDBOOKS);
  try {
    const response = await fetch(request);
    // Refresh a handbook that's already saved (never saves new ones on its own,
    // and never stores a sign-in redirect in place of the handbook).
    if (response.ok && !response.redirected && (await cache.match(path))) {
      await cache.put(path, response.clone());
    }
    return response;
  } catch (error) {
    const saved = await cache.match(path);
    if (saved) return saved;
    const list = await cache.match("/offline");
    if (list) return list;
    throw error;
  }
}
