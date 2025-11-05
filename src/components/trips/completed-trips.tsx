'use client';

import type { Trip } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Map, Calendar, Gauge, Info, Edit, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import AddTripDialog from '../dashboard/add-trip-dialog';
import { Button } from '../ui/button';

interface CompletedTripsProps {
    trips: Trip[];
    vehicleId: string;
}

function TripDetails({ trip }: { trip: Trip }) {
    const kmTraveled = trip.endOdometer && trip.startOdometer ? trip.endOdometer - trip.startOdometer : 0;
    
    // Placeholder for calculations - Phase 3
    const fuelConsumed = 'N/A';
    const totalCost = 'N/A';
    const avgConsumption = 'N/A';
    const costPerKm = 'N/A';
    const duration = 'N/A';


    return (
        <div className="space-y-3 pt-4 border-t pl-12">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                    <p className="font-medium">{fuelConsumed} L</p>
                    <p className="text-xs text-muted-foreground">Combustible Consumido</p>
                </div>
                <div>
                    <p className="font-medium">{totalCost}</p>
                    <p className="text-xs text-muted-foreground">Costo Total</p>
                </div>
                <div>
                    <p className="font-medium">{avgConsumption}</p>
                    <p className="text-xs text-muted-foreground">Consumo Promedio</p>
                </div>
                 <div>
                    <p className="font-medium">{costPerKm}</p>
                    <p className="text-xs text-muted-foreground">Costo / Km</p>
                </div>
                 <div>
                    <p className="font-medium">{duration}</p>
                    <p className="text-xs text-muted-foreground">Duración</p>
                </div>
            </div>
             {trip.notes && (
                <div className="pt-2 text-sm">
                    <p className="font-medium flex items-center gap-2"><Info className="h-4 w-4"/> Notas</p>
                    <p className="text-muted-foreground italic pl-6">{trip.notes}</p>
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


export default function CompletedTrips({ trips, vehicleId }: CompletedTripsProps) {
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
                      {formatDate(trip.startDate)} - {trip.endDate ? formatDate(trip.endDate) : ''}
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
                <TripDetails trip={trip} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
