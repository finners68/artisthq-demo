const CACHE_NAME = "lockleadhq-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.json",
  "./assets/red.jpg",
  "./assets/crowd.jpg",
  "./assets/booth.jpg",
  "./assets/portrait.png",
  "./assets/locklead_red.jpg",
  "./assets/locklead_crowd.jpg",
  "./assets/locklead_booth.jpg",
  "./js/state.js",
  "./js/calendar.js",
  "./js/shows.js",
  "./js/trip.js",
  "./js/ideas.js",
  "./js/notes.js",
  "./js/app.js",
  "./js/pwa.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") return response;
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      });
    })
  );
});
