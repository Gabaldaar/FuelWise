'use client';

import type { ProcessedFuelLog } from '@/lib/types';
import { useVehicles } from '@/context/vehicle-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDate } from '@/lib/utils';
import AddFuelLogDialog from '@/components/dashboard/add-fuel-log-dialog';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import DeleteFuelLogDialog from '@/components/dashboard/delete-fuel-log-dialog';

function processFuelLogs(logs: ProcessedFuelLog[]): ProcessedFuelLog[] {
  // Sort logs by date ascending to calculate consumption correctly
  const sortedLogsAsc = logs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const calculatedLogs = sortedLogsAsc.map((log, index) => {
    if (index === 0) return { ...log };
    
    const prevLog = sortedLogsAsc[index - 1];
    
    // Only calculate consumption if the previous log was a fill-up
    if (prevLog && prevLog.isFillUp) {
      const distanceTraveled = log.odometer - prevLog.odometer;
      const consumption = distanceTraveled > 0 && log.liters > 0 ? distanceTraveled / log.liters : 0;
      return {
        ...log,
        distanceTraveled,
        consumption: parseFloat(consumption.toFixed(2)),
      };
    }
    
    return { ...log };
  });

  // Return logs sorted descending for display
  return calculatedLogs.reverse();
}


export default function LogsPage() {
  const { selectedVehicle: vehicle } = useVehicles();
  const { user } = useUser();
  const firestore = useFirestore();

  const fuelLogsQuery = useMemoFirebase(() => {
    if (!user || !vehicle) return null;
    return query(
      collection(firestore, 'users', user.uid, 'vehicles', vehicle.id, 'fuel_records'),
      orderBy('date', 'desc')
    );
  }, [firestore, user, vehicle]);

  const { data: fuelLogs, isLoading } = useCollection<ProcessedFuelLog>(fuelLogsQuery);
  
  if (!vehicle) {
    return <div className="text-center">Por favor, seleccione un vehículo.</div>;
  }

  const processedLogs = fuelLogs ? processFuelLogs(fuelLogs) : [];
  const lastLog = fuelLogs?.[0]; // Already sorted desc

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle className="font-headline">Registros de Combustible</CardTitle>
            <CardDescription>Un historial completo de todos tus repostajes.</CardDescription>
        </div>
        <AddFuelLogDialog vehicleId={vehicle.id} lastLog={lastLog} />
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Odómetro</TableHead>
              <TableHead>Litros</TableHead>
              <TableHead>Llenado</TableHead>
              <TableHead>Costo Total</TableHead>
              <TableHead>$/Litro</TableHead>
              <TableHead>Km/L</TableHead>
              <TableHead>Gasolinera</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
                <TableRow><TableCell colSpan={9} className="h-24 text-center">Cargando registros...</TableCell></TableRow>
            ) : processedLogs.length > 0 ? (
              processedLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{formatDate(log.date)}</TableCell>
                  <TableCell>{log.odometer.toLocaleString()} km</TableCell>
                  <TableCell>{log.liters.toFixed(2)} L</TableCell>
                  <TableCell>
                    {log.isFillUp && <Badge variant="secondary">Sí</Badge>}
                  </TableCell>
                  <TableCell>${log.totalCost.toFixed(2)}</TableCell>
                  <TableCell>${log.pricePerLiter.toFixed(2)}</TableCell>
                  <TableCell>{log.consumption ? `${log.consumption.toFixed(2)}` : 'N/A'}</TableCell>
                  <TableCell>{log.gasStation}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <AddFuelLogDialog vehicleId={vehicle.id} lastLog={lastLog} fuelLog={log}>
                        <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                        </Button>
                      </AddFuelLogDialog>
                      <DeleteFuelLogDialog vehicleId={vehicle.id} fuelLogId={log.id}>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                      </DeleteFuelLogDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  No hay registros de combustible para este vehículo.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
