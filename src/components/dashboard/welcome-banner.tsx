'use client';

import Image from 'next/image';
import type { Vehicle, ProcessedFuelLog } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import AddFuelLogDialog from './add-fuel-log-dialog';
import { useEffect, useState } from 'react';
import type { EstimateFuelStopOutput } from '@/ai/flows/estimate-fuel-stop';
import { useToast } from '@/hooks/use-toast';
import { ai } from '@/ai/client';
import { formatDate } from '@/lib/utils';
import { Loader2, Wrench, Plus, Gauge, MapPin } from 'lucide-react';
import AddServiceReminderDialog from './add-service-reminder-dialog';
import { Button } from '../ui/button';
import FindGasStationsDialog from './find-gas-stations-dialog';

interface WelcomeBannerProps {
  vehicle: Vehicle & { averageConsumptionKmPerLiter?: number };
  lastLog?: ProcessedFuelLog;
}

export default function WelcomeBanner({ vehicle, lastLog }: WelcomeBannerProps) {
  const [estimate, setEstimate] = useState<EstimateFuelStopOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const getEstimate = async () => {
      if (!vehicle || !vehicle.averageConsumptionKmPerLiter || !lastLog) return;

      setIsLoading(true);
      try {
        const currentFuelLevelPercent = lastLog?.isFillUp ? 100 : 80;

        const output = await ai.estimateFuelStop({
          vehicleMake: vehicle.make,
          vehicleModel: vehicle.model,
          vehicleYear: vehicle.year,
          fuelCapacityLiters: vehicle.fuelCapacityLiters,
          averageConsumptionKmPerLiter: vehicle.averageConsumptionKmPerLiter,
          currentFuelLevelPercent: currentFuelLevelPercent,
          currentOdometer: lastLog.odometer,
        });
        setEstimate(output);
      } catch (error) {
        console.error('Error getting fuel estimate:', error);
        toast({
          variant: 'destructive',
          title: 'Error de Estimación',
          description: 'No se pudo estimar la próxima parada de recarga.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    getEstimate();
  }, [vehicle, lastLog, toast]);

  return (
    <Card className="overflow-hidden">
        <div className="flex flex-col">
             {vehicle.imageUrl && (
            <div className="relative w-full h-48 sm:h-64 bg-black/5">
                <Image
                    src={vehicle.imageUrl}
                    alt={`${vehicle.make} ${vehicle.model}`}
                    fill
                    className="object-cover"
                    data-ai-hint={vehicle.imageHint}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <div className="absolute bottom-0 left-0 p-6">
                    <h2 className="font-headline text-3xl text-white shadow-lg">{vehicle.make} {vehicle.model}</h2>
                    <p className="text-white/90 text-base">{vehicle.year} - {vehicle.plate}</p>
                </div>
            </div>
            )}
             <CardContent className="p-6 space-y-4">
                <div className="flex items-center flex-wrap gap-2">
                    {vehicle && (
                      <AddFuelLogDialog vehicleId={vehicle.id} lastLog={lastLog} vehicle={vehicle}>
                        <Button size="sm" className="w-auto">
                          <Plus className="-ml-1 mr-2 h-4 w-4" />
                          Añadir Recarga
                        </Button>
                      </AddFuelLogDialog>
                    )}
                    {vehicle && (
                    <AddServiceReminderDialog vehicleId={vehicle.id} lastOdometer={lastLog?.odometer}>
                        <Button variant="secondary" size="sm" className="w-auto">
                          <Wrench className="mr-2 h-4 w-4" />
                          Añadir Recordatorio
                        </Button>
                    </AddServiceReminderDialog>
                    )}
                    <FindGasStationsDialog>
                        <Button variant="secondary" size="sm" className="w-auto">
                          <MapPin className="mr-2 h-4 w-4" />
                          Buscar Gasolinera
                        </Button>
                    </FindGasStationsDialog>
                </div>
                <div className="flex items-center gap-4">
                    {isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
                    {estimate && !isLoading && (
                    <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                        <span>Autonomía est: <b>{Math.round(estimate.estimatedDistanceToEmptyKm)} km</b></span>
                        <span>Próx. recarga: <b>{formatDate(estimate.estimatedRefuelDate)}</b></span>
                        <span className="flex items-center gap-1">
                          <Gauge className="h-3 w-3" />
                          <b>{Math.round(estimate.estimatedOdometerAtEmpty).toLocaleString()} km</b>
                        </span>
                    </div>
                    )}
                </div>
            </CardContent>
        </div>
    </Card>
  );
}
