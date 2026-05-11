/* HappyTimesAZ — minimal offline shell */
const CACHE = 'happytimes-precache-v1';
const PRECACHE_URLS = ['/', '/index.html', '/css/styles.css', '/assets/logo_GrayBG.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
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
  try {
    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return;
  } catch (e) {
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).catch(() => {
        const accept = req.headers.get('accept') || '';
        if (req.mode === 'navigate' || accept.includes('text/html')) {
          return caches.match('/index.html').then((page) => page || caches.match('/'));
        }
        return caches.match(req);
      });
    })
  );
});
