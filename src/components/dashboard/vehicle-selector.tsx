'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Car } from 'lucide-react';
import { useVehicles } from '@/context/vehicle-context';
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
  const { vehicles, selectedVehicle, selectVehicle } = useVehicles();

  const handleSelect = (vehicleId: string) => {
    selectVehicle(vehicleId);
    setOpen(false);
  };

  if (!vehicles.length) {
    return null;
  }

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
                      selectedVehicle?.id === vehicle.id ? 'opacity-100' : 'opacity-0'
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
