import {createApp, GenkitError} from '@genkit-ai/next';
import {notFound} from 'next/navigation';

import '@/ai/flows/estimate-fuel-stop';
import {ai} from '@/ai/genkit';

export const {GET, POST} = createApp({
  ai,
  pathname: '/api/genkit',
  errorHandler: async err => {
    if (err instanceof GenkitError && err.httpErrorCode === 404) {
      notFound();
    }
  },
});
