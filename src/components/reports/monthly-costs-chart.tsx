'use client';

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useMemo } from 'react';
import { DollarSign } from 'lucide-react';

interface ChartData {
    name: string;
    combustible: number;
    servicios: number;
    total: number;
}

interface MonthlyCostsChartProps {
  data: ChartData[] | null;
}

export function MonthlyCostsChart({ data }: MonthlyCostsChartProps) {
  
  const chartData = useMemo(() => {
    return data?.map(item => ({
      ...item,
      combustible: parseFloat(item.combustible.toFixed(2)),
      servicios: parseFloat(item.servicios.toFixed(2)),
    }));
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm">
          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
            <div className="flex items-center">
              <div className="text-sm font-semibold">{label}</div>
            </div>
            <div/>
            <div className="flex items-center">
              <div className="h-2 w-2 shrink-0 rounded-full mr-1" style={{ backgroundColor: 'hsl(var(--chart-1))' }} />
              <div className="text-xs text-muted-foreground">Combustible</div>
            </div>
            <div className="text-right text-xs">${payload[0].value.toFixed(2)}</div>
            <div className="flex items-center">
              <div className="h-2 w-2 shrink-0 rounded-full mr-1" style={{ backgroundColor: 'hsl(var(--chart-2))' }} />
              <div className="text-xs text-muted-foreground">Servicios</div>
            </div>
             <div className="text-right text-xs">${payload[1].value.toFixed(2)}</div>
             <div className="font-semibold text-sm">Total</div>
             <div className="font-semibold text-right text-sm">${(payload[0].value + payload[1].value).toFixed(2)}</div>
          </div>
        </div>
      );
    }
    return null;
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-muted-foreground" />
            Gastos Mensuales
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
        {chartData && chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }} 
                tickLine={false} 
                axisLine={false}
              />
              <YAxis 
                tick={{ fontSize: 12 }} 
                tickLine={false} 
                axisLine={false}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip
                cursor={{ fill: 'hsl(var(--muted))' }}
                content={<CustomTooltip />}
              />
              <Legend wrapperStyle={{fontSize: "0.8rem"}} />
              <Bar dataKey="combustible" name="Combustible" stackId="a" fill="hsl(var(--chart-1))" radius={[0, 0, 0, 0]} />
              <Bar dataKey="servicios" name="Servicios" stackId="a" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No hay datos para mostrar el gráfico.
          </div>
        )}
        </div>
      </CardContent>
    </Card>
  );
}