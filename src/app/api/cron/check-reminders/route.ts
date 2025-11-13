// /api/cron/check-reminders/route.ts
'use server';

import { NextResponse } from 'next/server';
import admin from '@/firebase/admin';
import type { ServiceReminder, Vehicle } from '@/lib/types';
import webpush, { type PushSubscription } from 'web-push';
import { differenceInDays, differenceInHours } from 'date-fns';

// This is a scheduled function, intended to be called by Netlify's scheduler.
// It will iterate through ALL vehicles and check for notifications.

const db = admin.firestore();

// --- START VAPID CONFIG (Ensure it's configured once) ---
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && !webpush.getVapidDetails()) {
  try {
    webpush.setVapidDetails(
      'mailto:your-email@example.com',
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  } catch (error) {
     console.error("VAPID details already set, skipping.", error);
  }
}
// --- END VAPID CONFIG ---

// In-memory caches to avoid redundant DB reads during a single run
const vehicleOdometerCache = new Map<string, number>();
const allSubscriptionsCache: { subs: PushSubscription[], timestamp: number | null } = { subs: [], timestamp: null };
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

async function getLatestOdometer(vehicleId: string): Promise<number> {
    if (vehicleOdometerCache.has(vehicleId)) {
        return vehicleOdometerCache.get(vehicleId)!;
    }
    const lastLogSnap = await db.collection('vehicles').doc(vehicleId).collection('fuel_records').orderBy('odometer', 'desc').limit(1).get();
    if (lastLogSnap.empty) {
        vehicleOdometerCache.set(vehicleId, 0);
        return 0;
    }
    const lastOdometer = lastLogSnap.docs[0].data().odometer;
    vehicleOdometerCache.set(vehicleId, lastOdometer);
    return lastOdometer;
}

async function getAllSubscriptions(): Promise<PushSubscription[]> {
    const now = Date.now();
    if (allSubscriptionsCache.timestamp && (now - allSubscriptionsCache.timestamp < CACHE_TTL_MS)) {
        return allSubscriptionsCache.subs;
    }
    const subscriptionsSnap = await db.collection('subscriptions').get();
    if (subscriptionsSnap.empty) {
        allSubscriptionsCache.subs = [];
        allSubscriptionsCache.timestamp = now;
        return [];
    }
    const subscriptions = subscriptionsSnap.docs.map(doc => doc.data().subscription as PushSubscription);
    allSubscriptionsCache.subs = subscriptions;
    allSubscriptionsCache.timestamp = now;
    return subscriptions;
}


async function checkAndSendForVehicle(vehicle: Vehicle) {
    let notificationsSent = 0;
    const lastOdometer = await getLatestOdometer(vehicle.id);
    if (lastOdometer === 0) return notificationsSent; // Skip if no odometer data

    const remindersSnap = await db.collection('vehicles').doc(vehicle.id).collection('service_reminders').where('isCompleted', '==', false).get();
    if (remindersSnap.empty) return notificationsSent;
    
    const pendingReminders = remindersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceReminder & { id: string }));

    const subscriptions = await getAllSubscriptions();
    if (subscriptions.length === 0) return notificationsSent;

    // These should come from a global config, but hardcoded for now.
    const URGENCY_THRESHOLD_KM = 1000;
    const URGENCY_THRESHOLD_DAYS = 15;
    const NOTIFICATION_COOLDOWN_HOURS = 48;

    for (const reminder of pendingReminders) {
        const kmsRemaining = reminder.dueOdometer ? reminder.dueOdometer - lastOdometer : null;
        const daysRemaining = reminder.dueDate ? differenceInDays(new Date(reminder.dueDate), new Date()) : null;

        const isOverdue = (kmsRemaining !== null && kmsRemaining < 0) || (daysRemaining !== null && daysRemaining < 0);
        const isUrgent = !isOverdue && (
            (kmsRemaining !== null && kmsRemaining <= URGENCY_THRESHOLD_KM) ||
            (daysRemaining !== null && daysRemaining <= URGENCY_THRESHOLD_DAYS)
        );

        if (isOverdue || isUrgent) {
            const lastSent = reminder.lastNotificationSent ? new Date(reminder.lastNotificationSent) : null;
            if (lastSent && differenceInHours(new Date(), lastSent) < NOTIFICATION_COOLDOWN_HOURS) {
                console.log(`[Cron] Skipping notification for ${reminder.serviceType} (sent recently).`);
                continue;
            }
            
            const title = `Alerta de Servicio: ${vehicle.make} ${vehicle.model}`;
            let body = `${reminder.serviceType} - `;
            body += isOverdue ? '¡Servicio Vencido!' : '¡Servicio Próximo!';
            
            const payload = JSON.stringify({ title, body, icon: vehicle.imageUrl || '/icon-192x192.png' });

            const sendPromises = subscriptions.map(subscription => 
                webpush.sendNotification(subscription, payload).catch(error => {
                     if (error.statusCode === 410) { // GONE, subscription is no longer valid
                        console.log('[Cron] Subscription expired. Deleting from DB...');
                        db.collection('subscriptions').where('subscription.endpoint', '==', subscription.endpoint).limit(1).get()
                         .then(snap => {
                             if (!snap.empty) snap.docs[0].ref.delete();
                         });
                    } else {
                        console.error(`[Cron] Failed to send notification for reminder ${reminder.id}:`, error.message);
                    }
                })
            );
            
            await Promise.all(sendPromises);
            notificationsSent++;

            // Update timestamp on the reminder
            await db.collection('vehicles').doc(vehicle.id).collection('service_reminders').doc(reminder.id).update({
                lastNotificationSent: new Date().toISOString()
            });
        }
    }
    return notificationsSent;
}


// The main function for the scheduled endpoint
export async function GET(request: Request) {
  // Optional: Add a secret to prevent unauthorized calls
  // const secret = request.headers.get('x-cron-secret');
  // if (secret !== process.env.CRON_SECRET) {
  //   return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  // }
  
   if (!process.env.VAPID_PRIVATE_KEY || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
     console.error("[Cron] VAPID keys are not set. Cannot send push notifications.");
     return NextResponse.json({ error: 'Server is not configured for push.' }, { status: 500 });
   }

  try {
    const vehiclesSnap = await db.collection('vehicles').get();
    if (vehiclesSnap.empty) {
      return NextResponse.json({ success: true, message: 'No vehicles to check.' });
    }

    let totalNotificationsSent = 0;
    const allVehicles = vehiclesSnap.docs.map(doc => doc.data() as Vehicle);

    for (const vehicle of allVehicles) {
      const count = await checkAndSendForVehicle(vehicle);
      totalNotificationsSent += count;
    }
    
    // Clear caches after the run
    vehicleOdometerCache.clear();
    allSubscriptionsCache.subs = [];
    allSubscriptionsCache.timestamp = null;

    return NextResponse.json({ success: true, message: `Cron job completed. Sent notifications for ${totalNotificationsSent} reminders.` });

  } catch (error: any) {
    console.error('Error in cron job:', error);
    return NextResponse.json({ success: false, error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
