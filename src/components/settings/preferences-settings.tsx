'use client';

import { usePreferences } from '@/context/preferences-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import type { ConsumptionUnit } from '@/lib/types';

export default function PreferencesSettings() {
  const { consumptionUnit, setConsumptionUnit } = usePreferences();

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Preferencias de Visualización</CardTitle>
        <CardDescription>
          Elige cómo quieres ver los datos en la aplicación.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label className="text-base">Unidad de Consumo</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Selecciona el formato para mostrar el consumo de combustible.
            </p>
            <RadioGroup
              value={consumptionUnit}
              onValueChange={(value: ConsumptionUnit) => setConsumptionUnit(value)}
              className="grid grid-cols-2 gap-4"
            >
              <Label
                htmlFor="km/L"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary"
              >
                <RadioGroupItem value="km/L" id="km/L" className="sr-only" />
                <span className="text-xl font-semibold">Km/L</span>
                <span className="text-xs text-muted-foreground">Kilómetros por Litro</span>
              </Label>
              <Label
                htmlFor="L/100km"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary"
              >
                <RadioGroupItem value="L/100km" id="L/100km" className="sr-only" />
                 <span className="text-xl font-semibold">L/100km</span>
                 <span className="text-xs text-muted-foreground">Litros cada 100 Km</span>
              </Label>
            </RadioGroup>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
