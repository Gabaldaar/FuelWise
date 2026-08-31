'use server';

import { NextResponse } from 'next/server';
import { adminDb } from '@/firebase/admin';
import webpush from 'web-push';
import { differenceInHours } from 'date-fns';

function initVapid() {
  const publicKey =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
    'BCSVEMyiP_wAzlwp4_HT68djG5Ukbj2eXcUHyP4TX28W09Sw_y7GdMqDjzaRq7UJBPwlo6nIVFiSg06CF0P9vxo';
  const privateKey =
    process.env.VAPID_PRIVATE_KEY ||
    'pkKY_u2M-HHqvV19ppdrGNYnG4VIpDjERBa0boPcjKk';
  const subject = process.env.VAPID_SUBJECT || 'mailto:gab.aldazabal@gmail.com';

  webpush.setVapidDetails(subject, publicKey, privateKey);
}

export async function GET(request: Request) {
  return handleCheckReminders();
}

export async function POST(request: Request) {
  return handleCheckReminders();
}

async function handleCheckReminders() {
  try {
    initVapid();

    const now = new Date();
    const upcomingThreshold = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days in advance
    const NOTIFICATION_COOLDOWN_HOURS = 24;

    // 1. Fetch all subscriptions from Firestore
    const subscriptionsSnapshot = await adminDb.collection('subscriptions').get();
    if (subscriptionsSnapshot.empty) {
      return NextResponse.json({
        success: true,
        message: 'No hay dispositivos suscritos para recibir notificaciones.',
        alertsSent: 0,
        totalRemindersChecked: 0,
      });
    }

    const allSubscriptions = subscriptionsSnapshot.docs.map((docSnap) => ({
      docId: docSnap.id,
      userId: docSnap.data().userId,
      subscription: docSnap.data().subscription,
    }));

    // 2. Fetch all vehicles
    const vehiclesSnapshot = await adminDb.collection('vehicles').get();
    let totalRemindersChecked = 0;
    let alertsSent = 0;

    for (const vehicleDoc of vehiclesSnapshot.docs) {
      const vehicleId = vehicleDoc.id;
      const vehicleData = vehicleDoc.data();
      const vehicleName = `${vehicleData.make || ''} ${vehicleData.model || ''} (${vehicleData.plate || ''})`.trim();

      // Find current latest odometer from fuel_records
      const lastFuelSnap = await adminDb
        .collection('vehicles')
        .doc(vehicleId)
        .collection('fuel_records')
        .orderBy('odometer', 'desc')
        .limit(1)
        .get();

      const currentOdometer = lastFuelSnap.empty ? 0 : lastFuelSnap.docs[0].data().odometer || 0;

      // Find incomplete service reminders
      const remindersSnap = await adminDb
        .collection('vehicles')
        .doc(vehicleId)
        .collection('service_reminders')
        .where('isCompleted', '==', false)
        .get();

      totalRemindersChecked += remindersSnap.size;

      for (const reminderDoc of remindersSnap.docs) {
        const reminder = reminderDoc.data();
        let isDue = false;
        let dueReason = '';

        // Check Due Date (due within 7 days or overdue)
        if (reminder.dueDate) {
          const dueDate = new Date(reminder.dueDate);
          if (dueDate <= upcomingThreshold) {
            isDue = true;
            dueReason = dueDate <= now ? 'Vencido por fecha' : 'Vence pronto';
          }
        }

        // Check Due Odometer (within 500 km or overdue)
        if (reminder.dueOdometer && currentOdometer > 0) {
          if (currentOdometer >= reminder.dueOdometer - 500) {
            isDue = true;
            dueReason = currentOdometer >= reminder.dueOdometer ? 'Vencido por kilometraje' : 'Kilometraje próximo a vencer';
          }
        }

        if (isDue) {
          // Check cooldown (don't resend within 24 hours)
          const lastSent = reminder.lastNotificationSent ? new Date(reminder.lastNotificationSent) : null;
          if (lastSent && differenceInHours(now, lastSent) < NOTIFICATION_COOLDOWN_HOURS) {
            continue;
          }

          const title = `⚠️ Recordatorio: ${reminder.serviceType || 'Mantenimiento'}`;
          const body = `${vehicleName}: ${dueReason}. Revisa el estado en MotorLog.`;
          const payload = JSON.stringify({
            title,
            body,
            icon: '/icon-192x192.png',
            url: '/dashboard/services',
            tag: `reminder-${reminderDoc.id}`,
          });

          // Dispatch to target subscriptions
          for (const subItem of allSubscriptions) {
            if (!subItem.subscription || !subItem.subscription.endpoint) continue;

            try {
              await webpush.sendNotification(subItem.subscription, payload);
              alertsSent++;
            } catch (err: any) {
              if (err.statusCode === 410 || err.statusCode === 404) {
                console.log(`Deleting expired subscription: ${subItem.docId}`);
                await adminDb.collection('subscriptions').doc(subItem.docId).delete().catch(() => {});
              }
            }
          }

          // Update lastNotificationSent
          await reminderDoc.ref.update({
            lastNotificationSent: now.toISOString(),
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Revisión completada. Se evaluaron ${totalRemindersChecked} recordatorios y se enviaron ${alertsSent} alertas a los dispositivos suscritos.`,
      totalRemindersChecked,
      alertsSent,
    });
  } catch (error: any) {
    console.error('Error in /api/cron/check-reminders:', error);
    return NextResponse.json(
      { error: 'Error al verificar recordatorios', details: error.message },
      { status: 500 }
    );
  }
}
