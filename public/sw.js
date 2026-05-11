/* HappyTimesAZ — minimal offline shell (paths relative to this script / registration scope) */
const CACHE = 'happytimes-precache-v2';

function precacheUrls() {
  const scope = self.registration.scope;
  return [
    new URL('./', scope).href,
    new URL('index.html', scope).href,
    new URL('css/styles.css', scope).href,
    new URL('assets/logo_GrayBG.png', scope).href,
  ];
}

function indexFallbackUrl() {
  return new URL('index.html', self.registration.scope).href;
}

function rootFallbackUrl() {
  return new URL('./', self.registration.scope).href;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(precacheUrls()))
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.warn('[sw] precache failed', err);
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  let url;
  try {
    url = new URL(req.url);
    if (url.origin !== self.location.origin) return;
  } catch (e) {
    return;
  }

  const scopePrefix = self.registration.scope;
  if (!url.href.startsWith(scopePrefix)) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).catch(() => {
        const accept = req.headers.get('accept') || '';
        if (req.mode === 'navigate' || accept.includes('text/html')) {
          return caches.match(indexFallbackUrl()).then((page) => page || caches.match(rootFallbackUrl()));
        }
        return caches.match(req);
      });
    })
  );
});
