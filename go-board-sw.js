// Service worker for the go-board PWA. Caches the app shell so the page
// loads instantly and works offline (after the first online visit).
//
// Bump CACHE_VERSION whenever go-board.html (or other shell files) change so
// returning users pick up the new release.
const CACHE_VERSION = 'goboard-v35';
const SHELL_FILES = [
  './go-board.html',
  './go-board-manifest.webmanifest',
  './go-board-icon.svg',
  './go-board-icon-maskable.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  // Don't touch cross-origin requests (PeerJS CDN, PeerJS signaling, STUN, etc.)
  if(url.origin !== self.location.origin) return;
  // Stale-while-revalidate for shell files.
  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req).then((res) => {
        if(res && res.status === 200){
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || networkFetch;
    })
  );
});
