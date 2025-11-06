'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Route } from 'lucide-react';

interface ChartData {
    name: string;
    km: number;
}

interface MonthlyDistanceChartProps {
  data: ChartData[] | null;
}

export function MonthlyDistanceChart({ data }: MonthlyDistanceChartProps) {

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Route className="h-5 w-5 text-muted-foreground" />
            Distancia Mensual
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
        {data && data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
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
                tickFormatter={(value) => `${value} km`}
              />
              <Tooltip
                cursor={{ fill: 'hsl(var(--muted))' }}
                 formatter={(value: number) => [`${value.toLocaleString()} km`, "Distancia"]}
                labelFormatter={(label) => `Mes: ${label}`}
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  borderColor: 'hsl(var(--border))',
                  borderRadius: 'var(--radius)',
                }}
              />
              <Bar dataKey="km" name="Distancia" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
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