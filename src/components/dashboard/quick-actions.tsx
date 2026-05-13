'use client';

import { Plus, Fuel, Wrench, Route, Loader2 } from 'lucide-react';
import { useVehicles } from '@/context/vehicle-context';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import AddFuelLogDialog from './add-fuel-log-dialog';
import AddServiceReminderDialog from './add-service-reminder-dialog';
import AddTripDialog from './add-trip-dialog';
import type { ProcessedFuelLog, Vehicle } from '@/lib/types';

export default function QuickActions() {
  const { selectedVehicle: vehicle, isLoading: isVehicleLoading } = useVehicles();
  const { user } = useUser();
  const firestore = useFirestore();

  // Obtenemos el último registro de combustible para pasar el contexto a los diálogos
  const lastFuelLogQuery = useMemoFirebase(() => {
    if (!user || !vehicle) return null;
    return query(
      collection(firestore, 'vehicles', vehicle.id, 'fuel_records'),
      orderBy('odometer', 'desc'),
      limit(1)
    );
  }, [firestore, user, vehicle]);

  const { data: lastFuelLogData, isLoading: isLoadingLogs } = useCollection<ProcessedFuelLog>(lastFuelLogQuery);
  
  const lastLog = lastFuelLogData?.[0];
  const lastOdometer = lastLog?.odometer || 0;

  if (!vehicle || isVehicleLoading) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            size="icon" 
            className="h-14 w-14 rounded-full shadow-2xl hover:scale-110 transition-transform bg-primary text-primary-foreground"
            aria-label="Acciones rápidas"
          >
            <Plus className="h-7 w-7" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="w-56 mb-2 p-2" sideOffset={10}>
          <AddFuelLogDialog 
            vehicleId={vehicle.id} 
            vehicle={vehicle as Vehicle} 
            lastLog={lastLog}
          >
            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer py-3">
              <Fuel className="mr-3 h-5 w-5 text-blue-500" />
              <span className="font-medium">Nueva Recarga</span>
            </DropdownMenuItem>
          </AddFuelLogDialog>

          <AddServiceReminderDialog 
            vehicleId={vehicle.id} 
            lastOdometer={lastOdometer}
          >
            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer py-3">
              <Wrench className="mr-3 h-5 w-5 text-amber-500" />
              <span className="font-medium">Nuevo Servicio</span>
            </DropdownMenuItem>
          </AddServiceReminderDialog>

          <AddTripDialog 
            vehicleId={vehicle.id} 
            lastOdometer={lastOdometer}
          >
            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer py-3">
              <Route className="mr-3 h-5 w-5 text-purple-500" />
              <span className="font-medium">Iniciar Viaje</span>
            </DropdownMenuItem>
          </AddTripDialog>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
