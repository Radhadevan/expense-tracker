const CACHE_NAME = 'exptrk-v4.3';
const ASSETS = [
  './',
  './index.html',
  './style.css?v=4.3',
  './sms-parser.js?v=4.3',
  './sms-bridge.js?v=4.3',
  './app.js?v=4.3',
  './manifest.json',
  './icon.svg',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch((err) => {
        console.warn('[SW] Cache addAll warning:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Pruning old cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // NEVER cache data files, Git raw endpoints, GitHub API, jsDelivr data, or live reload
  if (
    url.includes('shared_store.json') ||
    url.includes('/data/') ||
    url.includes('github.com') ||
    url.includes('githubusercontent.com') ||
    url.includes('jsdelivr.net') ||
    url.includes('/api/') ||
    url.includes('/live-reload-check') ||
    event.request.method !== 'GET'
  ) {
    return; // Pass through to live network without intercepting
  }

  // Network-First strategy: Always fetch freshest assets first; fallback to offline cache if offline
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
