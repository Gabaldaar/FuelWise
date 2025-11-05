'use client';

import AppHeader from '@/components/layout/app-header';
import AppSidebar from '@/components/layout/app-sidebar';
import { Sidebar, SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { VehicleProvider } from '@/context/vehicle-context';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { FirebaseClientProvider } from '@/firebase/client-provider';

function DashboardLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || !user) {
    return <div>Loading...</div>; // Or a proper loading spinner
  }
  
  return (
    <VehicleProvider>
        <SidebarProvider>
        <div className="min-h-screen">
            <Sidebar>
            <AppSidebar />
            </Sidebar>
            <SidebarInset>
            <AppHeader />
            <main className="p-4 sm:p-6 lg:p-8 bg-background">
                {children}
            </main>
            </SidebarInset>
        </div>
        </SidebarProvider>
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
