'use client';

import { useMemo } from 'react';
import type { Vehicle, ProcessedFuelLog } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Fuel, Gauge, Calendar, Sparkles } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { addDays, differenceInDays } from 'date-fns';

interface EstimatedRefuelCardProps {
  vehicle: Vehicle & { averageConsumptionKmPerLiter?: number };
  allFuelLogs: ProcessedFuelLog[];
}

export default function EstimatedRefuelCard({ vehicle, allFuelLogs }: EstimatedRefuelCardProps) {

  const estimatedRefuel = useMemo(() => {
    // Ensure logs are sorted by odometer descending to get the very last log.
    const sortedLogsDesc = allFuelLogs.length > 0 ? [...allFuelLogs].sort((a,b) => b.odometer - a.odometer) : [];
    const lastLog = sortedLogsDesc[0];

    // The average consumption is critical. Use the one calculated from logs if available, otherwise vehicle default.
    const avgConsumption = vehicle.averageConsumptionKmPerLiter;

    if (!lastLog || !avgConsumption || avgConsumption <= 0 || allFuelLogs.length < 2) {
      return null;
    }
    
    // Avg km per day calculation
    const sortedLogsByDate = [...allFuelLogs].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const firstLog = sortedLogsByDate[0];
    const days = differenceInDays(new Date(lastLog.date), new Date(firstLog.date));
    const totalKm = lastLog.odometer - firstLog.odometer;
    const avgKmPerDay = days > 0 ? totalKm / days : 0;
    
    if (avgKmPerDay <= 0) return null;

    // Find the most recent fill-up log from the descending sorted list.
    const lastFillUpLog = sortedLogsDesc.find(l => l.isFillUp);

    // If there's no fill-up log, we can't estimate fuel level.
    if (!lastFillUpLog) return null;

    // Calculate fuel level based on distance since the last *fill-up*.
    const odoSinceLastFill = lastLog.odometer - lastFillUpLog.odometer;
    const fuelConsumedSinceFill = odoSinceLastFill / avgConsumption;
    const currentFuel = vehicle.fuelCapacityLiters - fuelConsumedSinceFill;

    // Define a reserve threshold (e.g., 15%)
    const fuelReserve = vehicle.fuelCapacityLiters * 0.15;

    // If current fuel is already at or below reserve, no need to estimate.
    if (currentFuel <= fuelReserve) return null;

    // Calculate how many KMs are left until we hit the reserve threshold.
    const kmToRefuelThreshold = (currentFuel - fuelReserve) * avgConsumption;
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
    <Card>
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2"><Sparkles className="text-primary"/> Próxima Recarga Estimada</CardTitle>
        <CardDescription>
          Una predicción inteligente basada en tu consumo y hábitos de conducción.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {estimatedRefuel ? (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-2 text-sm">
             <div className="flex items-center gap-2">
                <Gauge className="h-5 w-5 text-muted-foreground" />
                <div>
                    <p className="font-semibold text-lg">{estimatedRefuel.kmExpected.toLocaleString()} km</p>
                    <p className="text-xs text-muted-foreground">Odómetro Estimado</p>
                </div>
            </div>
             <div className="flex items-center gap-2">
                <Fuel className="h-5 w-5 text-muted-foreground" />
                 <div>
                    <p className="font-semibold text-lg">{estimatedRefuel.kmRemaining.toLocaleString()} km</p>
                    <p className="text-xs text-muted-foreground">Faltan Aprox.</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                 <div>
                    <p className="font-semibold text-lg">{estimatedRefuel.dateExpected}</p>
                    <p className="text-xs text-muted-foreground">Fecha Estimada</p>
                </div>
            </div>
          </div>
        ) : (
            <div className="text-sm text-muted-foreground">
                No hay suficientes datos para generar una estimación. Asegúrate de tener al menos dos registros de combustible.
            </div>
        )}
      </CardContent>
    </Card>
  );
}
