const CACHE_NAME = 'mi-app-cache-v1';
// Lista de recursos esenciales para la "carcasa" de la aplicación.
const urlsToCache = [
  '/',
  '/manifest.json',
  // Agrega aquí los íconos y otros assets estáticos cruciales
];

// 1. Instalación del Service Worker: Cachear la carcasa de la aplicación.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierto');
        return cache.addAll(urlsToCache);
      })
  );
});

// 2. Activación del Service Worker: Limpiar cachés antiguas.
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Borrando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 3. Interceptación de Peticiones (Fetch)
self.addEventListener('fetch', event => {
  const { request } = event;

  // No interceptar peticiones de la API de Firestore
  if (request.url.includes('firestore.googleapis.com')) {
    return;
  }
  
  // Estrategia "Network First" para la navegación y otros recursos.
  event.respondWith(
    fetch(request)
      .then(response => {
        // Si la petición a la red es exitosa, la usamos y la guardamos en caché.
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(request, responseToCache);
            });
        }
        return response;
      })
      .catch(() => {
        // Si la red falla (estamos offline), intentamos servir desde la caché.
        return caches.match(request).then(response => {
          if (response) {
            return response;
          }
          // Opcional: Podrías devolver una página offline personalizada aquí si no se encuentra en caché.
        });
      })
  );
});

self.addEventListener('push', function (event) {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: data.icon || '/icon-192x192.png',
    badge: '/icon-192x192.png',
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  // TODO: Define un comportamiento al hacer clic, como abrir una URL específica.
  // Por ejemplo:
  // event.waitUntil(clients.openWindow('/dashboard'));
});
