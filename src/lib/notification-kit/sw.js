// public/sw.js

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
  // event.waitUntil(clients.openWindow('https://example.com'));
});
