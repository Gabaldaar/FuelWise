// public/sw.js

self.addEventListener('push', event => {
  // Encadenamos la promesa para manejar los datos asíncronos correctamente.
  const promiseChain = event.data.json().then(data => {
    const options = {
      body: data.body,
      icon: data.icon || '/icon-192x192.png',
      badge: '/icon-192x192.png',
      // El tag agrupa notificaciones. Una nueva con el mismo tag reemplaza a la anterior.
      tag: data.tag, 
      // Permite que una nueva notificación con el mismo tag vuelva a alertar al usuario (vibración/sonido).
      renotify: true,
    };
    return self.registration.showNotification(data.title, options);
  });

  event.waitUntil(promiseChain);
});


self.addEventListener('notificationclick', event => {
  event.notification.close();

  // Esta lógica abre la aplicación o la enfoca si ya está abierta.
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientsArr => {
      const hadWindowToFocus = clientsArr.some(windowClient =>
        windowClient.url.includes(self.location.origin)
          ? (windowClient.focus(), true)
          : false
      );

      if (!hadWindowToFocus) {
        clients.openWindow(self.location.origin).then(client => (client ? client.focus() : null));
      }
    })
  );
});

// El resto de la lógica del service worker (cache, etc.) se mantiene.
// Este archivo está auto-generado por next-pwa, por lo que solo debemos añadir
// los listeners para 'push' y 'notificationclick'. El resto del código lo gestiona el plugin.
