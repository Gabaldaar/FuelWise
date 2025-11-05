'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import type { ConsumptionUnit } from '@/lib/types';

interface PreferencesContextType {
  consumptionUnit: ConsumptionUnit;
  setConsumptionUnit: (unit: ConsumptionUnit) => void;
  getConsumptionValue: (kmPerLiter?: number | null) => number;
  getFormattedConsumption: (kmPerLiter?: number | null) => string;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

const isClient = typeof window !== 'undefined';

export const PreferencesProvider = ({ children }: { children: ReactNode }) => {
  const [consumptionUnit, setConsumptionUnitState] = useState<ConsumptionUnit>(() => {
    if (!isClient) return 'km/L';
    return (localStorage.getItem('consumptionUnit') as ConsumptionUnit) || 'km/L';
  });

  useEffect(() => {
    if (isClient) {
      localStorage.setItem('consumptionUnit', consumptionUnit);
    }
  }, [consumptionUnit]);

  const setConsumptionUnit = (unit: ConsumptionUnit) => {
    setConsumptionUnitState(unit);
  };

  const getConsumptionValue = useCallback((kmPerLiter?: number | null): number => {
    if (!kmPerLiter || kmPerLiter <= 0) return 0;
    if (consumptionUnit === 'L/100km') {
      const litersPer100km = (100 / kmPerLiter);
      return parseFloat(litersPer100km.toFixed(2));
    }
    return parseFloat(kmPerLiter.toFixed(2));
  }, [consumptionUnit]);

  const getFormattedConsumption = useCallback((kmPerLiter?: number | null): string => {
    const value = getConsumptionValue(kmPerLiter);
    if (value <= 0) return 'N/A';
    return `${value}`;
  }, [getConsumptionValue]);

  return (
    <PreferencesContext.Provider value={{ consumptionUnit, setConsumptionUnit, getConsumptionValue, getFormattedConsumption }}>
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
};
