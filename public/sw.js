/*
 * Service worker for the installable app.
 *
 * What it does:
 *  - Keeps the app's code, styles, fonts and icons on the device, so it opens faster.
 *  - Shows a friendly "You're offline" page instead of the browser's error page.
 *
 * What it deliberately does NOT do:
 *  - It never stores pages or /api answers. Pharmacy data, prices and sign-ins always
 *    come fresh from the server, so nobody sees old prices or another person's session.
 *
 * To force every installed copy to refresh its stored files, change VERSION.
 */
const VERSION = "v1";
const STATIC_CACHE = `ram-static-${VERSION}`;
const OFFLINE_URL = "/offline.html";
const PRECACHE = [
  OFFLINE_URL,
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k.startsWith("ram-") && k !== STATIC_CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Files whose names change whenever their content changes, so a stored copy is always correct.
function isImmutableAsset(url) {
  return url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Data and sign-in: always straight to the server, never stored.
  if (url.pathname.startsWith("/api/")) return;

  // Opening a page: always from the server. Only if there is no connection, show the offline page.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(STATIC_CACHE);
        return (await cache.match(OFFLINE_URL)) || Response.error();
      }),
    );
    return;
  }

  // App code, styles, fonts, icons: use the stored copy, fetch and store it the first time.
  if (isImmutableAsset(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }),
    );
  }
  // Everything else goes to the network as usual.
});
