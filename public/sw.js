/* Leaf Solar Mailer — offline-first service worker
 *
 * Strategy:
 *  - Precache the app shell (all main pages, manifest, icons) so navigation
 *    works with NO connection after the first visit.
 *  - Navigation: network-first (always get the freshest page), fall back to
 *    the last-cached copy of that page, then to the cached login/home shell.
 *  - _next/static assets are immutable -> cache-first.
 *  - API GETs: network-first, cache successful responses; offline -> cached
 *    copy (the app's offline.ts IndexedDB layer also serves cached data).
 *  - Tracking pixel (/api/t) offline -> return a 1x1 gif so emails still
 *    render without errors.
 *  - Writes (POST/PUT/DELETE) are NOT intercepted; the app's outbox queues
 *    them offline and flushes when back online.
 */
const CACHE = 'leafsolar-shell-v4';

const SHELL = [
  '/',
  '/login',
  '/compose',
  '/campaigns',
  '/campaigns/new',
  '/contacts',
  '/lists',
  '/templates',
  '/integrations',
  '/backups',
  '/settings',
  '/inbox',
  '/forgot-password',
  '/reset-password',
  '/unsubscribe',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/favicon.ico',
];

const PIXEL = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(SHELL).catch(() => {
        // Some shell URLs may redirect (auth) — that's fine; cache the rest.
      }))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // writes go to the outbox, not the SW

  const url = new URL(req.url);
  // Only handle same-origin requests (let fonts etc. pass through).
  if (url.origin !== self.location.origin) return;

  // Tracking pixel: never let offline break email rendering.
  if (url.pathname.startsWith('/api/t')) {
    event.respondWith(
      fetch(req).catch(() =>
        new Response(PIXEL, {
          status: 200,
          headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store' },
        })
      )
    );
    return;
  }

  // API GETs: network-first, cache successful responses, fall back to cache.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() =>
          caches.match(req).then((cached) =>
            cached || new Response(JSON.stringify({ offline: true }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            })
          )
        )
    );
    return;
  }

  // Navigation: network-first, fall back to cached page, then cached home.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() =>
          caches.match(req).then((cached) =>
            cached || caches.match('/login').then((login) => login || caches.match('/'))
          )
        )
    );
    return;
  }

  // Static assets (/_next/static etc.): cache-first.
  event.respondWith(
    caches.match(req).then((cached) =>
      cached ||
      fetch(req).then((res) => {
        if (res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
    )
  );
});
