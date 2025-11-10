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

const NOTIFICATION_COOLDOWN_HOURS = 24;

interface NotificationUIProps {
  reminders: ProcessedServiceReminder[];
  vehicle: Vehicle;
  urgencyThresholdDays: number;
  urgencyThresholdKm: number;
}

function NotificationUI({ reminders, vehicle, urgencyThresholdDays, urgencyThresholdKm }: NotificationUIProps) {
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [showPermissionCard, setShowPermissionCard] = useState(false);

  useEffect(() => {
    setNotificationPermission(Notification.permission);
    if (Notification.permission === 'default') {
      setShowPermissionCard(true);
    }
  }, []);

  const handleRequestPermission = () => {
    Notification.requestPermission().then(permission => {
      setNotificationPermission(permission);
      setShowPermissionCard(false);
    });
  };

  useEffect(() => {
    if (notificationPermission !== 'granted' || reminders.length === 0) {
      return;
    }

    const now = new Date().getTime();
    const notifiedReminders = JSON.parse(localStorage.getItem('notifiedReminders') || '{}');

    reminders.forEach(reminder => {
      if (reminder.isUrgent || reminder.isOverdue) {
        const lastNotificationTime = notifiedReminders[reminder.id];
        const shouldNotify = !lastNotificationTime || now - lastNotificationTime > NOTIFICATION_COOLDOWN_HOURS * 60 * 60 * 1000;

        if (shouldNotify) {
          const title = reminder.isOverdue ? 'Servicio Vencido' : 'Servicio Urgente';
          let body = `${reminder.serviceType} para tu ${vehicle.make} ${vehicle.model}.`;
          
          if (reminder.daysRemaining !== null && reminder.daysRemaining < 0) {
            body += ` Vencido hace ${Math.abs(reminder.daysRemaining)} días.`;
          } else if (reminder.kmsRemaining !== null && reminder.kmsRemaining < 0) {
            body += ` Vencido hace ${Math.abs(reminder.kmsRemaining).toLocaleString()} km.`;
          } else if (reminder.daysRemaining !== null && reminder.daysRemaining <= urgencyThresholdDays) {
            body += ` Faltan ${reminder.daysRemaining} días.`;
          } else if (reminder.kmsRemaining !== null && reminder.kmsRemaining <= urgencyThresholdKm) {
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

  }, [reminders, vehicle, notificationPermission, urgencyThresholdDays, urgencyThresholdKm]);

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


export default function NotificationManager() {
  const { selectedVehicle: vehicle, isLoading: isVehicleLoading } = useVehicles();
  const { user } = useUser();
  const firestore = useFirestore();
  const { urgencyThresholdDays, urgencyThresholdKm } = usePreferences();

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

  const processedReminders = useMemo((): ProcessedServiceReminder[] => {
    const dataIsReady = !isVehicleLoading && !isLoadingReminders && lastOdometer > 0;
    if (!dataIsReady || !serviceReminders) return [];
    
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
  }, [serviceReminders, lastOdometer, urgencyThresholdKm, urgencyThresholdDays, isVehicleLoading, isLoadingReminders]);

  const dataIsReadyForUI = !isVehicleLoading && !isLoadingLastLog && !isLoadingReminders && vehicle && processedReminders.length > 0;

  if (!dataIsReadyForUI) {
    return null;
  }

  return <NotificationUI reminders={processedReminders} vehicle={vehicle} urgencyThresholdDays={urgencyThresholdDays} urgencyThresholdKm={urgencyThresholdKm} />;
}
