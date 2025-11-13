
import type { Handler } from '@netlify/functions';
import fetch from 'node-fetch';

// This function is scheduled to run daily by Netlify.
// Its sole purpose is to trigger our Next.js API route that handles the actual logic.
export const handler: Handler = async () => {
  // Get the site's URL from environment variables provided by Netlify.
  const siteUrl = process.env.URL;
  if (!siteUrl) {
    return {
      statusCode: 500,
      body: 'Error: Site URL is not configured in environment variables.',
    };
  }

  try {
    // Make a GET request to our API endpoint.
    // This is a "fire-and-forget" call. We don't need to wait for a complex response.
    const response = await fetch(`${siteUrl}/api/cron/check-reminders`);
    const data = await response.text();

    if (!response.ok) {
      // If the API route itself has an error, log it.
      throw new Error(`API route failed with status ${response.status}: ${data}`);
    }

    console.log('Successfully triggered the reminder check API. Response:', data);

    return {
      statusCode: 200,
      body: `Reminder check triggered successfully. API response: ${data}`,
    };
  } catch (error: any) {
    console.error('Error triggering the reminder check API:', error);
    return {
      statusCode: 500,
      body: `Failed to trigger reminder check: ${error.message}`,
    };
  }
};
