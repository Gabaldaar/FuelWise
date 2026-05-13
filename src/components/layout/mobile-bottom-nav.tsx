'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Fuel, Wrench, History, Route } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVehicles } from '@/context/vehicle-context';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { useMemo } from 'react';
import { differenceInDays } from 'date-fns';
import type { Trip, ServiceReminder, ProcessedFuelLog } from '@/lib/types';

const navItems = [
  { href: '/dashboard', label: 'Inicio', icon: Menu },
  { href: '/dashboard/logs', label: 'Registros', icon: Fuel },
  { href: '/dashboard/services', label: 'Servicios', icon: Wrench },
  { href: '/dashboard/history', label: 'Historial', icon: History },
  { href: '/dashboard/trips', label: 'Viajes', icon: Route },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { selectedVehicle } = useVehicles();
  const firestore = useFirestore();

  // --- Lógica de Badges (Idéntica a AppSidebar) ---
  
  const activeTripsQuery = useMemoFirebase(() => {
    if (!selectedVehicle) return null;
    return query(
      collection(firestore, 'vehicles', selectedVehicle.id, 'trips'),
      where('status', '==', 'active')
    );
  }, [firestore, selectedVehicle]);
  const { data: activeTrips } = useCollection<Trip>(activeTripsQuery);

  const pendingRemindersQuery = useMemoFirebase(() => {
    if (!selectedVehicle) return null;
    return query(
      collection(firestore, 'vehicles', selectedVehicle.id, 'service_reminders'),
      where('isCompleted', '==', false)
    );
  }, [firestore, selectedVehicle]);
  const { data: pendingReminders } = useCollection<ServiceReminder>(pendingRemindersQuery);

  const lastFuelLogQuery = useMemoFirebase(() => {
    if (!selectedVehicle) return null;
    return query(
      collection(firestore, 'vehicles', selectedVehicle.id, 'fuel_records'),
      orderBy('odometer', 'desc'),
      limit(1)
    );
  }, [firestore, selectedVehicle]);
  const { data: lastFuelLog } = useCollection<ProcessedFuelLog>(lastFuelLogQuery);
  const lastOdometer = lastFuelLog?.[0]?.odometer || 0;

  const overdueServicesCount = useMemo(() => {
    if (!pendingReminders || !lastOdometer) return 0;
    return pendingReminders.filter(r => {
      const kmsRemaining = r.dueOdometer ? r.dueOdometer - lastOdometer : null;
      const daysRemaining = r.dueDate ? differenceInDays(new Date(r.dueDate), new Date()) : null;
      return (kmsRemaining !== null && kmsRemaining < 0) || (daysRemaining !== null && daysRemaining < 0);
    }).length;
  }, [pendingReminders, lastOdometer]);

  const activeTripsCount = activeTrips?.length || 0;

  if (!selectedVehicle) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-background/80 backdrop-blur-lg border-t md:hidden">
      <div className="grid h-full grid-cols-5">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          
          let badgeCount = 0;
          if (item.href === '/dashboard/services') badgeCount = overdueServicesCount;
          if (item.href === '/dashboard/trips') badgeCount = activeTripsCount;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-colors relative",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <item.icon className={cn("h-5 w-5", isActive && "stroke-[2.5px]")} />
                {badgeCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                    {badgeCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
              {isActive && (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
