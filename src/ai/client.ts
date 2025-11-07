'use client';

import {createClient} from '@genkit-ai/next/client';
import {estimateFuelStop} from '@/ai/flows/estimate-fuel-stop';
import {findNearbyGasStations} from '@/ai/flows/find-nearby-gas-stations';

export const ai = createClient({
  estimateFuelStop: estimateFuelStop,
  findNearbyGasStations: findNearbyGasStations,
});
