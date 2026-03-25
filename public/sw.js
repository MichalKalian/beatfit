const CACHE = "beatfit-v1";
const ASSETS = [
  "/",
  "/index.html",
];

// Install — cache shell
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — network first, fallback to cache for navigation
self.addEventListener("fetch", e => {
  const { request } = e;

  // Skip non-GET and Supabase API calls — always go to network
  if (request.method !== "GET") return;
  if (request.url.includes("supabase.co")) return;

  // Navigation requests (HTML) — network first, fallback to cached index.html
  if (request.mode === "navigate") {
    e.respondWith(
      fetch(request)
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  // Static assets — cache first
  e.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(request, clone));
        }
        return response;
      });
    })
  );
});