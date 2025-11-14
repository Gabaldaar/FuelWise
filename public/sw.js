const CACHE_NAME = 'motorlog-cache-v2'; // Incremented cache version
// Lista de recursos esenciales para la "carcasa" de la aplicación.
const urlsToCache = [
  '/',
  '/manifest.json',
  // Los assets estáticos (JS, CSS) son cacheados automáticamente por la estrategia.
  // Íconos y fuentes pueden ser añadidos aquí si es necesario, pero la estrategia de cache los cubrirá.
];

// 1. Instalación del Service Worker: Cachear la carcasa de la aplicación.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cache abierto, añadiendo app shell');
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
            console.log('[SW] Borrando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// 3. Interceptación de Peticiones (Fetch)
self.addEventListener('fetch', event => {
  const { request } = event;

  // No interceptar peticiones a la API de Firestore o a la API de Genkit.
  if (request.url.includes('firestore.googleapis.com') || request.url.includes('/api/genkit')) {
    // Dejar que el navegador las maneje, permitiendo que la persistencia offline de Firestore funcione.
    return;
  }
  
  // Estrategia "Cache First" para las solicitudes de navegación (páginas HTML)
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match(request)
        .then(response => {
          if (response) {
            // Servir desde la caché inmediatamente.
            console.log('[SW] Sirviendo desde caché (navigate):', request.url);
            return response;
          }
          // Si no está en caché, ir a la red.
          console.log('[SW] No en caché, yendo a red (navigate):', request.url);
          return fetch(request);
        })
    );
    return;
  }

  // Estrategia "Stale-While-Revalidate" para assets estáticos (CSS, JS, imágenes)
  // Sirve rápido desde la caché, pero actualiza la caché en segundo plano.
  if (request.destination === 'style' || request.destination === 'script' || request.destination === 'image' || request.destination === 'font') {
      event.respondWith(
        caches.open(CACHE_NAME).then(cache => {
            return cache.match(request).then(cachedResponse => {
                const fetchedResponsePromise = fetch(request).then(networkResponse => {
                    if (networkResponse.ok) {
                        cache.put(request, networkResponse.clone());
                    }
                    return networkResponse;
                });
                return cachedResponse || fetchedResponsePromise;
            });
        })
    );
    return;
  }


  // Estrategia "Network First" para todas las demás peticiones (APIs, etc.)
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
        console.log('[SW] Red falló, buscando en caché:', request.url);
        return caches.match(request).then(response => {
          if (response) {
            return response;
          }
          // Opcional: Podrías devolver una página offline personalizada aquí si no se encuentra en caché.
        });
      })
  );
});
