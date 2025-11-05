
'use client';

import { useMemo } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import VehicleSelector from '../dashboard/vehicle-selector';
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { Button } from '../ui/button';
import { LogOut } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { doc } from 'firebase/firestore';
import type { User } from '@/lib/types';

export default function AppHeader() {
  const auth = useAuth();
  const { user: authUser } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => {
    if (!authUser) return null;
    return doc(firestore, 'users', authUser.uid);
  }, [firestore, authUser]);

  const { data: userProfile } = useDoc<User>(userProfileRef);

  const handleSignOut = () => {
    signOut(auth);
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:h-16 sm:px-6 lg:px-8">
      <SidebarTrigger className="md:hidden" />
      <div className="flex-1">
        <VehicleSelector />
      </div>
      <div className="flex items-center gap-4">
        {authUser && (
          <>
            <span className='text-sm text-muted-foreground hidden sm:inline'>{userProfile?.username || authUser.email}</span>
            <Button variant="ghost" size="icon" onClick={handleSignOut} title="Cerrar sesión">
              <LogOut className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
