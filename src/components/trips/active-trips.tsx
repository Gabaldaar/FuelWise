'use client';

import type { Trip } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Flag, Calendar, Gauge } from 'lucide-react';
import AddTripDialog from '@/components/dashboard/add-trip-dialog';
import { formatDate } from '@/lib/utils';

interface ActiveTripsProps {
    trips: Trip[];
    vehicleId: string;
    lastOdometer: number;
}

export default function ActiveTrips({ trips, vehicleId, lastOdometer }: ActiveTripsProps) {
  if (trips.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-2xl text-primary">Viajes Activos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {trips.map(trip => (
          <div key={trip.id} className="rounded-lg border border-primary/50 bg-primary/10 p-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex-1">
                <p className="font-semibold text-lg">{trip.tripType}: {trip.destination}</p>
                <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                    <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> Inició: {formatDate(trip.startDate)}</span>
                    <span className="flex items-center gap-1.5"><Gauge className="h-4 w-4" /> Odóm. Inicial: {trip.startOdometer.toLocaleString()} km</span>
                </div>
              </div>
              <AddTripDialog vehicleId={vehicleId} trip={trip} lastOdometer={lastOdometer}>
                <Button variant="destructive">
                  <Flag className="mr-2 h-4 w-4" />
                  Finalizar Viaje
                </Button>
              </AddTripDialog>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
