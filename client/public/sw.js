const CACHE_NAME = "ubs-vortex-agent-v2";
const urlsToCache = ["/", "/static/js/bundle.js", "/static/css/main.css", "/manifest.json", "/vortex-logo.png"];

self.addEventListener("install", function (event) {
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (cacheNames) {
        return Promise.all(
          cacheNames.map(function (cacheName) {
            // Delete old caches
            if (cacheName !== CACHE_NAME) {
              console.log("Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(function () {
        // Take control of all clients immediately
        return self.clients.claim();
      })
  );
});

self.addEventListener("fetch", function (event) {
  event.respondWith(
    caches.match(event.request).then(function (response) {
      // Return cached version or fetch from network
      return response || fetch(event.request);
    })
  );
});
