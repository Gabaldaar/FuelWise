'use client';

import Image from 'next/image';
import type { Vehicle, ProcessedFuelLog } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import AddFuelLogDialog from './add-fuel-log-dialog';
import { Wrench, Plus, Search, Fuel, Gauge, Calendar } from 'lucide-react';
import AddServiceReminderDialog from './add-service-reminder-dialog';
import { Button } from '../ui/button';
import { useMemo } from 'react';
import { formatDate } from '@/lib/utils';
import { addDays, differenceInDays } from 'date-fns';

interface WelcomeBannerProps {
  vehicle: Vehicle & { averageConsumptionKmPerLiter?: number };
  allFuelLogs: ProcessedFuelLog[];
  lastOdometer: number;
}

export default function WelcomeBanner({ vehicle, allFuelLogs, lastOdometer }: WelcomeBannerProps) {

  const estimatedRefuel = useMemo(() => {
    const lastLog = allFuelLogs.length > 0 ? [...allFuelLogs].sort((a,b) => b.odometer - a.odometer)[0] : undefined;

    if (!lastLog || !vehicle.averageConsumptionKmPerLiter || vehicle.averageConsumptionKmPerLiter <= 0 || allFuelLogs.length < 2) {
      return null;
    }
    
    // Avg km per day
    const sortedLogsByDate = [...allFuelLogs].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const firstLog = sortedLogsByDate[0];
    const days = differenceInDays(new Date(lastLog.date), new Date(firstLog.date));
    const totalKm = lastLog.odometer - firstLog.odometer;
    const avgKmPerDay = days > 0 ? totalKm / days : 0;
    
    if (avgKmPerDay <= 0) return null;

    // Estimated next refuel (at 15% tank)
    const fuelReserve = vehicle.fuelCapacityLiters * 0.15;
    const usableFuel = vehicle.fuelCapacityLiters - fuelReserve;
    const lastFillUpLog = allFuelLogs.find(l => l.isFillUp);
    const odoSinceLastFill = lastFillUpLog ? lastLog.odometer - lastFillUpLog.odometer : 0;
    const fuelConsumedSinceFill = odoSinceLastFill / vehicle.averageConsumptionKmPerLiter;
    
    const currentFuel = lastFillUpLog ? vehicle.fuelCapacityLiters - fuelConsumedSinceFill : 0;

    if (currentFuel <= fuelReserve) return null;

    const kmToRefuelThreshold = (currentFuel - fuelReserve) * vehicle.averageConsumptionKmPerLiter;
    const kmExpected = lastLog.odometer + kmToRefuelThreshold;

    const daysToNextRefuel = kmToRefuelThreshold / avgKmPerDay;
    const dateExpected = addDays(new Date(), daysToNextRefuel);


    return {
        kmExpected: Math.round(kmExpected),
        kmRemaining: Math.round(kmToRefuelThreshold),
        dateExpected: formatDate(dateExpected.toISOString()),
    }

  }, [allFuelLogs, vehicle]);
  
  return (
    <Card className="overflow-hidden">
        <div className="flex flex-col">
             {vehicle.imageUrl && (
            <div className="relative w-full h-64 sm:h-72 bg-black/5">
                <Image
                    src={vehicle.imageUrl}
                    alt={`${vehicle.make} ${vehicle.model}`}
                    fill
                    className="object-cover"
                    data-ai-hint={vehicle.imageHint}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
                <div className="absolute top-0 left-0 p-6 w-full">
                     {estimatedRefuel && (
                       <Card className="bg-black/40 border-white/20 text-white max-w-lg backdrop-blur-sm">
                           <CardContent className="p-4">
                               <p className="font-headline text-lg mb-2">Próxima Recarga Estimada</p>
                               <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                                   <div className="flex items-center gap-2">
                                       <Fuel className="h-4 w-4" />
                                       <span>Faltan {estimatedRefuel.kmRemaining.toLocaleString()} km</span>
                                   </div>
                                    <div className="flex items-center gap-2">
                                       <Gauge className="h-4 w-4" />
                                       <span>A los {estimatedRefuel.kmExpected.toLocaleString()} km</span>
                                   </div>
                                   <div className="flex items-center gap-2">
                                       <Calendar className="h-4 w-4" />
                                       <span>~ {estimatedRefuel.dateExpected}</span>
                                   </div>
                               </div>
                           </CardContent>
                       </Card>
                    )}
                </div>
                <div className="absolute bottom-0 left-0 p-6 w-full">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                        <div>
                            <h2 className="font-headline text-3xl text-white shadow-lg">{vehicle.make} {vehicle.model}</h2>
                            <p className="text-white/90 text-base">{vehicle.year} - {vehicle.plate}</p>
                        </div>
                         <div className="flex items-center flex-wrap gap-2">
                            {vehicle && (
                            <AddFuelLogDialog vehicleId={vehicle.id} vehicle={vehicle} lastLog={[...allFuelLogs].sort((a,b) => b.odometer - a.odometer)[0]}>
                                <Button size="sm" className="w-auto">
                                <Plus className="-ml-1 mr-2 h-4 w-4" />
                                Añadir Recarga
                                </Button>
                            </AddFuelLogDialog>
                            )}
                            {vehicle && (
                            <AddServiceReminderDialog vehicleId={vehicle.id} lastOdometer={lastOdometer}>
                                <Button variant="secondary" size="sm" className="w-auto">
                                <Wrench className="mr-2 h-4 w-4" />
                                Añadir Recordatorio
                                </Button>
                            </AddServiceReminderDialog>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            )}
        </div>
    </Card>
  );
}
