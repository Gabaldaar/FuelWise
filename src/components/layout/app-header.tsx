'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';
import VehicleSelector from '../dashboard/vehicle-selector';

export default function AppHeader() {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:h-16 sm:px-6 lg:px-8">
      <SidebarTrigger className="md:hidden" />
      <div className="flex-1">
        <VehicleSelector />
      </div>
      <div className="flex items-center gap-4">
        {/* User menu can be added here */}
      </div>
    </header>
  );
}
