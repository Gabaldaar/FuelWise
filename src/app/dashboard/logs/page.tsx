
'use client';

import type { ProcessedFuelLog } from '@/lib/types';
import { useVehicles } from '@/context/vehicle-context';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import AddFuelLogDialog from '@/components/dashboard/add-fuel-log-dialog';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Gauge, Droplets, Tag, Building, User as UserIcon, Plus, Fuel } from 'lucide-react';
import DeleteFuelLogDialog from '@/components/dashboard/delete-fuel-log-dialog';
import { usePreferences } from '@/context/preferences-context';
import { Separator } from '@/components/ui/separator';

function processFuelLogs(logs: ProcessedFuelLog[]): ProcessedFuelLog[] {
  // Sort logs by date ascending to calculate consumption correctly
  const sortedLogsAsc = logs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const calculatedLogs = sortedLogsAsc.map((log, index) => {
    if (index === 0) return { ...log };
    
    const prevLog = sortedLogsAsc[index - 1];
    
    const distanceTraveled = log.odometer - prevLog.odometer;
    
    // Only calculate consumption if the previous log was a fill-up
    // and the current log is NOT marked as having a missed previous fill-up.
    if (prevLog && prevLog.isFillUp && !log.missedPreviousFillUp) {
      const consumption = distanceTraveled > 0 && log.liters > 0 ? distanceTraveled / log.liters : 0;
      return {
        ...log,
        distanceTraveled,
        consumption: parseFloat(consumption.toFixed(2)),
      };
    }
    
    return { ...log, distanceTraveled };
  });

  // Return logs sorted descending for display
  return calculatedLogs.reverse();
}


export default function LogsPage() {
  const { selectedVehicle: vehicle } = useVehicles();
  const { user } = useUser();
  const firestore = useFirestore();
  const { consumptionUnit, getFormattedConsumption } = usePreferences();

  const fuelLogsQuery = useMemoFirebase(() => {
    if (!user || !vehicle) return null;
    return query(
      collection(firestore, 'vehicles', vehicle.id, 'fuel_records'),
      orderBy('date', 'desc')
    );
  }, [firestore, user, vehicle]);

  const { data: fuelLogs, isLoading } = useCollection<ProcessedFuelLog>(fuelLogsQuery);
  
  if (!vehicle) {
    return <div className="text-center">Por favor, seleccione un vehículo.</div>;
  }

  const processedLogs = fuelLogs ? processFuelLogs(fuelLogs) : [];
  const lastLog = processedLogs?.[0]; // Already sorted desc

  return (
    <div className="flex flex-col gap-6">
       <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
              <h1 className="font-headline text-3xl">Registros de Combustible</h1>
              <p className="text-muted-foreground">Un historial completo de todos tus repostajes.</p>
          </div>
          <AddFuelLogDialog vehicleId={vehicle.id} lastLog={lastLog} vehicle={vehicle}>
            <Button>
              <Plus className="-ml-1 mr-2 h-4 w-4" />
              Añadir Repostaje
            </Button>
          </AddFuelLogDialog>
        </div>

        {isLoading ? (
             <div className="h-64 text-center flex flex-col items-center justify-center">
                <Fuel className="h-12 w-12 animate-pulse text-muted-foreground" />
                <p className="mt-4 text-muted-foreground">Cargando registros...</p>
            </div>
        ) : processedLogs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {processedLogs.map(log => (
                    <Card key={log.id} className="flex flex-col">
                        <CardHeader>
                            <CardTitle className="flex justify-between items-start">
                                <span>{formatDate(log.date)}</span>
                                {log.isFillUp && <Badge variant="secondary">Lleno</Badge>}
                            </CardTitle>
                            <CardDescription>${log.totalCost.toFixed(2)} por {log.liters.toFixed(2)}L</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow space-y-3 text-sm">
                           <Separator />
                            <div className="flex justify-between">
                                <span className="flex items-center gap-2 text-muted-foreground"><Gauge className="h-4 w-4" /> Odómetro</span>
                                <span>{log.odometer.toLocaleString()} km</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="flex items-center gap-2 text-muted-foreground"><Droplets className="h-4 w-4" /> {consumptionUnit}</span>
                                <span>{getFormattedConsumption(log.consumption)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="flex items-center gap-2 text-muted-foreground"><Tag className="h-4 w-4" /> $/Litro</span>
                                <span>${log.pricePerLiter.toFixed(2)}</span>
                            </div>
                            {log.gasStation && (
                                <div className="flex justify-between">
                                    <span className="flex items-center gap-2 text-muted-foreground"><Building className="h-4 w-4" /> Gasolinera</span>
                                    <span className="truncate max-w-[150px] text-right">{log.gasStation}</span>
                                </div>
                            )}
                            {log.username && (
                                <div className="flex justify-between">
                                    <span className="flex items-center gap-2 text-muted-foreground"><UserIcon className="h-4 w-4" /> Conductor</span>
                                    <span>{log.username}</span>
                                </div>
                            )}
                        </CardContent>
                         <CardFooter className="flex gap-2 bg-muted/30 p-2 border-t">
                            <AddFuelLogDialog vehicleId={vehicle.id} lastLog={lastLog} fuelLog={log} vehicle={vehicle}>
                                <Button variant="outline" size="sm" className="w-full">
                                    <Edit className="h-4 w-4 mr-1" /> Editar
                                </Button>
                            </AddFuelLogDialog>
                            <DeleteFuelLogDialog vehicleId={vehicle.id} fuelLogId={log.id}>
                                <Button variant="outline" size="sm" className="w-full text-destructive hover:text-destructive">
                                    <Trash2 className="h-4 w-4 mr-1" /> Eliminar
                                </Button>
                            </DeleteFuelLogDialog>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        ) : (
             <div className="h-64 text-center flex flex-col items-center justify-center rounded-lg border-2 border-dashed">
                <Fuel className="h-12 w-12 text-muted-foreground" />
                <p className="mt-4 font-semibold">No hay registros de combustible.</p>
                <p className="text-sm text-muted-foreground">Añade tu primer repostaje para empezar a rastrear.</p>
            </div>
        )}
    </div>
  );
}
