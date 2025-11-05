'use client';

import {genkit} from '@genkit-ai/next/client';
import {estimateFuelStop} from '@/ai/flows/estimate-fuel-stop';

export const ai = genkit({
  flows: [estimateFuelStop],
});
