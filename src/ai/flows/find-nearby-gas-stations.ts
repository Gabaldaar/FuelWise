'use server';
/**
 * @fileoverview Flow to find nearby gas stations using the Google Maps Places API.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { Client, type Place } from '@googlemaps/google-maps-services-js';

const GasStationInputSchema = z.object({
  latitude: z.number().describe('The latitude of the user\'s current location.'),
  longitude: z.number().describe('The longitude of the user\'s current location.'),
  radius: z.number().min(1000).max(50000).default(5000).describe('The search radius in meters.'),
});

const GasStationOutputSchema = z.object({
  name: z.string().describe('The name of the gas station.'),
  address: z.string().describe('The address of the gas station.'),
  distance: z.string().describe('The distance from the user\'s location.'),
  mapsUrl: z.string().url().describe('A URL to get directions to the gas station on Google Maps.'),
});

export type GasStationInput = z.infer<typeof GasStationInputSchema>;
export type GasStationOutput = z.infer<typeof GasStationOutputSchema>;

// This is the function we will call directly from our React component.
export async function findNearbyGasStations(input: GasStationInput): Promise<GasStationOutput[]> {
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    console.error("[Gas Station Flow] FATAL: GOOGLE_MAPS_API_KEY environment variable is not set.");
    throw new Error("El servicio de mapas no está configurado en el servidor. Esta función está deshabilitada.");
  }
  
  try {
    const client = new Client({});

    const response = await client.placesNearby({
      params: {
        location: { lat: input.latitude, lng: input.longitude },
        radius: input.radius,
        type: 'gas_station',
        key: process.env.GOOGLE_MAPS_API_KEY!,
      },
    });

    // Handle non-OK statuses that are not ZERO_RESULTS
    if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
      console.error('Places API error:', response.data.error_message || response.data.status);
      throw new Error(`El servicio de mapas respondió con un error: ${response.data.status}`);
    }

    if (response.data.results.length === 0) {
      return []; // No need to map, just return an empty array.
    }

    const stations: GasStationOutput[] = (response.data.results as Place[])
      .map(place => {
        const location = place.geometry?.location;
        if (!location) return null;

        // Calculate distance (this is a simplified haversine distance calculation)
        const toRad = (x: number) => x * Math.PI / 180;
        const R = 6371; // Earth radius in km
        const dLat = toRad(location.lat - input.latitude);
        const dLon = toRad(location.lng - input.longitude);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(toRad(input.latitude)) * Math.cos(toRad(location.lat)) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distanceInKm = R * c;

        return {
          name: place.name || 'N/A',
          address: place.vicinity || 'Dirección no disponible',
          distance: `${distanceInKm.toFixed(1)} km`,
          mapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(place.name || '')}&destination_place_id=${place.place_id}`,
        };
      })
      .filter((s): s is GasStationOutput => s !== null);

    return stations.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));

  } catch (error: any) {
      console.error("[Gas Station Flow] An unexpected error occurred:", error.message);
      // Re-throw a generic but user-friendly error
      throw new Error("Ocurrió un error inesperado al contactar con el servicio de mapas.");
  }
}
