
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { useVehicles } from '@/context/vehicle-context';
import { usePreferences } from '@/context/preferences-context';
import type { ProcessedFuelLog, ProcessedServiceReminder, ServiceReminder, Vehicle } from '@/lib/types';
import { differenceInDays } from 'date-fns';
import { Button } from '../ui/button';
import { BellRing } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import dynamic from 'next/dynamic';

const NOTIFICATION_COOLDOWN_HOURS = 48;

interface NotificationUIProps {
  reminders: ProcessedServiceReminder[];
  vehicle: Vehicle;
}

function NotificationUI({ reminders, vehicle }: NotificationUIProps) {
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [showPermissionCard, setShowPermissionCard] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // This effect runs only on the client, after mount.
    setIsMounted(true);
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
      if (Notification.permission === 'default') {
        setShowPermissionCard(true);
      }
    }
  }, []);

  const handleRequestPermission = () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      console.log('[Notificaciones] Solicitando permiso...');
      Notification.requestPermission().then(permission => {
        console.log(`[Notificaciones] Permiso: ${permission}`);
        setNotificationPermission(permission);
        setShowPermissionCard(false);
      });
    }
  };

  useEffect(() => {
    if (!isMounted) {
      console.log('[Notificaciones] El componente UI no está montado. Esperando...');
      return;
    }
    if (notificationPermission !== 'granted') {
      console.log(`[Notificaciones] Permiso no otorgado (${notificationPermission}). Saltando lógica.`);
      return;
    }
    if (reminders.length === 0) {
      console.log('[Notificaciones] No hay recordatorios urgentes para mostrar.');
      return;
    }
    if (!vehicle) {
      console.log('[Notificaciones] Objeto de vehículo no disponible. Saltando.');
      return;
    }
    
    console.log(`[Notificaciones] Iniciando revisión de ${reminders.length} recordatorio(s) urgente(s)...`);

    try {
      const now = new Date().getTime();
      const notifiedReminders = JSON.parse(localStorage.getItem('notifiedReminders') || '{}');
      console.log('[Notificaciones] Recordatorios previamente notificados:', notifiedReminders);

      reminders.forEach(reminder => {
        if (reminder.isUrgent || reminder.isOverdue) {
          const lastNotificationTime = notifiedReminders[reminder.id];
          const shouldNotify = !lastNotificationTime || now - lastNotificationTime > NOTIFICATION_COOLDOWN_HOURS * 60 * 60 * 1000;
          
          console.log(`[Notificaciones] Revisando recordatorio "${reminder.serviceType}" (ID: ${reminder.id}). ¿Debería notificar? ${shouldNotify}`);

          if (shouldNotify) {
            console.log(`[Notificaciones] ¡Disparando notificación para "${reminder.serviceType}"!`);
            const title = reminder.isOverdue ? 'Servicio Vencido' : 'Servicio Urgente';
            let body = `${reminder.serviceType} para tu ${vehicle.make} ${vehicle.model}.`;
            
            if (reminder.daysRemaining !== null && reminder.daysRemaining < 0) {
              body += ` Vencido hace ${Math.abs(reminder.daysRemaining)} días.`;
            } else if (reminder.kmsRemaining !== null && reminder.kmsRemaining < 0) {
              body += ` Vencido hace ${Math.abs(reminder.kmsRemaining).toLocaleString()} km.`;
            } else if (reminder.daysRemaining !== null) {
              body += ` Faltan ${reminder.daysRemaining} días.`;
            } else if (reminder.kmsRemaining !== null) {
              body += ` Faltan ${reminder.kmsRemaining.toLocaleString()} km.`;
            }

            const notification = new Notification(title, {
              body,
              icon: '/icon-192x192.png',
              badge: '/icon-192x192.png',
              tag: reminder.id,
            });

            notifiedReminders[reminder.id] = now;
          }
        }
      });

      localStorage.setItem('notifiedReminders', JSON.stringify(notifiedReminders));
      console.log('[Notificaciones] Estado de notificaciones actualizado en localStorage.');

    } catch (error) {
        console.error("===== ERROR EN NOTIFICACIONES =====");
        console.error("Se produjo un error al intentar mostrar una notificación.");
        console.error("Error:", error);
        console.error("Datos en el momento del error:", { reminders, vehicle });
        console.error("===================================");
    }

  }, [reminders, vehicle, notificationPermission, isMounted]);

  if (!isMounted) {
    return null; // Don't render anything until we are sure we are on the client.
  }

  if (notificationPermission === 'default' && showPermissionCard) {
    return (
      <div className="fixed bottom-4 right-4 z-50 w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BellRing /> Activar Notificaciones</CardTitle>
            <CardDescription>Recibe alertas sobre los servicios de mantenimiento importantes.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={handleRequestPermission}>Activar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}

function NotificationManager() {
  const { selectedVehicle: vehicle, isLoading: isVehicleLoading } = useVehicles();
  const { user } = useUser();
  const firestore = useFirestore();
  const { urgencyThresholdDays, urgencyThresholdKm } = usePreferences();
  const [dataIsReadyForUI, setDataIsReadyForUI] = useState(false);


  const lastFuelLogQuery = useMemoFirebase(() => {
    if (!user || !vehicle) return null;
    return query(
      collection(firestore, 'vehicles', vehicle.id, 'fuel_records'),
      orderBy('odometer', 'desc'),
      limit(1)
    );
  }, [firestore, user, vehicle]);

  const remindersQuery = useMemoFirebase(() => {
    if (!user || !vehicle) return null;
    return query(collection(firestore, 'vehicles', vehicle.id, 'service_reminders'));
  }, [firestore, user, vehicle]);

  const { data: lastFuelLogData, isLoading: isLoadingLastLog } = useCollection<ProcessedFuelLog>(lastFuelLogQuery);
  const { data: serviceReminders, isLoading: isLoadingReminders } = useCollection<ServiceReminder>(remindersQuery);
  
  const lastOdometer = useMemo(() => lastFuelLogData?.[0]?.odometer || 0, [lastFuelLogData]);

  useEffect(() => {
      // This effect determines if all the necessary data is loaded and valid.
      const isReady = !isVehicleLoading && !isLoadingLastLog && !isLoadingReminders && !!vehicle && lastOdometer > 0;
      if (isReady && !dataIsReadyForUI) {
        console.log('[Notificaciones] Todos los datos están listos. Procediendo a procesar.');
        setDataIsReadyForUI(true);
      } else if (!isReady) {
        // This will reset if vehicle changes, etc.
        setDataIsReadyForUI(false);
      }
  }, [isVehicleLoading, isLoadingLastLog, isLoadingReminders, vehicle, lastOdometer, dataIsReadyForUI]);


  const processedReminders = useMemo((): ProcessedServiceReminder[] => {
    // Guard clause: do not process until all data is ready.
    if (!dataIsReadyForUI || !serviceReminders || !lastOdometer) {
       console.log('[Notificaciones] Datos no listos para procesar recordatorios.');
      return [];
    }
    console.log(`[Notificaciones] Procesando ${serviceReminders.length} recordatorios con odómetro: ${lastOdometer}`);
    
    return serviceReminders
      .filter(r => !r.isCompleted)
      .map(r => {
        const kmsRemaining = r.dueOdometer ? r.dueOdometer - lastOdometer : null;
        const daysRemaining = r.dueDate ? differenceInDays(new Date(r.dueDate), new Date()) : null;
        const isOverdue = (kmsRemaining !== null && kmsRemaining < 0) || (daysRemaining !== null && daysRemaining < 0);
        const isUrgent = !isOverdue && (
          (kmsRemaining !== null && kmsRemaining <= urgencyThresholdKm) ||
          (daysRemaining !== null && daysRemaining <= urgencyThresholdDays)
        );
        return { ...r, kmsRemaining, daysRemaining, isOverdue, isUrgent };
      });
  }, [serviceReminders, lastOdometer, urgencyThresholdKm, urgencyThresholdDays, dataIsReadyForUI]);

  // Only render the UI component when data is fully ready.
  if (!dataIsReadyForUI) {
    console.log('[Notificaciones] Manager esperando que los datos estén listos...');
    return null;
  }

  const urgentReminders = processedReminders.filter(r => r.isOverdue || r.isUrgent);
  
  return <NotificationUI reminders={urgentReminders} vehicle={vehicle as Vehicle} />;
}


// We use dynamic export to ensure it only renders on the client
const ClientOnlyNotificationManager = dynamic(() => Promise.resolve(NotificationManager), {
  ssr: false,
});

export default ClientOnlyNotificationManager;
