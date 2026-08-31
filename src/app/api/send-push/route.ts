'use server';

import { NextResponse } from 'next/server';
import webpush from 'web-push';
import type { PushSubscription } from 'web-push';
import admin from '@/firebase/admin';

const db = admin.firestore();

function initVapid() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:gab.aldazabal@gmail.com';

  if (!publicKey || !privateKey) {
    throw new Error('VAPID keys are missing in environment variables.');
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
}

export async function POST(request: Request) {
  try {
    initVapid();

    const body = await request.json();
    const { subscription, userId, payload } = body as {
      subscription?: PushSubscription;
      userId?: string;
      payload: {
        title?: string;
        body: string;
        icon?: string;
        url?: string;
        tag?: string;
      };
    };

    if (!payload || !payload.body) {
      return NextResponse.json({ error: 'Payload body is required' }, { status: 400 });
    }

    const notificationPayload = JSON.stringify({
      title: payload.title || 'MotorLog',
      body: payload.body,
      icon: payload.icon || '/icon-192x192.png',
      url: payload.url || '/dashboard',
      tag: payload.tag || 'motorlog-alert',
    });

    // Case 1: Direct single subscription provided
    if (subscription && subscription.endpoint) {
      await webpush.sendNotification(subscription, notificationPayload);
      return NextResponse.json({
        success: true,
        message: 'Notification sent successfully to target subscription.',
      });
    }

    // Case 2: Target userId provided - fetch all subscriptions for this user
    if (userId) {
      const subscriptionsSnapshot = await db
        .collection('subscriptions')
        .where('userId', '==', userId)
        .get();

      if (subscriptionsSnapshot.empty) {
        return NextResponse.json({
          success: false,
          message: 'No active subscriptions found for this user.',
        }, { status: 404 });
      }

      let sentCount = 0;
      const sendPromises = subscriptionsSnapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        const sub = data.subscription;
        if (!sub || !sub.endpoint) return;

        try {
          await webpush.sendNotification(sub, notificationPayload);
          sentCount++;
        } catch (err: any) {
          // If subscription is expired or unsubscribed, remove from Firestore
          if (err.statusCode === 410 || err.statusCode === 404) {
            console.log(`Removing expired subscription: ${docSnap.id}`);
            await docSnap.ref.delete();
          } else {
            console.error(`Error sending push to subscription ${docSnap.id}:`, err);
          }
        }
      });

      await Promise.all(sendPromises);

      return NextResponse.json({
        success: true,
        sentCount,
        message: `Notification dispatched to ${sentCount} device(s).`,
      });
    }

    return NextResponse.json({ error: 'Either subscription or userId is required' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in /api/send-push:', error);
    return NextResponse.json(
      { error: 'Failed to send notification', details: error.message },
      { status: 500 }
    );
  }
}
