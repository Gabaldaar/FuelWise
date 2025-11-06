
'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';
import VehicleSelector from '../dashboard/vehicle-selector';
import { useVehicles } from '@/context/vehicle-context';
import Image from 'next/image';
import { Car } from 'lucide-react';


export default function AppHeader() {
  const { selectedVehicle } = useVehicles();
  
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:h-16 sm:px-6 lg:px-8">
      <SidebarTrigger className="md:hidden" />
      
      <div className="flex flex-1 items-center gap-4">
        {selectedVehicle && (
           <div className="flex items-center gap-3">
              <div className="relative h-10 w-10 flex-shrink-0">
                {selectedVehicle.imageUrl ? (
                    <Image
                      src={selectedVehicle.imageUrl}
                      alt={`${selectedVehicle.make} ${selectedVehicle.model}`}
                      fill
                      className="rounded-full object-cover"
                      data-ai-hint={selectedVehicle.imageHint}
                    />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-muted">
                    <Car className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div>
                <h2 className="font-semibold text-lg">{selectedVehicle.make} {selectedVehicle.model}</h2>
                <p className="text-xs text-muted-foreground">{selectedVehicle.plate}</p>
              </div>
           </div>
        )}
        <VehicleSelector />
      </div>

      <div className="flex items-center gap-4">
        {/* User info moved to sidebar footer */}
      </div>
    </header>
  );
}
