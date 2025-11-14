# Kit de Notificaciones Push Reutilizable para Next.js y Netlify

Este kit contiene todos los archivos y la lógica necesarios para implementar notificaciones push en una aplicación Next.js desplegada en Netlify, utilizando un cron job externo como EasyCron.

## Cómo Usar Este Kit

### 1. Genera las Claves VAPID

En la terminal de tu proyecto, ejecuta el siguiente comando. Esto solo se hace una vez.

```bash
npx web-push generate-vapid-keys
```

Guarda la **clave pública** y la **clave privada** que se generan.

### 2. Configura las Variables de Entorno

En el panel de control de Netlify para tu sitio, ve a "Site configuration" -> "Environment variables" y añade las siguientes variables:

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`: Pega aquí la **clave pública** que generaste.
- `VAPID_PRIVATE_KEY`: Pega aquí la **clave privada** que generaste.
- `FIREBASE_SERVICE_ACCOUNT_KEY`: Pega aquí el contenido del archivo JSON de tu cuenta de servicio de Firebase.

### 3. Copia los Archivos a tu Nuevo Proyecto

Copia los siguientes archivos de este kit a las ubicaciones correspondientes en tu nuevo proyecto:

1.  `public/sw.js` -> Cópialo a la carpeta `public` de tu proyecto.
2.  `src/lib/notification-kit/notification-manager.tsx` -> Cópialo a `src/components/notifications/notification-manager.tsx`.
3.  `src/lib/notification-kit/subscribe-route.ts` -> Renómbralo a `route.ts` y cópialo a `src/app/api/subscribe/route.ts`.
4.  `src/lib/notification-kit/checkReminders.ts` -> Cópialo a `netlify/functions/checkReminders.ts`.
5.  `src/lib/notification-kit/firestore.rules.txt` -> Usa este contenido para actualizar tu archivo `firestore.rules`.

### 4. Integra el NotificationManager

En el layout principal de tu aplicación (por ejemplo, `src/app/dashboard/layout.tsx`), importa y añade el `NotificationManager` para que se cargue cuando un usuario inicie sesión.

```tsx
// src/app/dashboard/layout.tsx

import dynamic from 'next/dynamic';

// ... otros imports

const ClientOnlyNotificationManager = dynamic(
  () => import('@/components/notifications/notification-manager'),
  { ssr: false }
);

// ... dentro del componente de layout, después de verificar el usuario
<SidebarProvider>
  <ClientOnlyNotificationManager />
  {/* ... el resto de tu layout ... */}
</SidebarProvider>
```

### 5. Adapta la Lógica del Servidor

Abre `netlify/functions/checkReminders.ts`. Este archivo es el motor de tus notificaciones. La parte más importante que debes adaptar es la función `checkAndSendNotifications()`. Dentro de esa función, modifica la lógica para que se ajuste a las necesidades de tu nueva aplicación. Por ejemplo, en lugar de buscar "recordatorios de servicio", podrías buscar "nuevos mensajes" o "tareas pendientes".

### 6. Actualiza `package.json`

Asegúrate de que tu `package.json` contenga las siguientes dependencias:

```json
"dependencies": {
  // ... otras dependencias
  "web-push": "^3.6.7"
},
"devDependencies": {
  // ... otras dependencias
  "netlify-cli": "^17.31.1"
}
```

Luego, ejecuta `npm install`.

### 7. Configura el Cron Job

Finalmente, despliega tu aplicación. Una vez desplegada, ve a un servicio como EasyCron y crea una tarea que llame a la URL de tu función de Netlify en un intervalo regular (por ejemplo, una vez al día).

La URL será: `https://TU-NUEVO-SITIO.netlify.app/.netlify/functions/checkReminders`
