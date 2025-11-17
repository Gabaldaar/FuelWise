'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Wand2, Calculator, Fuel, TrendingUp, Wallet, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { parseCurrency, formatCurrency } from '@/lib/utils';
import type { Vehicle, ProcessedFuelLog } from '@/lib/types';
import { getDolarBlueRate } from '@/ai/flows/get-exchange-rate';
import { calculateCostsPerKm, calculateTotalCostInARS } from '@/lib/cost-calculator';
import { Separator } from '../ui/separator';
import { useVehicles } from '@/context/vehicle-context';

const formSchema = z.object({
  kilometers: z.coerce.number().min(1, 'Los kilómetros son obligatorios.'),
  otherExpenses: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface TripCalculatorDialogProps {
    children: React.ReactNode;
    allFuelLogs: ProcessedFuelLog[];
}

interface CalculationResult {
    fuelCostForTrip: number;
    totalRealCostOfTrip: number | null;
}

export default function TripCalculatorDialog({ children, allFuelLogs }: TripCalculatorDialogProps) {
  const [open, setOpen] = useState(false);
  const [isFetchingRate, setIsFetchingRate] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [calculationResult, setCalculationResult] = useState<CalculationResult | null>(null);
  const { toast } = useToast();
  const { selectedVehicle: vehicle } = useVehicles();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      kilometers: undefined,
      otherExpenses: '',
    },
  });

  const lastFuelLog = useMemo(() => {
    if (!allFuelLogs || allFuelLogs.length === 0) return null;
    return [...allFuelLogs].sort((a,b) => b.odometer - a.odometer)[0];
  }, [allFuelLogs]);

  const handleFetchRate = async () => {
    setIsFetchingRate(true);
    try {
        const rate = await getDolarBlueRate();
        setExchangeRate(rate.average);
        toast({
            title: 'Cotización Obtenida',
            description: `1 USD = ${formatCurrency(rate.average)} ARS`,
        });
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Error al obtener cotización',
            description: error.message,
        });
    } finally {
        setIsFetchingRate(false);
    }
  };

  function onSubmit(values: FormValues) {
    if (!vehicle) {
        toast({ variant: 'destructive', title: 'Error', description: 'No hay un vehículo seleccionado.'});
        return;
    }

    const fallbackConsumption = vehicle.averageConsumptionKmPerLiter > 0 ? vehicle.averageConsumptionKmPerLiter : 1;
    const lastPricePerLiter = lastFuelLog?.pricePerLiter || 0;

    const costsPerKm = calculateCostsPerKm(vehicle, fallbackConsumption, lastPricePerLiter);
    const totalVehicleCostPerKm_ARS = exchangeRate ? calculateTotalCostInARS(costsPerKm, exchangeRate) : null;
    
    const otherExpensesNum = parseCurrency(values.otherExpenses || '0');

    const fuelCostForTrip = values.kilometers * costsPerKm.fuelCostPerKm;
    const totalVehicleCostForTrip = totalVehicleCostPerKm_ARS ? values.kilometers * totalVehicleCostPerKm_ARS : null;

    const finalFuelCost = fuelCostForTrip + otherExpensesNum;
    const finalTotalCost = totalVehicleCostForTrip ? totalVehicleCostForTrip + otherExpensesNum : null;

    setCalculationResult({
        fuelCostForTrip: finalFuelCost,
        totalRealCostOfTrip: finalTotalCost,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) {
        form.reset();
        setCalculationResult(null);
        setExchangeRate(null);
      }
    }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center gap-2"><Calculator /> Calculadora de Viajes</DialogTitle>
          <DialogDescription>
            Estima el costo de un viaje ingresando la distancia y otros gastos.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <div className="space-y-4">
                <FormField
                    control={form.control}
                    name="kilometers"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Distancia a Recorrer (Km)</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="Ej: 350" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="otherExpenses"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Otros Gastos (ARS - Opcional)</FormLabel>
                        <FormControl>
                            <Input type="text" placeholder="Ej: Peajes, estacionamiento" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />

                <div className="space-y-2">
                    <FormLabel>Tipo de Cambio (Opcional)</FormLabel>
                    <div className="flex items-center gap-2">
                        <Input 
                            type="text" 
                            placeholder="... o ingresa un valor"
                            value={exchangeRate !== null ? exchangeRate.toLocaleString('es-AR') : ''}
                            onChange={(e) => setExchangeRate(parseCurrency(e.target.value))}
                            className="h-9"
                        />
                        <Button type="button" onClick={handleFetchRate} disabled={isFetchingRate} variant="outline" size="icon">
                            {isFetchingRate ? <Loader2 className="h-4 w-4 animate-spin"/> : <Wand2 className="h-4 w-4" />}
                            <span className="sr-only">Obtener tipo de cambio</span>
                        </Button>
                    </div>
                    <FormDescription className="text-xs">Para calcular el costo total real del vehículo.</FormDescription>
                </div>
            </div>

            <DialogFooter className="pt-4 border-t !mt-6 !flex-row !justify-between">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cerrar</Button>
                <Button type="submit">
                    <Calculator className="mr-2 h-4 w-4" /> Calcular
                </Button>
            </DialogFooter>
          </form>
        </Form>

        {calculationResult && (
            <div className="space-y-4 pt-4 border-t">
                <h3 className="font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Resultado de la Estimación</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg border">
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Fuel className="h-3 w-3"/> Combustible + Gastos</p>
                        <p className="font-semibold text-lg">{formatCurrency(calculationResult.fuelCostForTrip)}</p>
                    </div>
                    {calculationResult.totalRealCostOfTrip !== null ? (
                        <div className="p-3 rounded-lg border border-primary/50 bg-primary/10">
                            <p className="text-xs text-primary/80 flex items-center gap-1.5"><TrendingUp className="h-3 w-3" /> Costo Total Real</p>
                            <p className="font-semibold text-lg text-primary">{formatCurrency(calculationResult.totalRealCostOfTrip)}</p>
                        </div>
                    ) : (
                         <div className="p-3 rounded-lg border border-dashed text-center">
                            <p className="text-xs text-muted-foreground">Ingresa el tipo de cambio para ver el costo total real.</p>
                        </div>
                    )}
                </div>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
