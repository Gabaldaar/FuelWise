'use server';

/**
 * @fileOverview Estimates the next refueling stop based on past fuel consumption.
 *
 * - estimateFuelStop - A function that estimates the next refueling stop.
 * - EstimateFuelStopInput - The input type for the estimateFuelStop function.
 * - EstimateFuelStopOutput - The return type for the estimateFuelStop function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const EstimateFuelStopInputSchema = z.object({
  vehicleMake: z.string().describe('The make of the vehicle.'),
  vehicleModel: z.string().describe('The model of the vehicle.'),
  vehicleYear: z.number().describe('The year of the vehicle.'),
  fuelCapacityLiters: z.number().describe('The fuel capacity of the vehicle in liters.'),
  averageConsumptionKmPerLiter: z
    .number()
    .describe('The average fuel consumption of the vehicle in kilometers per liter.'),
  currentFuelLevelPercent: z
    .number()
    .describe('The current fuel level of the vehicle as a percentage (0-100).'),
});
export type EstimateFuelStopInput = z.infer<typeof EstimateFuelStopInputSchema>;

const EstimateFuelStopOutputSchema = z.object({
  estimatedDistanceToEmptyKm: z
    .number()
    .describe('The estimated distance in kilometers until the fuel tank is empty.'),
  estimatedRefuelDate: z
    .string()
    .describe('The estimated date when the next refueling stop will be needed (ISO format).'),
});
export type EstimateFuelStopOutput = z.infer<typeof EstimateFuelStopOutputSchema>;

export async function estimateFuelStop(input: EstimateFuelStopInput): Promise<EstimateFuelStopOutput> {
  return estimateFuelStopFlow(input);
}

const prompt = ai.definePrompt({
  name: 'estimateFuelStopPrompt',
  input: {schema: EstimateFuelStopInputSchema},
  output: {schema: EstimateFuelStopOutputSchema},
  prompt: `You are a helpful AI assistant that estimates when a vehicle will need to refuel.

  Based on the vehicle details, fuel capacity, average fuel consumption, and current fuel level, calculate the estimated distance the vehicle can travel before needing to refuel and the estimated date when the next refueling stop will be needed.

  Vehicle Make: {{{vehicleMake}}}
  Vehicle Model: {{{vehicleModel}}}
  Vehicle Year: {{{vehicleYear}}}
  Fuel Capacity (Liters): {{{fuelCapacityLiters}}}
  Average Consumption (Km/Liter): {{{averageConsumptionKmPerLiter}}}
  Current Fuel Level (Percent): {{{currentFuelLevelPercent}}}

  Estimated Distance to Empty (Km): {{estimatedDistanceToEmptyKm}}
  Estimated Refuel Date (ISO Format): {{estimatedRefuelDate}}

  Now do the calculation.`,
});

const estimateFuelStopFlow = ai.defineFlow(
  {
    name: 'estimateFuelStopFlow',
    inputSchema: EstimateFuelStopInputSchema,
    outputSchema: EstimateFuelStopOutputSchema,
  },
  async input => {
    // Calculate estimated distance to empty (km)
    const remainingFuelLiters = (input.currentFuelLevelPercent / 100) * input.fuelCapacityLiters;
    const estimatedDistanceToEmptyKm = remainingFuelLiters * input.averageConsumptionKmPerLiter;

    // Calculate estimated refuel date
    const now = new Date();
    // Assuming a consumption rate of 1 km per day for now, this should be replaced with a user defined value
    // otherwise the AI could estimate a daily average by tracking the user's distance travelled daily
    const daysToEmpty = estimatedDistanceToEmptyKm / 1;
    const estimatedRefuelDate = new Date(now.setDate(now.getDate() + daysToEmpty)).toISOString();

    const {output} = await prompt({
      ...input,
      estimatedDistanceToEmptyKm,
      estimatedRefuelDate,
    });
    return output!;
  }
);
