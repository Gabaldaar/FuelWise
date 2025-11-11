
'use client';

import { usePreferences } from '@/context/preferences-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import type { ConsumptionUnit } from '@/lib/types';
import { Separator } from '../ui/separator';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { BellRing } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
import { showNotification } from '../notifications/notification-manager';

export default function PreferencesSettings() {
  const { 
    consumptionUnit, 
    setConsumptionUnit,
    urgencyThresholdDays,
    setUrgencyThresholdDays,
    urgencyThresholdKm,
    setUrgencyThresholdKm,
  } = usePreferences();
  const { toast } = useToast();
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [urgentRemindersCount, setUrgentRemindersCount] = useState(0); // Simulación
  const [dataStatus, setDataStatus] = useState('cargando...'); // Simulación

   useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
    // En una app real, aquí te suscribirías al estado de los datos y recordatorios.
    // Simulamos una carga y luego datos listos.
    setTimeout(() => {
        setDataStatus('listos');
        setUrgentRemindersCount(2); // Simula que se encontraron 2 recordatorios urgentes
    }, 2000);
  }, []);


  const handleResetNotifications = () => {
    try {
        localStorage.removeItem('notifiedReminders');
        toast({
            title: 'Notificaciones Reiniciadas',
            description: 'El sistema volverá a evaluar todos los recordatorios en la próxima carga.',
        });
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'No se pudo reiniciar el estado de las notificaciones.',
        });
        console.error("Error resetting notification state:", error);
    }
  }

  const handleForceTestNotification = () => {
    // Esta función ahora es simple y llama a la lógica centralizada
    showNotification('Notificación de Prueba', {
      body: 'Si ves esto, el sistema de notificaciones está funcionando correctamente.',
      icon: '/icon-192x192.png'
    }).catch(err => {
      // Si la función centralizada falla, muestra un error claro.
      alert(`Error al intentar mostrar la notificación: ${err.message}`);
    });
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Preferencias de Visualización</CardTitle>
        <CardDescription>
          Elige cómo quieres ver los datos y recibir alertas en la aplicación.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
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
          
          <Separator />

          <div>
            <Label className="text-base">Umbrales de Alerta de Servicio</Label>
            <p className="text-sm text-muted-foreground mb-4">
              Configura cuándo un servicio se considera "urgente".
            </p>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="threshold-km">Kilómetros antes</Label>
                    <Input 
                        id="threshold-km"
                        type="number"
                        value={urgencyThresholdKm}
                        onChange={(e) => setUrgencyThresholdKm(Number(e.target.value))}
                        placeholder="Ej: 1000"
                    />
                     <p className="text-xs text-muted-foreground mt-1">
                        Avisar cuando falten menos de estos km.
                    </p>
                </div>
                 <div>
                    <Label htmlFor="threshold-days">Días antes</Label>
                    <Input 
                        id="threshold-days"
                        type="number"
                        value={urgencyThresholdDays}
                        onChange={(e) => setUrgencyThresholdDays(Number(e.target.value))}
                        placeholder="Ej: 15"
                    />
                     <p className="text-xs text-muted-foreground mt-1">
                        Avisar cuando falten menos de estos días.
                    </p>
                </div>
            </div>
          </div>
          
          <Separator />

           <div>
            <Label className="text-base">Gestión de Notificaciones</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Usa estas herramientas para reiniciar el estado de las notificaciones o probar si funcionan.
            </p>
            <div className="space-y-4 rounded-lg border bg-muted/50 p-4">
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={handleResetNotifications}>
                      <BellRing className="mr-2 h-4 w-4" />
                      Reiniciar notificaciones enviadas
                  </Button>
                   <Button variant="default" onClick={handleForceTestNotification}>
                        Forzar Notificación de Prueba
                    </Button>
                </div>
                 <p className="text-xs text-muted-foreground">
                    Si has descartado notificaciones, el reinicio permitirá que se vuelvan a enviar para servicios pendientes.
                </p>
                 <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                    <p className="font-medium">Diagnóstico:</p>
                    <p>Estado de los datos: <span className="font-semibold">{dataStatus}</span></p>
                    <p>Permiso del Navegador: <span className="font-semibold">{notificationPermission}</span></p>
                    <p>Recordatorios Urgentes/Vencidos Encontrados: <span className="font-semibold">{urgentRemindersCount}</span></p>
                </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
