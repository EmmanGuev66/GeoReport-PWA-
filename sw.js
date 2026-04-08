const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';

const APP_SHELL = [
  '/',
  '/index.html',
  '/app.js',
  '/styles.css',
  '/pages/offline.html'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(APP_SHELL))
  );
});


// Activación
self.addEventListener('activate', event => {
  console.log('Service Worker activado');
});

// Fetch (Cache First básico)
self.addEventListener('fetch', event => {

  const req = event.request;

  // App Shell → Cache First
  if (APP_SHELL.includes(new URL(req.url).pathname)) {
    event.respondWith(
      caches.match(req)
    );
    return;
  }

  //Datos -> Network First
  event.respondWith(
    fetch(req)
      .then(res => {
        return caches.open(DYNAMIC_CACHE).then(cache => {
          cache.put(req, res.clone());
          return res;
        });
      })
      .catch(() => caches.match(req) || caches.match('/pages/offline.html'))
  );
});