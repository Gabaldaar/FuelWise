'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import type { Vehicle } from '@/lib/types';
import { initialVehicles } from '@/lib/data';

interface VehicleContextType {
  vehicles: Vehicle[];
  selectedVehicle: Vehicle | null;
  selectVehicle: (vehicleId: string) => void;
  addVehicle: (vehicle: Vehicle) => void;
  updateVehicle: (vehicle: Vehicle) => void;
  deleteVehicle: (vehicleId: string) => void;
}

const VehicleContext = createContext<VehicleContextType | undefined>(undefined);

export const VehicleProvider = ({ children }: { children: ReactNode }) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const currentVehicleId = searchParams.get('vehicle');
    if (currentVehicleId) {
      const vehicle = vehicles.find(v => v.id === currentVehicleId) || null;
      setSelectedVehicle(vehicle);
    } else if (vehicles.length > 0) {
      setSelectedVehicle(vehicles[0]);
      // Update URL to reflect the default selected vehicle
      const params = new URLSearchParams(searchParams);
      params.set('vehicle', vehicles[0].id);
      router.replace(`${pathname}?${params.toString()}`);
    } else {
        setSelectedVehicle(null);
    }
  }, [searchParams, vehicles, pathname, router]);

  const selectVehicle = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (vehicle) {
      setSelectedVehicle(vehicle);
      const params = new URLSearchParams(searchParams);
      params.set('vehicle', vehicleId);
      router.replace(`${pathname}?${params.toString()}`);
    }
  };

  const addVehicle = (vehicle: Vehicle) => {
    const newVehicles = [...vehicles, vehicle];
    setVehicles(newVehicles);
  };

  const updateVehicle = (updatedVehicle: Vehicle) => {
    const newVehicles = vehicles.map(v => v.id === updatedVehicle.id ? updatedVehicle : v);
    setVehicles(newVehicles);
  };

  const deleteVehicle = (vehicleId: string) => {
    const newVehicles = vehicles.filter(v => v.id !== vehicleId);
    setVehicles(newVehicles);
    if (selectedVehicle?.id === vehicleId) {
        if (newVehicles.length > 0) {
            selectVehicle(newVehicles[0].id);
        } else {
            setSelectedVehicle(null);
            const params = new URLSearchParams(searchParams);
            params.delete('vehicle');
            router.replace(`${pathname}?${params.toString()}`);
        }
    }
  };

  return (
    <VehicleContext.Provider value={{ vehicles, selectedVehicle, selectVehicle, addVehicle, updateVehicle, deleteVehicle }}>
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
