'use server';

import { NextResponse } from 'next/server';
import { adminDb, adminAuth, FieldValue } from '@/firebase/admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { subscription, userId: bodyUserId, userEmail } = body;

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription object' }, { status: 400 });
    }

    let userId = bodyUserId;

    // Check authorization header if provided
    const authorization = request.headers.get('Authorization');
    if (authorization && authorization.startsWith('Bearer ')) {
      const idToken = authorization.split('Bearer ')[1];
      try {
        const decodedToken = await adminAuth.verifyIdToken(idToken, true);
        if (decodedToken && decodedToken.uid) {
          userId = decodedToken.uid;
        }
      } catch (authErr: any) {
        console.warn('ID token verification note:', authErr.message);
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: User identifier missing' }, { status: 401 });
    }

    const docId = encodeURIComponent(subscription.endpoint);
    const docRef = adminDb.collection('subscriptions').doc(docId);

    await docRef.set(
      {
        userId: userId,
        userEmail: userEmail || null,
        subscription: subscription,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    console.log(`Successfully saved/updated subscription for user: ${userId}`);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error saving subscription to Firestore:', error);
    return NextResponse.json(
      { error: 'Failed to save subscription', details: error.message },
      { status: 500 }
    );
  }
}
