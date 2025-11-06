
'use client';

import type { Trip } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Flag, Calendar, Gauge, Droplets, User, Edit } from 'lucide-react';
import AddTripDialog from '@/components/dashboard/add-trip-dialog';
import { formatDateTime } from '@/lib/utils';
import { useVehicles } from '@/context/vehicle-context';
import DeleteTripDialog from './delete-trip-dialog';

interface ActiveTripsProps {
    trips: Trip[];
    vehicleId: string;
    lastOdometer: number;
}

export default function ActiveTrips({ trips, vehicleId, lastOdometer }: ActiveTripsProps) {
  const { selectedVehicle } = useVehicles();
  
  if (trips.length === 0) {
    return null;
  }
  
  const getEstimatedCostAndFuel = (trip: Trip) => {
    if (!selectedVehicle || !lastOdometer || lastOdometer <= trip.startOdometer) {
      return { fuel: 'N/A' };
    }
    const distance = lastOdometer - trip.startOdometer;
    if (distance <= 0 || !selectedVehicle.averageConsumptionKmPerLiter || selectedVehicle.averageConsumptionKmPerLiter <= 0) {
      return { fuel: '0.00' };
    }
    const fuelConsumed = distance / selectedVehicle.averageConsumptionKmPerLiter;
    
    return {
      fuel: fuelConsumed.toFixed(2),
    };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-2xl text-primary">Viajes Activos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {trips.map(trip => {
          const estimates = getEstimatedCostAndFuel(trip);
          return (
            <div key={trip.id} className="rounded-lg border border-primary/50 bg-primary/10 p-4">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="flex-1">
                  <p className="font-semibold text-lg">{trip.tripType}: {trip.destination}</p>
                  <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                      <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> Inició: {formatDateTime(trip.startDate)}</span>
                      <span className="flex items-center gap-1.5"><Gauge className="h-4 w-4" /> Odóm. Inicial: {trip.startOdometer.toLocaleString()} km</span>
                      <span className="flex items-center gap-1.5"><User className="h-4 w-4" /> Conductor: {trip.username}</span>
                  </div>
                  <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                      <span className="flex items-center gap-1.5"><Droplets className="h-4 w-4" /> Combustible (est): {estimates.fuel} L</span>
                  </div>
                </div>
                <div className="flex gap-2 self-start sm:self-center shrink-0">
                  <AddTripDialog vehicleId={vehicleId} trip={trip} lastOdometer={lastOdometer}>
                    <Button variant="outline">
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                  </AddTripDialog>
                  <AddTripDialog vehicleId={vehicleId} trip={trip} lastOdometer={lastOdometer}>
                    <Button variant="destructive">
                      <Flag className="mr-2 h-4 w-4" />
                      Finalizar
                    </Button>
                  </AddTripDialog>
                   <DeleteTripDialog vehicleId={vehicleId} tripId={trip.id} />
                </div>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  );
}
