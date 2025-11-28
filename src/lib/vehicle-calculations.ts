import type { ProcessedFuelLog } from './types';

/**
 * Processes an array of fuel logs to accurately calculate consumption (km/L)
 * only between two consecutive full fill-ups.
 *
 * @param logs - An array of fuel log objects.
 * @returns A new array of processed fuel logs with consumption calculated correctly,
 *          sorted by date in descending order for display.
 */
export function processFuelLogs(logs: ProcessedFuelLog[]): ProcessedFuelLog[] {
  if (!logs || logs.length < 2) {
    return (logs || []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  // 1. Create a mutable copy and sort by odometer ascending for calculation.
  const sortedLogs = [...logs].sort((a, b) => a.odometer - b.odometer);
  
  // 2. Clear any previous (incorrect) consumption data.
  const processedLogs = sortedLogs.map(log => ({
    ...log,
    distanceTraveled: undefined,
    consumption: undefined,
  }));

  // 3. Find indices of all full fill-ups.
  const fullFillUpIndices: number[] = [];
  processedLogs.forEach((log, index) => {
    if (log.isFillUp) {
      fullFillUpIndices.push(index);
    }
  });

  // 4. Iterate through consecutive full fill-ups to calculate consumption.
  for (let i = 0; i < fullFillUpIndices.length - 1; i++) {
    const startLogIndex = fullFillUpIndices[i];
    const endLogIndex = fullFillUpIndices[i + 1];

    const startLog = processedLogs[startLogIndex];
    const endLog = processedLogs[endLogIndex];

    // Check if the log right after the start was marked as "missed", if so, skip this segment
    if (startLogIndex + 1 < processedLogs.length && processedLogs[startLogIndex + 1].missedPreviousFillUp) {
        continue;
    }
    
    // Check if the end log itself is marked as "missed", if so, this calculation is invalid
    if(endLog.missedPreviousFillUp) {
        continue;
    }

    const distance = endLog.odometer - startLog.odometer;

    // Sum liters from all logs *after* the starting full fill-up up to and including the ending full fill-up.
    let litersConsumed = 0;
    for (let j = startLogIndex + 1; j <= endLogIndex; j++) {
      litersConsumed += processedLogs[j].liters;
    }

    if (distance > 0 && litersConsumed > 0) {
      const consumption = distance / litersConsumed;
      // Assign the calculated consumption to the *end* log of the segment.
      processedLogs[endLogIndex].consumption = parseFloat(consumption.toFixed(2));
      processedLogs[endLogIndex].distanceTraveled = distance;
    }
  }

  // Also calculate simple distance traveled for logs not part of a consumption calculation
   for (let i = 1; i < processedLogs.length; i++) {
      if(processedLogs[i].distanceTraveled === undefined) {
         const distance = processedLogs[i].odometer - processedLogs[i-1].odometer;
         if (distance > 0) {
           processedLogs[i].distanceTraveled = distance;
         }
      }
   }

  // 5. Return the logs sorted by date descending for display purposes.
  return processedLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
