const CACHE_NAME = 'kasper-v17';
const ASSETS = [
  '/',
  '/index.html',
  '/vendor.html',
  '/demo.html',
  '/driver.html',
  '/book.html',
  '/decline.html',
  '/ops.html',
  '/css/app.css',
  '/hero-bg.png',
  '/track-sample-map.svg',
  '/js/vendor.js',
  '/js/book.js',
  '/js/supabase.js',
  '/js/auth.js',
  '/icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version if found, otherwise fetch from network
      return response || fetch(event.request);
    })
  );
});
