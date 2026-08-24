'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import type { Vehicle, FleetCollaborator } from '@/lib/types';
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
    return query(collection(firestore, 'vehicles'), orderBy('make'));
  }, [firestore, user]);

  const collaboratorsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'fleet_collaborators'));
  }, [firestore, user]);

  const { data: allVehicles, isLoading: isLoadingVehicles } = useCollection<Vehicle>(vehiclesQuery);
  const { data: collaborators, isLoading: isLoadingCollaborators } = useCollection<FleetCollaborator>(collaboratorsQuery);

  // Filter vehicles accessible to the current user
  const vehicles = useMemo(() => {
    if (!allVehicles || !user) return [];

    const userEmail = user.email?.toLowerCase().trim() || '';
    const userId = user.uid;

    // Check if the current user is an invited collaborator
    const myInvitations = collaborators?.filter(
      c => c.email?.toLowerCase().trim() === userEmail
    ) || [];
    const invitedOwnerIds = new Set(myInvitations.map(c => c.invitedById));
    const invitedOwnerEmails = new Set(myInvitations.map(c => c.invitedBy?.toLowerCase().trim()));

    return allVehicles.filter(v => {
      // 1. Current user is the owner
      if (v.ownerId && v.ownerId === userId) return true;
      if (v.ownerEmail && v.ownerEmail.toLowerCase().trim() === userEmail) return true;

      // 2. Legacy vehicle with no owner specified belongs to primary fleet
      if (!v.ownerId && !v.ownerEmail) {
        // Visible to primary owner or invited users
        if (userEmail.includes('gab.aldazabal') || myInvitations.length > 0 || !allVehicles.some(other => other.ownerId === userId)) {
          return true;
        }
      }

      // 3. User's email is explicitly listed in vehicle.sharedWith
      if (v.sharedWith && Array.isArray(v.sharedWith)) {
        if (v.sharedWith.some(email => email.toLowerCase().trim() === userEmail)) {
          return true;
        }
      }

      // 4. User is an authorized fleet collaborator of this vehicle's owner
      if (v.ownerId && invitedOwnerIds.has(v.ownerId)) return true;
      if (v.ownerEmail && invitedOwnerEmails.has(v.ownerEmail.toLowerCase().trim())) return true;

      return false;
    });
  }, [allVehicles, collaborators, user]);

  const isLoading = isLoadingVehicles || isLoadingCollaborators;

  useEffect(() => {
    if (isLoading || !vehicles) return;

    const currentVehicleIdFromUrl = searchParams.get('vehicle');
    
    // 1. Priority: Vehicle ID from URL
    if (currentVehicleIdFromUrl) {
      const vehicleFromUrl = vehicles.find(v => v.id === currentVehicleIdFromUrl);
      if (vehicleFromUrl) {
        if (selectedVehicle?.id !== vehicleFromUrl.id) {
          setSelectedVehicle(vehicleFromUrl);
        }
        return; 
      }
    }

    // 2. Priority: Last selected vehicle from localStorage
    const lastSelectedVehicleId = typeof window !== 'undefined' ? localStorage.getItem('lastSelectedVehicleId') : null;
    if (lastSelectedVehicleId) {
      const lastSelected = vehicles.find(v => v.id === lastSelectedVehicleId);
      if (lastSelected) {
        if (selectedVehicle?.id !== lastSelected.id) {
          setSelectedVehicle(lastSelected);
          const params = new URLSearchParams(searchParams.toString());
          params.set('vehicle', lastSelected.id);
          router.replace(`${pathname}?${params.toString()}`);
        }
        return;
      }
    }
    
    // 3. Fallback: First vehicle in the list
    if (vehicles.length > 0) {
      const vehicleToSelect = vehicles[0];
      if (selectedVehicle?.id !== vehicleToSelect.id) {
        setSelectedVehicle(vehicleToSelect);
        const params = new URLSearchParams(searchParams.toString());
        params.set('vehicle', vehicleToSelect.id);
        router.replace(`${pathname}?${params.toString()}`);
      }
    } else {
      // 4. No vehicles available
      if (selectedVehicle !== null) {
        setSelectedVehicle(null);
        const params = new URLSearchParams(searchParams.toString());
        if (params.has('vehicle')) {
          params.delete('vehicle');
          router.replace(`${pathname}?${params.toString()}`);
        }
      }
    }
  }, [searchParams, vehicles, pathname, router, isLoading, selectedVehicle]);

  const selectVehicle = (vehicleId: string) => {
    const vehicle = vehicles?.find(v => v.id === vehicleId);
    if (vehicle) {
      setSelectedVehicle(vehicle);
      if (typeof window !== 'undefined') {
        localStorage.setItem('lastSelectedVehicleId', vehicleId);
      }
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
