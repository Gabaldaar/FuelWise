// public/sw.js

self.addEventListener('push', event => {
  const promiseChain = event.data.json().then(data => {
    const options = {
      body: data.body,
      icon: data.icon || '/icon-192x192.png',
      badge: '/icon-192x192.png',
      tag: data.tag, // Agrupa notificaciones
      renotify: true, // Permite que nuevas notificaciones con el mismo tag vuelvan a sonar/vibrar
      data: {
        url: data.url, // Almacena la URL para usarla en el evento 'click'
      },
    };
    return self.registration.showNotification(data.title, options);
  });
  event.waitUntil(promiseChain);
});


self.addEventListener('notificationclick', event => {
  const notification = event.notification;
  const urlToOpen = notification.data?.url || '/'; // Usa la URL de la notificación o la raíz como fallback

  notification.close();

  // Esta lógica es más robusta en móviles. Le dice al navegador que abra la URL.
  // Si la app ya está abierta, el navegador la pondrá en foco.
  const promiseChain = clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  }).then((clientList) => {
    if (clientList.length > 0) {
      // Intenta encontrar un cliente ya abierto en la misma URL para enfocarlo.
      let client = clientList.find(c => c.url === urlToOpen && 'focus' in c);
      if (!client) {
        // Si no lo encuentra, toma el primer cliente disponible.
        client = clientList[0];
      }
       if (client && 'focus' in client) {
          // Navega el cliente existente a la URL deseada y lo enfoca.
          client.navigate(urlToOpen);
          return client.focus();
       }
    }
    // Si no hay clientes o no se pueden enfocar, abre una nueva ventana.
    return clients.openWindow(urlToOpen);
  });

  event.waitUntil(promiseChain);
});
