'use client';

import { useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export default function UserProfileSync() {
  const { user } = useUser();
  const firestore = useFirestore();

  useEffect(() => {
    if (!user || !firestore) return;

    const syncProfile = async () => {
      try {
        const userDocRef = doc(firestore, 'users', user.uid);
        const snapshot = await getDoc(userDocRef);
        if (!snapshot.exists()) {
          const username = user.displayName || user.email?.split('@')[0] || 'Usuario';
          await setDoc(userDocRef, {
            id: user.uid,
            email: user.email || '',
            username: username,
          }, { merge: true });
        }
      } catch (err) {
        console.warn('Could not sync user profile document:', err);
      }
    };

    syncProfile();
  }, [user, firestore]);

  return null;
}
