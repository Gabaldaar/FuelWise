'use client';

import AppHeader from '@/components/layout/app-header';
import AppSidebar from '@/components/layout/app-sidebar';
import { Sidebar, SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { VehicleProvider } from '@/context/vehicle-context';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { FirebaseClientProvider } from '@/firebase';
import { PreferencesProvider } from '@/context/preferences-context';
import { Loader2, WifiOff } from 'lucide-react';
import dynamic from 'next/dynamic';

const ClientOnlyNotificationManager = dynamic(
  () => import('@/components/notifications/notification-manager'),
  { ssr: false }
);

function OfflineWarning({ isOnline }: { isOnline: boolean }) {
    if (isOnline) {
        return null;
    }
    return (
        <div className="bg-yellow-500 text-black text-center p-2 text-sm font-semibold flex items-center justify-center gap-2">
            <WifiOff className="h-4 w-4" />
            <span>Estás trabajando sin conexión. Algunos datos pueden no estar actualizados.</span>
        </div>
    );
}

function DashboardLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    // Definir el estado inicial
    if (typeof navigator !== 'undefined') {
        setIsOnline(navigator.onLine);
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }
  
  return (
    <VehicleProvider>
      <PreferencesProvider>
        <SidebarProvider>
        <ClientOnlyNotificationManager />
        <div className="relative flex h-screen w-full flex-col overflow-hidden">
            <Sidebar>
            <AppSidebar />
            </Sidebar>
            <SidebarInset>
            <AppHeader />
            <OfflineWarning isOnline={isOnline} />
            <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 bg-background">
                {children}
            </main>
            </SidebarInset>
        </div>
        </SidebarProvider>
      </PreferencesProvider>
    </VehicleProvider>
  );
}


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FirebaseClientProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </FirebaseClientProvider>
  );
}
