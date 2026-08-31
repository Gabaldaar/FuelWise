'use client';

import { useEffect, useState } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '../ui/button';
import { BellRing, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { urlBase64ToUint8Array } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (process.env.NODE_ENV !== 'production') {
    return null;
  }

  if (!('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    return registration;
  } catch (error) {
    console.warn('Registro de Service Worker omitido:', error);
    return null;
  }
}

async function subscribeAndSync(user: any, firestore: any): Promise<void> {
  if (process.env.NODE_ENV !== 'production' || !user) return;

  if (!('PushManager' in window) || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) return;

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
    }

    const subscriptionJSON = JSON.parse(JSON.stringify(subscription));

    // Save directly to Firestore
    if (firestore && subscription.endpoint) {
      const docId = encodeURIComponent(subscription.endpoint);
      await setDoc(
        doc(firestore, 'subscriptions', docId),
        {
          userId: user.uid,
          userEmail: user.email || null,
          subscription: subscriptionJSON,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    // Sync with API route
    try {
      const idToken = await user.getIdToken(true);
      await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          subscription: subscriptionJSON,
          userId: user.uid,
          userEmail: user.email,
        }),
      });
    } catch (apiErr) {
      // Ignored if direct DB write succeeded
    }
  } catch (error) {
    console.warn('Auto-sync subscription note:', error);
  }
}

// --- UI COMPONENT ---
function NotificationUI() {
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  useEffect(() => {
    setIsMounted(true);
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const handleRequestAndSubscribe = async () => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Debes iniciar sesión para activar notificaciones.',
      });
      return;
    }

    setIsSubscribing(true);
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);

      if (permission === 'granted') {
        toast({ title: '¡Permiso Concedido!', description: 'Sincronizando con el servidor...' });
        await subscribeAndSync(user, firestore);
        toast({ title: '¡Notificaciones Activadas!', description: 'Todo listo para recibir alertas.' });
      } else {
        toast({
          variant: 'destructive',
          title: 'Permiso Denegado',
          description: 'No podremos enviarte notificaciones.',
        });
      }
    } catch (error: any) {
      console.error('Error durante la suscripción:', error);
      toast({ variant: 'destructive', title: 'Error de Suscripción', description: error.message });
    } finally {
      setIsSubscribing(false);
    }
  };

  if (!isMounted || notificationPermission !== 'default' || process.env.NODE_ENV !== 'production') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-full max-w-sm">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellRing /> Activar Notificaciones
          </CardTitle>
          <CardDescription>Recibe alertas sobre los servicios de mantenimiento importantes.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" onClick={handleRequestAndSubscribe} disabled={isSubscribing}>
            {isSubscribing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Activar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// --- MAIN COMPONENT ---
export default function NotificationManager() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  useEffect(() => {
    const autoProcess = async () => {
      if (
        process.env.NODE_ENV === 'production' &&
        user &&
        'serviceWorker' in navigator &&
        'PushManager' in window
      ) {
        await registerServiceWorker();
        if (Notification.permission === 'granted') {
          await subscribeAndSync(user, firestore);
        }
      }
    };

    if (!isUserLoading) {
      autoProcess();
    }
  }, [user, isUserLoading, firestore]);

  return <NotificationUI />;
}
