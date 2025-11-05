'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Check, ChevronsUpDown, Car } from 'lucide-react';
import { vehicles } from '@/lib/data';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export default function VehicleSelector() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentVehicleId = searchParams.get('vehicle') || vehicles[0]?.id;
  const selectedVehicle = vehicles.find((v) => v.id === currentVehicleId);

  const handleSelect = (vehicleId: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('vehicle', vehicleId);
    router.replace(`${pathname}?${params.toString()}`);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[250px] justify-between"
        >
          <div className="flex items-center gap-2">
            <Car className="h-4 w-4" />
            {selectedVehicle
              ? `${selectedVehicle.make} ${selectedVehicle.model}`
              : 'Seleccionar vehículo...'}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0">
        <Command>
          <CommandInput placeholder="Buscar vehículo..." />
          <CommandList>
            <CommandEmpty>No se encontraron vehículos.</CommandEmpty>
            <CommandGroup>
              {vehicles.map((vehicle) => (
                <CommandItem
                  key={vehicle.id}
                  value={vehicle.id}
                  onSelect={() => handleSelect(vehicle.id)}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      currentVehicleId === vehicle.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {vehicle.make} {vehicle.model} ({vehicle.plate})
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
