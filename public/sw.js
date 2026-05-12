/**
 * HappyTimesAZ — PWA service worker focused on reliable HOME-SCREEN LAUNCH.
 *
 * Top-level document navigations are NOT intercepted: the browser/OS loads
 * start_url normally. Intercepting navigate + fetch() has been a common source
 * of “install works, tap icon does nothing” on some Android WebViews.
 *
 * Subresource GETs still get a fetch handler (installability / offline-ish fallback).
 */
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
  );
  // Intentionally no clients.claim() — avoids taking control during the first
  // cold-start after install, which can interfere with launcher opens on some devices.
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const isTopLevelDocument =
    event.request.mode === 'navigate' || event.request.destination === 'document';

  if (isTopLevelDocument) {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => new Response('Offline', { status: 503, statusText: 'Offline' }))
  );
});
