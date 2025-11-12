'use server';

import { NextResponse } from 'next/server';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import webpush from 'web-push';
import type { PushSubscription } from 'web-push';

// Firebase Admin SDK Initialization
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
  : null;

if (!getApps().length) {
  if (!serviceAccount) {
    console.warn('FIREBASE_SERVICE_ACCOUNT_KEY not found, using default credentials for Admin SDK. This might fail in production.');
    initializeApp();
  } else {
    initializeApp({
      credential: cert(serviceAccount),
    });
  }
}

const db = getFirestore();

// VAPID Keys Configuration for web-push
if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
  console.error('VAPID keys are not configured. Please set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables.');
} else {
  webpush.setVapidDetails(
    'mailto:your-email@example.com', // Replace with your email
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

interface RequestBody {
    userId: string;
    payload: {
        title: string;
        body: string;
        icon?: string;
    }
}

export async function POST(request: Request) {
  try {
    const { userId, payload } = await request.json() as RequestBody;

    if (!userId || !payload) {
      return NextResponse.json({ error: 'Invalid request body: userId and payload are required.' }, { status: 400 });
    }
    
    if (!process.env.VAPID_PRIVATE_KEY) {
        console.error("Cannot send push notification: VAPID_PRIVATE_KEY is not set.");
        return NextResponse.json({ error: 'Server is not configured to send push notifications.' }, { status: 500 });
    }

    const subscriptionsSnapshot = await db.collection('subscriptions').where('userId', '==', userId).get();

    if (subscriptionsSnapshot.empty) {
      return NextResponse.json({ success: true, message: 'No subscriptions found for user.' });
    }

    const notificationPayload = JSON.stringify(payload);
    const promises: Promise<any>[] = [];
    const expiredSubscriptions: string[] = [];

    subscriptionsSnapshot.forEach(doc => {
      const sub = doc.data().subscription as PushSubscription;
      promises.push(
        webpush.sendNotification(sub, notificationPayload).catch(error => {
          if (error.statusCode === 410) {
            // GCM error 410 means the subscription is no longer valid
            expiredSubscriptions.push(doc.id);
          } else {
            console.error('Failed to send notification to one subscription:', error);
          }
        })
      );
    });

    await Promise.all(promises);

    // Clean up expired subscriptions
    if (expiredSubscriptions.length > 0) {
      const deletePromises = expiredSubscriptions.map(subId => 
        db.collection('subscriptions').doc(subId).delete()
      );
      await Promise.all(deletePromises);
      console.log(`Cleaned up ${expiredSubscriptions.length} expired subscriptions.`);
    }

    return NextResponse.json({ success: true, sent: promises.length - expiredSubscriptions.length, expired: expiredSubscriptions.length });
  } catch (error: any) {
    console.error('Error in send-push API:', error);
    return NextResponse.json({ error: 'Failed to send notifications', details: error.message }, { status: 500 });
  }
}
