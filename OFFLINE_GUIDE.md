# Guía Rápida para Implementar Funcionalidad Offline en Next.js + Firebase

Esta guía resume los pasos necesarios para habilitar el acceso sin conexión en una Progressive Web App (PWA) construida con Next.js y Firebase, asegurando que la aplicación cargue y muestre datos cacheados cuando no hay conexión a internet.

## Paso 1: Crear un Service Worker Robusto

El Service Worker es un script que el navegador ejecuta en segundo plano, separado de la página web. Es la pieza clave para interceptar peticiones de red y gestionar la caché.

Crea un archivo llamado `sw.js` en la carpeta `public/` de tu proyecto con el siguiente contenido.

```javascript
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
```

## Paso 2: Registrar el Service Worker en la Aplicación

La aplicación necesita registrar el `sw.js` en el navegador del usuario. Para esto, crea un componente que se ejecute del lado del cliente.

Crea un archivo en `src/components/pwa-setup.tsx` (o similar) con este código:

```tsx
"use client";

import { useEffect } from "react";

const PwaSetup = () => {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => console.log("Service Worker registrado con éxito:", registration))
        .catch((error) => console.log("Error en el registro del Service Worker:", error));
    }
  }, []);

  return null;
};

export default PwaSetup;
```
Luego, importa y usa este componente en tu layout principal (`src/app/layout.tsx`).

## Paso 3: Activar la Persistencia Offline de Firestore

Esta es la clave para que los datos (propiedades, inquilinos, etc.) estén disponibles sin conexión. Firebase tiene una funcionalidad nativa para esto que es muy potente.

En tu archivo de configuración de Firebase (`src/lib/firebase.ts` o donde inicialices la app), añade la llamada a `enableIndexedDbPersistence`.

```ts
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";

const firebaseConfig = {
  // ... tu configuración de Firebase
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

auth = getAuth(app);
db = getFirestore(app);

// ¡LÍNEA CLAVE! Activa la persistencia local.
enableIndexedDbPersistence(db)
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      console.warn('Persistencia de Firestore falló: múltiples pestañas abiertas.');
    } else if (err.code == 'unimplemented') {
      console.warn('Persistencia de Firestore no es soportada en este navegador.');
    }
  });

export { app, auth, db };
```
Con esto, Firebase automáticamente guardará los datos de las consultas `getDocs` en una base de datos local (IndexedDB) y los servirá desde ahí cuando no haya conexión.

## Paso 4: (Recomendado) Añadir un Aviso de "Sin Conexión"

Es una buena práctica informar al usuario que está trabajando sin conexión.

En tu componente de layout principal (ej. `src/components/main-layout.tsx`), puedes añadir un detector de estado de red y mostrar un banner.

```tsx
'use client';

import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

// Un componente simple para el aviso
function OfflineWarning({ isOnline }: { isOnline: boolean }) {
    if (isOnline) {
        return null;
    }
    return (
        <div className="bg-yellow-500 text-black text-center p-2 text-sm font-semibold flex items-center justify-center gap-2">
            <WifiOff className="h-4 w-4" />
            <span>Estás trabajando sin conexión. Algunos datos pueden no estar actualizados.</span>
        </div>
    );
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Definir el estado inicial
    if (typeof navigator !== 'undefined') {
        setIsOnline(navigator.onLine);
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div>
        {/* ... Tu estructura de header/sidebar ... */}
        <header>
            {/* ... */}
        </header>
        <OfflineWarning isOnline={isOnline} />
        <main>{children}</main>
    </div>
  );
}
```

Con estos 4 pasos, la aplicación tendrá una funcionalidad offline robusta y confiable.
