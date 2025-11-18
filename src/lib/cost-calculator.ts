import type { Vehicle } from './types';

export interface CostPerKmUSD {
  fixedCostPerKm: number;      // Amortization + Patent + Insurance (USD/km)
  variableCostPerKm: number;   // Maintenance + Tires (USD/km)
}

export interface DetailedCostsARS {
  fuelCostPerKm_ARS: number;
  fixedCostPerKm_ARS: number;
  variableCostPerKm_ARS: number;
  totalCostPerKm_ARS: number;
}


/**
 * Calculates the different cost components per kilometer for a given vehicle.
 *
 * @param vehicle - The vehicle object with all its financial and usage data.
 * @param averageConsumptionKmPerLiter - The vehicle's average fuel consumption in km/L.
 * @param currentFuelPrice - The current price of fuel in ARS per liter.
 * @returns An object with the cost components per kilometer.
 */
export function calculateCostsPerKm(
  vehicle: Vehicle,
  averageConsumptionKmPerLiter: number,
  currentFuelPrice: number
): { costPerKmUSD: CostPerKmUSD, fuelCostPerKmARS: number } {
  
  const {
    purchasePrice = 0,
    resaleValue = 0,
    kmPerYear = 0,
    usefulLifeYears = 0,
    annualInsuranceCost = 0,
    annualPatentCost = 0,
    maintenanceCost = 0,
    maintenanceKm = 0,
    tiresCost = 0,
    tiresKm = 0,
  } = vehicle;

  // 1. Amortización del vehículo por Km (Am/Km) in USD
  let amortizationPerKm = 0;
  if (purchasePrice > 0 && kmPerYear > 0 && usefulLifeYears > 0) {
    const totalKmAmortization = kmPerYear * usefulLifeYears;
    if (totalKmAmortization > 0) {
        amortizationPerKm = (purchasePrice - resaleValue) / totalKmAmortization;
    }
  }
  
  // 2. Costos Fijos (CF) in USD/km
  const insurancePerKm = kmPerYear > 0 ? annualInsuranceCost / kmPerYear : 0;
  const patentPerKm = kmPerYear > 0 ? annualPatentCost / kmPerYear : 0;
  const fixedCostPerKm = amortizationPerKm + insurancePerKm + patentPerKm;

  // 3. Costos Variables (CV) in USD/km
  const maintenancePerKm = maintenanceKm > 0 ? maintenanceCost / maintenanceKm : 0;
  const tiresPerKm = tiresKm > 0 ? tiresCost / tiresKm : 0;
  const variableCostPerKm = maintenancePerKm + tiresPerKm;

  // 4. Costo de combustible por kilómetro (CC) in ARS/km
  let fuelCostPerKmARS = 0;
  if (averageConsumptionKmPerLiter > 0 && currentFuelPrice > 0) {
    const litersPerKm = 1 / averageConsumptionKmPerLiter;
    fuelCostPerKmARS = litersPerKm * currentFuelPrice;
  }

  return {
    costPerKmUSD: {
      fixedCostPerKm,
      variableCostPerKm
    },
    fuelCostPerKmARS,
  };
}

/**
 * Calculates the total cost per KM in ARS using the provided exchange rate.
 * @param costs - The object containing cost components.
 * @param exchangeRate - The current USD to ARS exchange rate.
 * @returns The total cost per kilometer in ARS.
 */
export function calculateTotalCostInARS(
    costPerKmUSD: CostPerKmUSD, 
    fuelCostPerKmARS: number, 
    exchangeRate: number | null
): DetailedCostsARS {

    if (!exchangeRate || exchangeRate <= 0) {
      return {
        fuelCostPerKm_ARS: fuelCostPerKmARS,
        fixedCostPerKm_ARS: 0,
        variableCostPerKm_ARS: 0,
        totalCostPerKm_ARS: fuelCostPerKmARS,
      }
    };

    const fixedCostPerKm_ARS = costPerKmUSD.fixedCostPerKm * exchangeRate;
    const variableCostPerKm_ARS = costPerKmUSD.variableCostPerKm * exchangeRate;
    
    const totalCostPerKm_ARS = fixedCostPerKm_ARS + variableCostPerKm_ARS + fuelCostPerKmARS;
    
    return {
      fuelCostPerKm_ARS: fuelCostPerKmARS,
      fixedCostPerKm_ARS: fixedCostPerKm_ARS,
      variableCostPerKm_ARS: variableCostPerKm_ARS,
      totalCostPerKm_ARS,
    }
}
