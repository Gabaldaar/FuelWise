// netlify/functions/checkReminders.ts
'use server';

import type { Handler } from '@netlify/functions';
import admin from '@/firebase/admin';
import webpush, { type PushSubscription } from 'web-push';
import { differenceInHours } from 'date-fns';

const db = admin.firestore();

// ==================================================================
// ESTA ES LA SECCIÓN QUE DEBES ADAPTAR PARA TU NUEVA APLICACIÓN
// ==================================================================

/**
 * Representa los datos que necesitas para construir tu notificación.
 * ADÁPTALO: Cambia esta interfaz para que coincida con lo que tu app necesita.
 * Por ejemplo: { taskId: string, taskName: string, userToNotify: string }
 */
interface NotificationTriggerData {
  id: string; // ID del documento que dispara la notificación (ej: un recordatorio)
  title: string;
  body: string;
  icon?: string;
  lastNotificationSent?: string | null;
  docPath: string; // Ruta completa al documento en Firestore para actualizarlo.
}


/**
 * Obtiene los datos de Firestore que deberían disparar una notificación.
 * ADÁPTALO: Esta es la lógica central. Reemplázala con tus propias consultas
 * para encontrar los elementos que necesitan notificación (ej. tareas vencidas, etc.).
 */
async function checkAndSendNotifications() {
    let notificationsSent = 0;
    
    // TIEMPO DE ENFRIAMIENTO: No enviar notificaciones para el mismo recordatorio más de una vez cada X horas.
    const NOTIFICATION_COOLDOWN_HOURS = 1;

    // --- COMIENZO DE LÓGICA PERSONALIZABLE ---
    
    // Ejemplo para la app MotorLog: buscar recordatorios de servicio urgentes.
    const remindersSnap = await db.collectionGroup('service_reminders').where('isCompleted', '==', false).get();
    if (remindersSnap.empty) {
        console.log('[CRON] No pending reminders found.');
        return 0;
    }
    
    const notificationTriggers: NotificationTriggerData[] = [];
    
    for (const doc of remindersSnap.docs) {
        const reminder = doc.data();
        const vehicleId = doc.ref.parent.parent?.id; // Obtener el ID del vehículo desde la ruta
        if (!vehicleId) continue;
        
        // Simulación de lógica de "urgencia" (deberías adaptarla)
        const isUrgent = true; // Aquí iría tu lógica real
        
        if (isUrgent) {
            notificationTriggers.push({
                id: doc.id,
                title: 'Alerta de Servicio',
                body: `Tu servicio "${reminder.serviceType}" está próximo o vencido.`,
                icon: '/icon-192x192.png',
                lastNotificationSent: reminder.lastNotificationSent,
                docPath: doc.ref.path
            });
        }
    }
    
    // --- FIN DE LÓGICA PERSONALIZABLE ---

    if (notificationTriggers.length === 0) {
        console.log('[CRON] No items triggered a notification.');
        return 0;
    }

    const subscriptions = await getAllSubscriptions();
    if (subscriptions.length === 0) {
        console.log('[CRON] No active push subscriptions found.');
        return 0;
    }
    
    // Enviar notificaciones
    for (const trigger of notificationTriggers) {
        const lastSent = trigger.lastNotificationSent ? new Date(trigger.lastNotificationSent) : null;
        if (lastSent && differenceInHours(new Date(), lastSent) < NOTIFICATION_COOLDOWN_HOURS) {
            console.log(`[CRON] Skipping notification for ${trigger.id} (sent recently).`);
            continue;
        }

        const payload = JSON.stringify({ title: trigger.title, body: trigger.body, icon: trigger.icon });

        const sendPromises = subscriptions.map(subscription => 
            sendNotification(subscription, payload)
        );
        
        await Promise.all(sendPromises);
        notificationsSent++;

        // Actualizar el timestamp en el documento para evitar reenvíos
        await db.doc(trigger.docPath).update({
            lastNotificationSent: new Date().toISOString()
        });
    }

    return notificationsSent;
}

// ==================================================================
// FUNCIONES DE SOPORTE (Generalmente no necesitas cambiar esto)
// ==================================================================

/**
 * Obtiene todas las suscripciones push de la base de datos.
 */
async function getAllSubscriptions(): Promise<PushSubscription[]> {
    const subscriptionsSnap = await db.collection('subscriptions').get();
    if (subscriptionsSnap.empty) {
        return [];
    }
    return subscriptionsSnap.docs.map(doc => doc.data().subscription as PushSubscription);
}


/**
 * Envía una notificación a una suscripción específica y maneja errores.
 */
async function sendNotification(subscription: PushSubscription, payload: string) {
    try {
        await webpush.sendNotification(subscription, payload);
    } catch (error: any) {
        if (error.statusCode === 410 || error.statusCode === 404) {
            console.log('[CRON] Subscription expired. Deleting from DB...');
            // La suscripción ya no es válida, la eliminamos de Firestore.
            const endpointEncoded = encodeURIComponent(subscription.endpoint);
            db.collection('subscriptions').doc(endpointEncoded).delete().catch(delErr => {
                console.error(`[CRON] Failed to delete expired subscription ${endpointEncoded}:`, delErr);
            });
        } else {
            console.error(`[CRON] Failed to send notification:`, error.message);
        }
    }
}


/**
 * El handler principal de la función de Netlify.
 */
export const handler: Handler = async () => {
  console.log('[Netlify Function] - checkReminders: Cron job triggered.');

  // Configurar VAPID (esencial para web-push)
  if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      webpush.setVapidDetails(
          'mailto:your-email@example.com', // Reemplaza con tu email
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
          process.env.VAPID_PRIVATE_KEY
      );
  } else {
     console.error("[CRON] VAPID keys are not set. Cannot send push notifications.");
     return { statusCode: 500, body: 'VAPID keys are not set on the server.' };
  }

  try {
    const totalNotificationsSent = await checkAndSendNotifications();
    const successMessage = `Cron job completed. Sent notifications for ${totalNotificationsSent} events.`;
    console.log(`[Netlify Function] - checkReminders: ${successMessage}`);
    return { statusCode: 200, body: successMessage };

  } catch (error: any) {
    console.error('[Netlify Function] - checkReminders: Error during execution:', error);
    return { statusCode: 500, body: `Internal server error: ${error.message}` };
  }
}
