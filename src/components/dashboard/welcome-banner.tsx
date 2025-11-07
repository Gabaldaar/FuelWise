
'use client';

import Image from 'next/image';
import type { Vehicle, ProcessedFuelLog } from '@/lib/types';
import { Card } from '@/components/ui/card';
import AddFuelLogDialog from './add-fuel-log-dialog';
import { Wrench, Plus, Fuel, MapPin } from 'lucide-react';
import AddServiceReminderDialog from './add-service-reminder-dialog';
import { Button } from '../ui/button';
import FindNearbyGasStationsDialog from '../ai/find-nearby-gas-stations-dialog';
import { useState } from 'react';

interface WelcomeBannerProps {
  vehicle: Vehicle;
  allFuelLogs: ProcessedFuelLog[];
  lastOdometer: number;
}

export default function WelcomeBanner({ vehicle, allFuelLogs, lastOdometer }: WelcomeBannerProps) {
  const [selectedStation, setSelectedStation] = useState('');
  
  return (
    <Card className="overflow-hidden">
        <div className="flex flex-col">
             {vehicle.imageUrl && (
            <div className="relative w-full h-48 sm:h-56 bg-black/5">
                <Image
                    src={vehicle.imageUrl}
                    alt={`${vehicle.make} ${vehicle.model}`}
                    fill
                    className="object-cover"
                    data-ai-hint={vehicle.imageHint}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
                <div className="absolute bottom-0 left-0 p-6 w-full">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                        <div>
                            <h2 className="font-headline text-3xl text-white shadow-lg">{vehicle.make} {vehicle.model}</h2>
                            <p className="text-white/90 text-base">{vehicle.year} - {vehicle.plate}</p>
                        </div>
                         <div className="flex items-center flex-wrap gap-2">
                            {vehicle && (
                            <AddFuelLogDialog 
                                vehicleId={vehicle.id} 
                                vehicle={vehicle} 
                                lastLog={[...allFuelLogs].sort((a,b) => b.odometer - a.odometer)[0]}
                                fuelLog={{ gasStation: selectedStation } as any}
                            >
                                <Button size="sm" className="w-auto">
                                <Fuel className="mr-2 h-4 w-4" />
                                Añadir
                                </Button>
                            </AddFuelLogDialog>
                            )}
                            {vehicle && (
                            <AddServiceReminderDialog vehicleId={vehicle.id} lastOdometer={lastOdometer}>
                                <Button variant="secondary" size="sm" className="w-auto">
                                <Wrench className="mr-2 h-4 w-4" />
                                Añadir
                                </Button>
                            </AddServiceReminderDialog>
                            )}
                            <FindNearbyGasStationsDialog onStationSelect={setSelectedStation}>
                                <Button variant="secondary" size="sm" className="w-auto">
                                    <MapPin className="mr-2 h-4 w-4" />
                                    Buscar
                                </Button>
                            </FindNearbyGasStationsDialog>
                        </div>
                    </div>
                </div>
            </div>
            )}
        </div>
    </Card>
  );
}
