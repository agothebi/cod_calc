// IMPORTANT: bump this value on every deploy that changes app assets
// (index.html, styles.css, app.js, manifest.webmanifest, logo.png, icons).
const CACHE_VERSION = "cats-davidson-v3";
const APP_SHELL_ASSETS = ["./", "./index.html", "./styles.css", "./app.js", "./logo.png", "./manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      return cache.addAll(APP_SHELL_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_VERSION) {
            return caches.delete(key);
          }
          return Promise.resolve();
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((networkResponse) => {
          const copy = networkResponse.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
          return networkResponse;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
