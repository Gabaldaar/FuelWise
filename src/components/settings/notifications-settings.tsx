'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useUser, useFirestore } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { urlBase64ToUint8Array } from '@/lib/utils';
import {
  Bell,
  BellRing,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Send,
  Loader2,
  RefreshCw,
  Smartphone,
} from 'lucide-react';

export default function NotificationsSettings() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [permission, setPermission] = useState<string>('default');
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [isActivating, setIsActivating] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isCheckingCron, setIsCheckingCron] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setIsSupported(false);
      return;
    }

    setPermission(Notification.permission);

    // Check if subscription already exists in service worker
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        setIsSubscribed(!!sub);
      })
      .catch((err) => console.log('Error checking subscription:', err));
  }, []);

  const handleSubscribe = async () => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Debes iniciar sesión para activar las notificaciones.',
      });
      return;
    }

    setIsActivating(true);
    try {
      // 1. Request permission
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== 'granted') {
        toast({
          variant: 'destructive',
          title: 'Permiso Denegado',
          description: 'Debes permitir las notificaciones en la configuración de tu navegador.',
        });
        setIsActivating(false);
        return;
      }

      // 2. Register service worker
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // 3. Subscribe with VAPID Key
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        throw new Error('No se encontró la clave pública VAPID.');
      }

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
      }

      const subscriptionJSON = JSON.parse(JSON.stringify(sub));

      // 4. Save directly to Firestore for 100% reliable real-time sync
      try {
        const docId = encodeURIComponent(sub.endpoint);
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
      } catch (dbErr: any) {
        console.warn('Firestore direct write notice:', dbErr.message);
      }

      // 5. Also sync with backend API
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
        console.warn('API sync notice:', apiErr);
      }

      setIsSubscribed(true);
      toast({
        title: '¡Notificaciones Activadas!',
        description: 'Este dispositivo recibirá alertas de recordatorios de mantenimiento.',
      });
    } catch (error: any) {
      console.error('Error al suscribir:', error);
      toast({
        variant: 'destructive',
        title: 'Error de Activación',
        description: error.message || 'No se pudo completar la suscripción.',
      });
    } finally {
      setIsActivating(false);
    }
  };

  const handleSendTestPush = async () => {
    if (!user) return;

    setIsTesting(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();

      const res = await fetch('/api/send-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: sub ? JSON.parse(JSON.stringify(sub)) : undefined,
          userId: user.uid,
          payload: {
            title: '🚗 MotorLog - Prueba Exitosa',
            body: '¡Las notificaciones push están funcionando perfectamente en este dispositivo!',
            url: '/dashboard',
          },
        }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch (e) {
        data = { error: `Error del servidor (HTTP ${res.status})` };
      }

      if (!res.ok) {
        throw new Error(data.error || data.message || 'No se pudo enviar la notificación de prueba.');
      }

      toast({
        title: '¡Notificación Enviada!',
        description: 'Revisa la barra de notificaciones de tu dispositivo.',
      });
    } catch (error: any) {
      console.error('Error enviando prueba:', error);
      toast({
        variant: 'destructive',
        title: 'Error en la Prueba',
        description: error.message || 'Asegúrate de haber activado las notificaciones primero.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleManualCronCheck = async () => {
    setIsCheckingCron(true);
    try {
      const res = await fetch('/api/cron/check-reminders', { method: 'POST' });
      let data: any = {};
      try {
        data = await res.json();
      } catch (e) {
        data = { error: `Error del servidor (HTTP ${res.status})` };
      }

      if (!res.ok) {
        throw new Error(data.error || data.details || 'Error al ejecutar verificación.');
      }

      toast({
        title: 'Verificación Completada',
        description: data.message || 'Se evaluaron todos los recordatorios.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error en Verificación',
        description: error.message || 'No se pudo ejecutar la revisión.',
      });
    } finally {
      setIsCheckingCron(false);
    }
  };

  if (!isSupported) {
    return (
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <XCircle /> Notificaciones no soportadas
          </CardTitle>
          <CardDescription>
            Este navegador o entorno no soporta el estándar Web Push de notificaciones.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estado Actual */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Smartphone className="h-5 w-5 text-primary" />
                Estado en este Dispositivo
              </CardTitle>
              <CardDescription>
                Configuración del servicio de alertas en tiempo real para tu navegador o PWA.
              </CardDescription>
            </div>
            <div>
              {permission === 'granted' ? (
                <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 py-1 px-3">
                  <CheckCircle2 className="h-4 w-4" /> Notificaciones Permitidas
                </Badge>
              ) : permission === 'denied' ? (
                <Badge variant="destructive" className="flex items-center gap-1.5 py-1 px-3">
                  <XCircle className="h-4 w-4" /> Bloqueadas por el Navegador
                </Badge>
              ) : (
                <Badge variant="secondary" className="flex items-center gap-1.5 py-1 px-3">
                  <AlertTriangle className="h-4 w-4" /> Permiso Pendiente
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Al activar las notificaciones, MotorLog te avisará cuando un service o mantenimiento de tus vehículos esté próximo a vencer o vencido por fecha o kilometraje.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button onClick={handleSubscribe} disabled={isActivating} className="flex items-center gap-2">
              {isActivating ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />}
              {permission === 'granted' ? 'Re-sincronizar Dispositivo' : 'Activar Notificaciones'}
            </Button>

            <Button
              variant="outline"
              onClick={handleSendTestPush}
              disabled={isTesting || permission !== 'granted'}
              className="flex items-center gap-2"
            >
              {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar Notificación de Prueba
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Control de Verificación Automática */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <RefreshCw className="h-5 w-5 text-primary" />
            Verificación y Envío de Recordatorios
          </CardTitle>
          <CardDescription>
            El sistema evalúa periódicamente todos los vehículos y envía avisos automáticos a los usuarios cuando se aproxima la fecha o kilometraje programado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Puedes forzar una verificación manual en este momento para comprobar si existen mantenimientos vencidos en tu garaje y disparar las alertas pendientes.
          </p>
          <Button
            variant="secondary"
            onClick={handleManualCronCheck}
            disabled={isCheckingCron}
            className="flex items-center gap-2"
          >
            {isCheckingCron ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Comprobar Recordatorios Vencidos Ahora
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
