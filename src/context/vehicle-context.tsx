'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import type { Vehicle } from '@/lib/types';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';

interface VehicleContextType {
  vehicles: Vehicle[];
  selectedVehicle: Vehicle | null;
  selectVehicle: (vehicleId: string) => void;
  isLoading: boolean;
}

const VehicleContext = createContext<VehicleContextType | undefined>(undefined);

export const VehicleProvider = ({ children }: { children: ReactNode }) => {
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { user } = useUser();
  const firestore = useFirestore();

  const vehiclesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'users', user.uid, 'vehicles'), orderBy('make'));
  }, [firestore, user]);

  const { data: vehicles, isLoading } = useCollection<Vehicle>(vehiclesQuery);

  useEffect(() => {
    if (isLoading || !vehicles) return;

    const currentVehicleId = searchParams.get('vehicle');
    
    // If there's a vehicle ID in the URL, try to select it
    if (currentVehicleId) {
      const vehicleFromUrl = vehicles.find(v => v.id === currentVehicleId);
      if (vehicleFromUrl) {
        if (selectedVehicle?.id !== vehicleFromUrl.id) {
          setSelectedVehicle(vehicleFromUrl);
        }
        return; 
      }
    }
    
    // If there's already a selected vehicle and it still exists in the list, do nothing
    if(selectedVehicle && vehicles.some(v => v.id === selectedVehicle.id)) {
        return;
    }

    // If no vehicle is selected (or selected one is gone), or no valid ID in URL
    if (vehicles.length > 0) {
      const vehicleToSelect = vehicles[0];
      setSelectedVehicle(vehicleToSelect);
      // Update URL only if it doesn't match
      if (currentVehicleId !== vehicleToSelect.id) {
        const params = new URLSearchParams(searchParams.toString());
        params.set('vehicle', vehicleToSelect.id);
        router.replace(`${pathname}?${params.toString()}`);
      }
    } else {
      // No vehicles available
      setSelectedVehicle(null);
      // Optionally clear vehicle from URL
      const params = new URLSearchParams(searchParams.toString());
      if (params.has('vehicle')) {
          params.delete('vehicle');
          router.replace(`${pathname}?${params.toString()}`);
      }
    }
  }, [searchParams, vehicles, pathname, router, isLoading, selectedVehicle]);

  const selectVehicle = (vehicleId: string) => {
    const vehicle = vehicles?.find(v => v.id === vehicleId);
    if (vehicle) {
      setSelectedVehicle(vehicle);
      const params = new URLSearchParams(searchParams.toString());
      params.set('vehicle', vehicleId);
      router.push(`${pathname}?${params.toString()}`);
    }
  };

  return (
    <VehicleContext.Provider value={{ vehicles: vehicles || [], selectedVehicle, selectVehicle, isLoading }}>
      {children}
    </VehicleContext.Provider>
  );
};

export const useVehicles = () => {
  const context = useContext(VehicleContext);
  if (context === undefined) {
    throw new Error('useVehicles must be used within a VehicleProvider');
  }
  return context;
};
