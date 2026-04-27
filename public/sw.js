// ================================================================
// public/sw.js — Kasper Vendor OS Service Worker
// Cache-first strategy for app shell.
// Network-first for Supabase API calls (never cache).
// ================================================================

const CACHE_VERSION = 'kasper-v1';

const APP_SHELL = [
  '/',
  '/vendor.html',
  '/driver.html',
  '/track.html',
  '/approve.html',
  '/decline.html',
  '/book.html',
  '/onboard.html',
  '/css/app.css',
  '/js/supabase.js',
  '/js/auth.js',
  '/js/whatsapp.js',
  '/js/pdf.js',
  '/js/gps.js',
  '/public/manifest.json',
  '/public/icons/icon-192.png',
  '/public/icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
];

// ── INSTALL: cache app shell ─────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => {
      // Cache what we can — don't fail on missing files
      return Promise.allSettled(
        APP_SHELL.map(url => cache.add(url).catch(() => {}))
      );
    }).then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: remove old caches ──────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_VERSION)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: serve strategy ─────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Never intercept Supabase API calls — always network
  if (url.hostname.includes('supabase.co') || url.hostname.includes('supabase.in')) {
    return; // Fall through to network
  }

  // Never intercept 360dialog API calls
  if (url.hostname.includes('360dialog') || url.hostname.includes('waba')) {
    return;
  }

  // For app shell files: cache-first, fallback to network
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;

        return fetch(event.request).then(response => {
          // Don't cache non-200 responses
          if (!response || response.status !== 200 || response.type === 'opaque') {
            return response;
          }

          // Cache for next time
          const toCache = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(event.request, toCache));

          return response;
        }).catch(() => {
          // Offline fallback for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/vendor.html');
          }
        });
      })
    );
  }
});

// ── BACKGROUND SYNC: GPS queue ───────────────────────────────────
// When driver comes back online, flush any queued GPS pushes.
self.addEventListener('sync', event => {
  if (event.tag === 'gps-flush') {
    event.waitUntil(flushGPSQueue());
  }
});

async function flushGPSQueue() {
  // GPS queue is managed in js/gps.js
  // This is a placeholder for the background sync integration
  const clients = await self.clients.matchAll();
  clients.forEach(client => client.postMessage({ type: 'GPS_FLUSH' }));
}
