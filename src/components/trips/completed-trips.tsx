'use client';

import type { Trip, ProcessedFuelLog, Vehicle } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Map, Edit, Trash2, Clock, Droplets, Wallet, Route, CircleDollarSign } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import AddTripDialog from '../dashboard/add-trip-dialog';
import { Button } from '../ui/button';
import { useMemo } from 'react';
import { differenceInHours, differenceInMinutes } from 'date-fns';
import { usePreferences } from '@/context/preferences-context';

interface CompletedTripsProps {
    trips: Trip[];
    vehicle: Vehicle;
    allFuelLogs: ProcessedFuelLog[];
}

function TripDetails({ trip, vehicle, allFuelLogs }: { trip: Trip, vehicle: Vehicle, allFuelLogs: ProcessedFuelLog[] }) {
    const { getFormattedConsumption, consumptionUnit } = usePreferences();
    const kmTraveled = trip.endOdometer && trip.startOdometer ? trip.endOdometer - trip.startOdometer : 0;
    
    const {
        fuelConsumed,
        totalCost,
        avgConsumptionForTrip,
        costPerKm,
        duration
    } = useMemo(() => {
        if (kmTraveled <= 0) return { fuelConsumed: 0, totalCost: 0, avgConsumptionForTrip: 0, costPerKm: 0, duration: "N/A" };

        const sortedLogs = [...allFuelLogs].sort((a, b) => a.odometer - b.odometer);
        const avgPricePerLiter = sortedLogs.length > 0 ? sortedLogs.reduce((acc, log) => acc + log.pricePerLiter, 0) / sortedLogs.length : 0;
        
        const vehicleAvgConsumption = vehicle.averageConsumptionKmPerLiter;
        if (vehicleAvgConsumption <= 0) return { fuelConsumed: 0, totalCost: 0, avgConsumptionForTrip: 0, costPerKm: 0, duration: "N/A" };

        const fuelConsumed = kmTraveled / vehicleAvgConsumption;
        const totalCost = fuelConsumed * avgPricePerLiter;
        const costPerKm = totalCost / kmTraveled;

        let duration = "N/A";
        if (trip.endDate && trip.startDate) {
            const hours = differenceInHours(new Date(trip.endDate), new Date(trip.startDate));
            const minutes = differenceInMinutes(new Date(trip.endDate), new Date(trip.startDate)) % 60;
            duration = `${hours}h ${minutes}m`;
        }

        return {
            fuelConsumed,
            totalCost,
            avgConsumptionForTrip: vehicleAvgConsumption,
            costPerKm,
            duration
        }
    }, [trip, allFuelLogs, kmTraveled, vehicle.averageConsumptionKmPerLiter]);


    return (
        <div className="space-y-3 pt-4 border-t pl-12">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                    <Droplets className="h-4 w-4 text-muted-foreground" />
                    <div>
                        <p className="font-medium">{fuelConsumed.toFixed(2)} L</p>
                        <p className="text-xs text-muted-foreground">Combustible (Est.)</p>
                    </div>
                </div>
                 <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                    <div>
                        <p className="font-medium">${totalCost.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">Costo Total (Est.)</p>
                    </div>
                </div>
                 <div className="flex items-center gap-2">
                    <Route className="h-4 w-4 text-muted-foreground" />
                    <div>
                        <p className="font-medium">{getFormattedConsumption(avgConsumptionForTrip)}</p>
                        <p className="text-xs text-muted-foreground">Consumo ({consumptionUnit})</p>
                    </div>
                </div>
                 <div className="flex items-center gap-2">
                    <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                        <p className="font-medium">${costPerKm.toFixed(3)}</p>
                        <p className="text-xs text-muted-foreground">Costo / Km</p>
                    </div>
                </div>
                 <div className="flex items-center gap-2">
                     <Clock className="h-4 w-4 text-muted-foreground" />
                     <div>
                        <p className="font-medium">{duration}</p>
                        <p className="text-xs text-muted-foreground">Duración</p>
                     </div>
                </div>
            </div>
             {trip.notes && (
                <div className="pt-2 text-sm">
                    <p className="font-medium">Notas:</p>
                    <p className="text-muted-foreground italic">{trip.notes}</p>
                </div>
            )}
             <div className="flex gap-2 pt-4">
                <AddTripDialog vehicleId={trip.vehicleId} trip={trip} lastOdometer={trip.endOdometer || 0}>
                    <Button variant="outline" size="sm" className="w-full">
                        <Edit className="h-4 w-4 mr-1" /> Ver/Editar
                    </Button>
                </AddTripDialog>
                <Button variant="outline" size="sm" className="w-full text-destructive hover:text-destructive" disabled>
                    <Trash2 className="h-4 w-4 mr-1" /> Eliminar
                </Button>
            </div>
        </div>
    );
}


export default function CompletedTrips({ trips, vehicle, allFuelLogs }: CompletedTripsProps) {
  if (trips.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Historial de Viajes</CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {trips.map(trip => (
            <AccordionItem value={trip.id} key={trip.id}>
              <AccordionTrigger className="px-6 py-4 text-left hover:no-underline">
                <div className="flex items-center gap-4 w-full">
                  <Map className="h-8 w-8 flex-shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{trip.tripType}: {trip.destination}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {formatDateTime(trip.startDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {trip.endOdometer && trip.startOdometer ? (trip.endOdometer - trip.startOdometer).toLocaleString() : '0'} km
                    </p>
                    <p className="text-xs text-muted-foreground">Distancia</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4">
                <TripDetails trip={trip} vehicle={vehicle} allFuelLogs={allFuelLogs} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
