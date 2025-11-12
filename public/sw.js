// Este archivo no se transpila, así que debemos usar sintaxis CommonJS y ES5

// Escuchar eventos push
self.addEventListener('push', event => {
  if (!event.data) {
    console.error('Push event pero sin datos');
    return;
  }
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/icon-192x192.png'
    })
  );
});

// Este es el marcador de posición que Workbox busca.
// next-pwa (a través de Workbox) lo reemplazará con el manifiesto de precaché en tiempo de compilación.
// La siguiente línea es intencionalmente dejada para que Workbox la procese.
// No la elimines ni la modifiques, ya que es la solución al error de compilación.
self.__WB_MANIFEST;
