const CACHE_NAME = 'kasper-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/vendor.html',
  '/driver.html',
  '/css/app.css',
  '/js/vendor.js',
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
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
