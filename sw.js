const CACHE_NAME = 'c3d-inventory-offline-v2';
const APP_PATH = '/C3D-Inventory/';
const APP_URL = APP_PATH + 'index.html';
const TEST_URL = APP_PATH + 'C3D_Rev6_Isolated_TEST.html';

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll([
        APP_PATH,
        APP_URL,
        TEST_URL
      ]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key =>
          key.startsWith('c3d-inventory-offline-') &&
          key !== CACHE_NAME
        ).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin ||
      !url.pathname.startsWith(APP_PATH)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const key = url.pathname;

    try {
      const response = await fetch(event.request);

      if (response.ok) {
        try {
          await cache.put(key, response.clone());
        } catch (error) {
          console.warn('Cache update failed', error);
        }
      }

      return response;
    } catch (error) {
      const cached = await cache.match(key);

      if (cached) return cached;

      return new Response(
        'This page is not available offline. Reconnect to Wi-Fi and open it again.',
        {
          status: 503,
          headers: {
            'Content-Type': 'text/plain'
          }
        }
      );
    }
  })());
});
