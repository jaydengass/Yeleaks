const CACHE_NAME = 'yeleaks-v3';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/Icon.png'
];

const STATIC_EXTENSIONS = /\.(js|css|ts|tsx|png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|eot)(\?.*)?$/;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isAppShell = APP_SHELL.includes(url.pathname);
  const isStaticAsset = STATIC_EXTENSIONS.test(url.pathname);
  const isAPI = url.pathname.startsWith('/api/') || url.pathname.startsWith('/proxy') || url.searchParams.has('proxy_audio');

  if (isAPI) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (isAppShell || isStaticAsset) {
    event.respondWith(
      fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return networkResponse;
      }).catch(() => caches.match(event.request))
    );
  } else {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return networkResponse;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
  }
});
