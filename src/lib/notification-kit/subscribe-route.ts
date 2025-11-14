// src/app/api/subscribe/route.ts
'use server';

import { NextResponse } from 'next/server';
import admin from '@/firebase/admin';

const db = admin.firestore();

export async function POST(request: Request) {
  const authorization = request.headers.get('Authorization');
  if (!authorization || !authorization.startsWith('Bearer ')) {
    console.error('Unauthorized: No token provided in header.');
    return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
  }

  const idToken = authorization.split('Bearer ')[1];

  let decodedToken;
  try {
    decodedToken = await admin.auth().verifyIdToken(idToken);
  } catch (error) {
    console.error('Error verifying ID token:', error);
    return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
  }
  
  const userId = decodedToken.uid;
  
  if (!userId) {
     console.error('Unauthorized: Could not verify user from token.');
     return NextResponse.json({ error: 'Unauthorized: Could not verify user from token.' }, { status: 401 });
  }

  try {
    const subscription = await request.json();
    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription object' }, { status: 400 });
    }

    // Use a URL-safe, encoded version of the endpoint as the document ID to prevent duplicates.
    const docId = encodeURIComponent(subscription.endpoint);
    const docRef = db.collection('subscriptions').doc(docId);
    
    await docRef.set({ 
        userId: userId,
        subscription: subscription,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    console.log(`Successfully saved/updated subscription for user: ${userId} with docId: ${docId}`);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error saving subscription to Firestore:', error);
    return NextResponse.json({ error: 'Failed to save subscription', details: error.message }, { status: 500 });
  }
}
