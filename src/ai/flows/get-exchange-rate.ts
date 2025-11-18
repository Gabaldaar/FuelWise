'use server';
/**
 * @fileoverview Flow to get the current official Dolar exchange rate from a public API.
 */
import { z } from 'zod';

const ExchangeRateOutputSchema = z.object({
  rate: z.number().describe('The selling price of the official Dolar.'),
});


export type ExchangeRateOutput = z.infer<typeof ExchangeRateOutputSchema>;

// This is the function we will call directly from our React component.
export async function getOfficialDolarRate(): Promise<ExchangeRateOutput> {
  console.log('[DIAGNÓSTICO] Iniciando getOfficialDolarRate...');
  try {
    console.log('[DIAGNÓSTICO] Realizando fetch a dolarsi.com...');
    const response = await fetch('https://www.dolarsi.com/api/api.php?type=valoresprincipales', { 
        cache: 'no-store',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    });
    
    console.log('[DIAGNÓSTICO] Status de la respuesta de la API:', response.status);

    if (!response.ok) {
      const responseText = await response.text();
      console.error(`[DIAGNÓSTICO] La respuesta de la red no fue OK. Status: ${response.status}. Texto:`, responseText);
      throw new Error(`Fallo al obtener la cotización. Status: ${response.status}`);
    }
    
    const responseText = await response.json();
    console.log('[DIAGNÓSTICO] Respuesta cruda de la API (JSON):', JSON.stringify(responseText, null, 2));


    const ExchangeRateApiResponseSchema = z.array(z.object({
        casa: z.object({
            compra: z.string(),
            venta: z.string(),
            nombre: z.string(),
        })
    }));

    // Validate the API response with Zod
    const parsedApiData = ExchangeRateApiResponseSchema.parse(responseText);

    const oficial = parsedApiData.find(d => d.casa.nombre === 'Dolar Oficial');
    
    if (!oficial) {
      throw new Error('No se pudo encontrar la cotización del "Dolar Oficial" en la respuesta de la API.');
    }

    const venta = parseFloat(oficial.casa.venta.replace(',', '.'));

    if (isNaN(venta)) {
      throw new Error('El valor de venta del Dólar Oficial no es un número válido.');
    }

    return {
        rate: venta
    };

  } catch (error: any) {
    console.error('[DIAGNÓSTICO DETALLADO] Error en getOfficialDolarRate. Nombre:', error.name, 'Mensaje:', error.message, 'Stack:', error.stack);
    throw new Error('No se pudo obtener la cotización del dólar. Revisa la consola del servidor para más detalles.');
  }
}
