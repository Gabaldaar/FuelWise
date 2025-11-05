import type { Vehicle, FuelLog, ServiceReminder } from './types';

export const vehicles: Vehicle[] = [
  {
    id: 'vehicle-1',
    make: 'Toyota',
    model: 'Corolla',
    year: 2022,
    plate: 'XYZ-123',
    fuelCapacityLiters: 50,
    averageConsumptionKmPerLiter: 14.5,
    imageUrl: 'https://picsum.photos/seed/1/600/400',
    imageHint: 'sedan car',
  },
  {
    id: 'vehicle-2',
    make: 'Ford',
    model: 'Ranger',
    year: 2023,
    plate: 'ABC-456',
    fuelCapacityLiters: 80,
    averageConsumptionKmPerLiter: 9.8,
    imageUrl: 'https://picsum.photos/seed/2/600/400',
    imageHint: 'pickup truck',
  },
];

export const fuelLogs: FuelLog[] = [
  // Logs for Vehicle 1
  {
    id: 'log-1',
    vehicleId: 'vehicle-1',
    date: '2024-06-01T10:00:00Z',
    odometer: 15000,
    fuelType: 'Gasolina',
    pricePerLiter: 1.5,
    totalCost: 60,
    liters: 40,
    gasStation: 'Shell',
  },
  {
    id: 'log-2',
    vehicleId: 'vehicle-1',
    date: '2024-06-15T12:30:00Z',
    odometer: 15580,
    fuelType: 'Gasolina',
    pricePerLiter: 1.52,
    totalCost: 62.32,
    liters: 41,
    gasStation: 'Repsol',
  },
  {
    id: 'log-3',
    vehicleId: 'vehicle-1',
    date: '2024-07-01T08:00:00Z',
    odometer: 16170,
    fuelType: 'Gasolina',
    pricePerLiter: 1.48,
    totalCost: 59.2,
    liters: 40,
    gasStation: 'BP',
  },
    // Logs for Vehicle 2
  {
    id: 'log-4',
    vehicleId: 'vehicle-2',
    date: '2024-06-05T18:00:00Z',
    odometer: 8000,
    fuelType: 'Diesel',
    pricePerLiter: 1.3,
    totalCost: 91,
    liters: 70,
    gasStation: 'Cepsa',
  },
  {
    id: 'log-5',
    vehicleId: 'vehicle-2',
    date: '2024-06-25T15:00:00Z',
    odometer: 8686,
    fuelType: 'Diesel',
    pricePerLiter: 1.35,
    totalCost: 94.5,
    liters: 70,
    gasStation: 'Shell',
  },
];

export const serviceReminders: ServiceReminder[] = [
    // Reminders for Vehicle 1
  {
    id: 'reminder-1',
    vehicleId: 'vehicle-1',
    serviceType: 'Cambio de Aceite',
    dueOdometer: 20000,
    notes: 'Usar aceite sintético 5W-30.',
    isUrgent: false,
  },
  {
    id: 'reminder-2',
    vehicleId: 'vehicle-1',
    serviceType: 'Rotación de Neumáticos',
    dueDate: '2024-09-01T00:00:00Z',
    notes: 'Revisar presión también.',
    isUrgent: false,
  },
    // Reminders for Vehicle 2
  {
    id: 'reminder-3',
    vehicleId: 'vehicle-2',
    serviceType: 'Revisión General',
    dueOdometer: 10000,
    notes: 'Revisión de los 10,000 km.',
    isUrgent: true,
  },
];
