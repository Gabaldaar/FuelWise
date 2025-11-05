'use client';

import { Suspense } from 'react';
import { fuelLogs, serviceReminders } from '@/lib/data';
import type { ProcessedFuelLog } from '@/lib/types';
import WelcomeBanner from '@/components/dashboard/welcome-banner';
import StatCard from '@/components/dashboard/stat-card';
import FuelConsumptionChart from '@/components/dashboard/fuel-consumption-chart';
import ServiceReminders from '@/components/dashboard/service-reminders';
import FuelEstimate from '@/components/dashboard/fuel-estimate';
import RecentFuelLogs from '@/components/dashboard/recent-fuel-logs';
import { useVehicles } from '@/context/vehicle-context';

// This function would typically live in a data-access layer or lib folder
function processFuelLogs(logs: typeof fuelLogs, vehicleId: string): ProcessedFuelLog[] {
  const vehicleLogs = logs
    .filter(log => log.vehicleId === vehicleId)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return vehicleLogs.map((log, index) => {
    if (index === 0) {
      return { ...log };
    }
    const prevLog = vehicleLogs[index - 1];
    const distanceTraveled = log.odometer - prevLog.odometer;
    const consumption = distanceTraveled > 0 && log.liters > 0 ? distanceTraveled / log.liters : 0;
    
    return {
      ...log,
      distanceTraveled,
      consumption: parseFloat(consumption.toFixed(2)),
    };
  });
}

export default function DashboardPage() {
  const { selectedVehicle: vehicle } = useVehicles();

  if (!vehicle) {
    return <div className="text-center">Por favor, seleccione un vehículo.</div>;
  }
  
  const vehicleFuelLogs = processFuelLogs(fuelLogs, vehicle.id);
  const vehicleServiceReminders = serviceReminders.filter(
    (reminder) => reminder.vehicleId === vehicle.id
  );
  
  const totalSpent = vehicleFuelLogs.reduce((acc, log) => acc + log.totalCost, 0);
  const totalLiters = vehicleFuelLogs.reduce((acc, log) => acc + log.liters, 0);
  
  const consumptionLogs = vehicleFuelLogs.filter(log => log.consumption && log.consumption > 0);
  const avgConsumption = consumptionLogs.length > 0 
    ? consumptionLogs.reduce((acc, log) => acc + (log.consumption || 0), 0) / consumptionLogs.length
    : vehicle.averageConsumptionKmPerLiter;

  return (
    <div className="flex flex-col gap-6">
      <WelcomeBanner vehicle={vehicle} />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Consumo Promedio" value={`${avgConsumption.toFixed(2)} km/L`} />
        <StatCard title="Costo Total" value={`$${totalSpent.toFixed(2)}`} />
        <StatCard title="Litros Totales" value={`${totalLiters.toFixed(2)} L`} />
        <StatCard title="Próximo Servicio" value={vehicleServiceReminders[0]?.serviceType || 'N/A'} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <FuelConsumptionChart data={vehicleFuelLogs} />
        </div>
        <div className="lg:col-span-2">
          <RecentFuelLogs data={vehicleFuelLogs} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
           <Suspense fallback={<div>Cargando estimación...</div>}>
            <FuelEstimate vehicle={vehicle} />
           </Suspense>
        </div>
        <div className="lg:col-span-2">
          <ServiceReminders data={vehicleServiceReminders} />
        </div>
      </div>
    </div>
  );
}
