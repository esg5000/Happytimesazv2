/* Basic offline cache for static site */
const CACHE_NAME = 'happytimes-v3';
const ASSETS = [
  './',
  './manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

const SANITY_HOSTS = ['cdn.sanity.io', 'api.sanity.io'];
const CACHEABLE_OWN_DOMAIN_RE = /\.(?:css|js|woff2?|ttf|otf|eot|png|jpe?g|gif|svg|webp|ico)(\?.*)?$/i;

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Sanity API/CDN — always network, never cache
  if (SANITY_HOSTS.some((h) => url.hostname === h)) {
    event.respondWith(fetch(req));
    return;
  }

  // Own-domain static assets — cache first, then network
  if (url.hostname === self.location.hostname && CACHEABLE_OWN_DOMAIN_RE.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
          return res;
        });
      })
    );
    return;
  }

  // Everything else — network only, no caching
  event.respondWith(
    fetch(req).catch(() => caches.match('./index.html'))
  );
});
