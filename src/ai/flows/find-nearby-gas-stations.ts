
'use server';
/**
 * @fileOverview A flow to find nearby gas stations using the user's location.
 *
 * - findNearbyGasStations - A function that finds gas stations.
 * - GasStationResult - The output type for the findNearbyGasStations function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const FindNearbyGasStationsInputSchema = z.object({
  latitude: z.number().describe("The user's current latitude."),
  longitude: z.number().describe("The user's current longitude."),
});
export type FindNearbyGasStationsInput = z.infer<typeof FindNearbyGasStationsInputSchema>;

const GasStationResultSchema = z.object({
  stations: z.array(
    z.object({
      name: z.string().describe('The name of the gas station.'),
      address: z.string().describe('The address of the gas station.'),
      distance: z.string().describe('The distance from the user in kilometers.'),
    })
  ).describe('A list of nearby gas stations.'),
});
export type GasStationResult = z.infer<typeof GasStationResultSchema>;


export async function findNearbyGasStations(input: FindNearbyGasStationsInput): Promise<GasStationResult> {
  return findNearbyGasStationsFlow(input);
}


// This is a mock tool. In a real application, this would call an external API
// like Google Maps Places API to get real data.
const getNearbyGasStationsTool = ai.defineTool(
  {
    name: 'getNearbyGasStations',
    description: "Get a list of gas stations near the user's current location.",
    outputSchema: GasStationResultSchema,
  },
  async () => {
    // Mock data - in a real scenario, this would be an API call.
    console.log(`Simulating API call for gas stations`);
    return {
        stations: [
            { name: 'Shell Av. Libertador', address: 'Av. del Libertador 1234, CABA', distance: '1.2 km' },
            { name: 'YPF Figueroa Alcorta', address: 'Av. Pres. Figueroa Alcorta 5678, CABA', distance: '2.5 km' },
            { name: 'Axion Energy', address: 'Coronel Díaz 2300, CABA', distance: '3.1 km' },
            { name: 'Puma Energy Palermo', address: 'Juan B. Justo 1500, CABA', distance: '4.0 km' },
            { name: 'Gulf Combustibles', address: 'Av. Santa Fe 3456, CABA', distance: '4.8 km' },
        ],
    };
  }
);


const findNearbyGasStationsFlow = ai.defineFlow(
  {
    name: 'findNearbyGasStationsFlow',
    inputSchema: FindNearbyGasStationsInputSchema,
    outputSchema: GasStationResultSchema,
  },
  async (input) => {
    // In this revised, reliable implementation, we directly call the tool.
    // The previous implementation depending on the LLM to decide to use the tool
    // was prone to failure. This is direct and guaranteed to work for the simulation.
    const result = await getNearbyGasStationsTool(input);
    return result;
  }
);
