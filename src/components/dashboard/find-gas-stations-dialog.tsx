'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Loader2, MapPin, Search, Route } from 'lucide-react';
import { ai } from '@/ai/client';
import type { GasStationResult } from '@/ai/flows/find-nearby-gas-stations';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { cn } from '@/lib/utils';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';

interface FindGasStationsDialogProps {
  onStationSelect?: (name: string) => void;
  children: React.ReactNode;
}

type GeolocationState = 'idle' | 'loading' | 'success' | 'error';
type SearchState = 'idle' | 'searching' | 'success' | 'error';

const RADIUS_OPTIONS = [
  { label: '5 km', value: 5000 },
  { label: '10 km', value: 10000 },
  { label: '25 km', value: 25000 },
];

export default function FindGasStationsDialog({ onStationSelect, children }: FindGasStationsDialogProps) {
  const [open, setOpen] = useState(false);
  const [locationState, setLocationState] = useState<GeolocationState>('idle');
  const [searchState, setSearchState] = useState<SearchState>('idle');
  const [stations, setStations] = useState<GasStationResult['stations']>([]);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [radius, setRadius] = useState<number>(RADIUS_OPTIONS[0].value);

  const handleFindStations = () => {
    if (!('geolocation' in navigator)) {
      setError('La geolocalización no está disponible en tu navegador.');
      setLocationState('error');
      return;
    }

    setLocationState('loading');
    setError(null);
    setSearchState('searching');
    setStations([]);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setLocationState('success');
        try {
          const result = await ai.findNearbyGasStations({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            radius: radius,
          });
          setStations(result.stations);
          setSearchState('success');
        } catch (e: any) {
          console.error(e);
          setError(e.message || 'No se pudieron encontrar gasolineras. Inténtalo de nuevo.');
          setSearchState('error');
        }
      },
      (error) => {
        let message = 'No se pudo obtener tu ubicación. ';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message += 'Por favor, concede permiso para acceder a tu ubicación.';
            break;
          case error.POSITION_UNAVAILABLE:
            message += 'La información de ubicación no está disponible.';
            break;
          case error.TIMEOUT:
            message += 'La solicitud de ubicación ha caducado.';
            break;
          default:
            message += 'Ocurrió un error desconocido.';
            break;
        }
        setError(message);
        setLocationState('error');
        setSearchState('idle');
      }
    );
  };

  const handleSelect = (name: string) => {
    if (onStationSelect) {
        onStationSelect(name);
        setOpen(false);
        toast({
            title: 'Gasolinera Seleccionada',
            description: `${name} ha sido añadida al campo de gasolinera.`,
        })
    }
  };
  
  const handleGetDirections = (e: React.MouseEvent, station: GasStationResult['stations'][0]) => {
    e.stopPropagation();
    const url = `https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  const resetState = () => {
    setLocationState('idle');
    setSearchState('idle');
    setStations([]);
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
            resetState();
        }
    }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Buscar Gasolineras Cercanas</DialogTitle>
          <DialogDescription>
            {onStationSelect 
                ? "Selecciona una gasolinera para añadirla al registro, o haz clic en el icono de ruta para obtener direcciones."
                : "Encuentra gasolineras cerca de ti y obtén direcciones con un clic."
            }
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 min-h-[250px]">
          {searchState !== 'searching' && (
            <div className="flex flex-col items-center justify-center gap-4">
              <ToggleGroup
                type="single"
                defaultValue={String(radius)}
                onValueChange={(value) => {
                  if (value) setRadius(Number(value));
                }}
                aria-label="Radio de búsqueda"
              >
                {RADIUS_OPTIONS.map(option => (
                  <ToggleGroupItem key={option.value} value={String(option.value)} aria-label={option.label}>
                    {option.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <Button onClick={handleFindStations} disabled={locationState === 'loading'}>
                {locationState === 'loading' ? (
                   <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                Buscar Gasolineras
              </Button>
            </div>
          )}

          {searchState === 'searching' && (
            <div className="flex flex-col items-center justify-center text-center h-full pt-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="font-semibold">
                {locationState === 'loading' ? 'Obteniendo tu ubicación...' : `Buscando en un radio de ${radius/1000} km...`}
              </p>
              <p className="text-sm text-muted-foreground">Por favor, espera un momento.</p>
            </div>
          )}

          {(locationState === 'error' || searchState === 'error') && error && (
            <Alert variant="destructive" className="mt-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {searchState === 'success' && (
            <div className="space-y-2 pt-4">
                <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
                    {stations.length > 0 ? stations.map((station) => (
                        <div
                            key={station.id}
                            className={cn(
                                "flex items-center p-3 rounded-md border group",
                                onStationSelect && "cursor-pointer hover:bg-accent"
                            )}
                            onClick={() => handleSelect(station.name)}
                        >
                            <div className="flex-1">
                                <p className="font-semibold">{station.name}</p>
                                <p className="text-sm text-muted-foreground">{station.address}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-primary">{station.distance}</span>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8"
                                    onClick={(e) => handleGetDirections(e, station)}
                                    title="Cómo llegar"
                                >
                                    <Route className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                                </Button>
                            </div>
                        </div>
                    )) : (
                      <div className="text-center py-4">
                        <p className="font-semibold">No se encontraron resultados</p>
                        <p className="text-sm text-muted-foreground">Intenta ampliar el radio de búsqueda.</p>
                      </div>
                    )}
                </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
