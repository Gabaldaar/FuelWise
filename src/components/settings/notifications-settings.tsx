'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useUser, useFirestore } from '@/firebase';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { urlBase64ToUint8Array } from '@/lib/utils';
import {
  Bell,
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

    // Check if active subscription exists in service worker
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        setIsSubscribed(!!sub);
      })
      .catch((err) => console.log('Error verificando suscripción previa:', err));
  }, []);

  const handleToggleNotifications = async (enable: boolean) => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Debes iniciar sesión para configurar las notificaciones.',
      });
      return;
    }

    setIsActivating(true);
    try {
      if (enable) {
        // --- ACTIVAR NOTIFICACIONES ---
        const result = await Notification.requestPermission();
        setPermission(result);

        if (result !== 'granted') {
          toast({
            variant: 'destructive',
            title: 'Permiso Denegado',
            description: 'Debes autorizar las notificaciones en los ajustes de tu navegador.',
          });
          setIsActivating(false);
          return;
        }

        const reg = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;

        const vapidKey =
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
          'BCSVEMyiP_wAzlwp4_HT68djG5Ukbj2eXcUHyP4TX28W09Sw_y7GdMqDjzaRq7UJBPwlo6nIVFiSg06CF0P9vxo';

        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey),
          });
        }

        const subscriptionJSON = JSON.parse(JSON.stringify(sub));

        // 1. Guardar en Firestore
        const docId = encodeURIComponent(sub.endpoint);
        await setDoc(
          doc(firestore, 'subscriptions', docId),
          {
            userId: user.uid,
            userEmail: user.email || null,
            subscription: subscriptionJSON,
            enabled: true,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        // 2. Sincronizar en API
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
        } catch (e) {
          // Sync secundario
        }

        setIsSubscribed(true);
        toast({
          title: '🔔 Notificaciones Activadas',
          description: 'Este dispositivo recibirá alertas de servicios de mantenimiento.',
        });
      } else {
        // --- DESACTIVAR NOTIFICACIONES ---
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();

        if (sub) {
          // Eliminar de Firestore
          const docId = encodeURIComponent(sub.endpoint);
          await deleteDoc(doc(firestore, 'subscriptions', docId)).catch(() => {});
          // Cancelar suscripción del navegador
          await sub.unsubscribe().catch(() => {});
        }

        setIsSubscribed(false);
        toast({
          title: '🔕 Notificaciones Desactivadas',
          description: 'Este dispositivo ya no recibirá avisos automáticos.',
        });
      }
    } catch (error: any) {
      console.error('Error al cambiar estado de notificaciones:', error);
      toast({
        variant: 'destructive',
        title: 'Error de Configuración',
        description: error.message || 'No se pudo actualizar el estado de las notificaciones.',
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
            title: '🚗 MotorLog - Notificación de Prueba',
            body: '¡El sistema de alertas push está funcionando correctamente en este equipo!',
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
      {/* Control Principal con Interruptor On/Off */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Smartphone className="h-5 w-5 text-primary" />
                Control de Notificaciones en este Dispositivo
              </CardTitle>
              <CardDescription>
                Activa o desactiva las alertas automáticas de mantenimiento en este navegador o teléfono.
              </CardDescription>
            </div>
            <div>
              {permission === 'granted' && isSubscribed ? (
                <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 py-1 px-3">
                  <CheckCircle2 className="h-4 w-4" /> Alertas Activas
                </Badge>
              ) : permission === 'denied' ? (
                <Badge variant="destructive" className="flex items-center gap-1.5 py-1 px-3">
                  <XCircle className="h-4 w-4" /> Bloqueadas en Navegador
                </Badge>
              ) : (
                <Badge variant="secondary" className="flex items-center gap-1.5 py-1 px-3">
                  <AlertTriangle className="h-4 w-4" /> Desactivadas
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Interruptor ON/OFF */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-card/60">
            <div className="space-y-1 pr-4">
              <Label htmlFor="notifications-switch" className="text-base font-semibold flex items-center gap-2 cursor-pointer">
                <Bell className="h-4 w-4 text-primary" />
                Notificaciones de Recordatorios
              </Label>
              <p className="text-xs text-muted-foreground">
                {isSubscribed
                  ? 'Activado: Recibirás avisos cuando venza un service por fecha o kilometraje.'
                  : 'Desactivado: Este equipo no recibirá notificaciones ni alertas sonoras.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isActivating && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
              <Switch
                id="notifications-switch"
                checked={isSubscribed}
                onCheckedChange={handleToggleNotifications}
                disabled={isActivating}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={handleSendTestPush}
              disabled={isTesting || !isSubscribed}
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
            Verificación de Mantenimientos del Garaje
          </CardTitle>
          <CardDescription>
            El sistema evalúa periódicamente todos los vehículos de tu flota y envía avisos a los dispositivos que tengan las notificaciones activadas.
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
