// worker/index.ts - Custom Service Worker extension compiled by next-pwa into public/sw.js

self.addEventListener('push', (event: any) => {
  if (!event.data) {
    console.log('[SW] Push recibido sin datos.');
    return;
  }

  let payload: any = {};
  try {
    payload = event.data.json();
  } catch (e) {
    payload = {
      title: 'MotorLog',
      body: event.data.text(),
    };
  }

  const title = payload.title || 'MotorLog - Recordatorio';
  const options: NotificationOptions = {
    body: payload.body || 'Tienes un recordatorio de mantenimiento de vehículo.',
    icon: payload.icon || '/icon-192x192.png',
    badge: '/favicon.png',
    vibrate: [200, 100, 200],
    data: {
      url: payload.url || '/dashboard',
    },
    tag: payload.tag || 'motorlog-service-alert',
  };

  event.waitUntil(
    (self as any).registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event: any) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    (self as any).clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList: any[]) => {
        for (const client of clientList) {
          if (client.url && client.url.includes(targetUrl) && 'focus' in client) {
            return client.focus();
          }
        }
        if ((self as any).clients.openWindow) {
          return (self as any).clients.openWindow(targetUrl);
        }
      })
  );
});
