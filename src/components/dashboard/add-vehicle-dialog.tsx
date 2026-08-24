'use client';

import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Loader2, Camera, Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';

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
import type { Vehicle, ConfigItem } from '@/lib/types';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';

const formSchema = z.object({
  make: z.string().min(1, 'La marca es obligatoria.'),
  model: z.string().min(1, 'El modelo es obligatorio.'),
  year: z.coerce.number().min(1900, 'Año inválido.').max(new Date().getFullYear() + 1, 'Año inválido.'),
  plate: z.string().min(1, 'La patente es obligatoria.'),
  fuelCapacityLiters: z.coerce.number().min(1, 'La capacidad del tanque es obligatoria.'),
  averageConsumptionKmPerLiter: z.coerce.number().min(1, 'El consumo es obligatorio.'),
  imageUrl: z.string().optional().or(z.literal('')),
  defaultFuelType: z.string({
    required_error: 'El tipo de combustible es obligatorio.',
  }),
  // Financial fields
  purchasePrice: z.coerce.number().optional(),
  purchaseDate: z.string().optional(),
  annualInsuranceCost: z.coerce.number().optional(),
  annualPatentCost: z.coerce.number().optional(),
  usefulLifeYears: z.coerce.number().optional(),
  resaleValue: z.coerce.number().optional(),
  // New detailed cost fields
  kmPerYear: z.coerce.number().optional(),
  maintenanceCost: z.coerce.number().optional(),
  maintenanceKm: z.coerce.number().optional(),
  tiresCost: z.coerce.number().optional(),
  tiresKm: z.coerce.number().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AddVehicleDialogProps {
  vehicle?: Vehicle;
  children?: React.ReactNode;
}

export default function AddVehicleDialog({ vehicle, children }: AddVehicleDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>(vehicle?.imageUrl || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const isEditing = !!vehicle;

  const fuelTypesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'fuel_types'), orderBy('name'));
  }, [firestore, user]);

  const { data: fuelTypes, isLoading: isLoadingFuelTypes } = useCollection<ConfigItem>(fuelTypesQuery);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      make: vehicle?.make || '',
      model: vehicle?.model || '',
      year: vehicle?.year,
      plate: vehicle?.plate || '',
      fuelCapacityLiters: vehicle?.fuelCapacityLiters,
      averageConsumptionKmPerLiter: vehicle?.averageConsumptionKmPerLiter,
      imageUrl: vehicle?.imageUrl || '',
      defaultFuelType: vehicle?.defaultFuelType,
      purchasePrice: vehicle?.purchasePrice,
      purchaseDate: vehicle?.purchaseDate ? new Date(vehicle.purchaseDate).toISOString().split('T')[0] : '',
      annualInsuranceCost: vehicle?.annualInsuranceCost,
      annualPatentCost: vehicle?.annualPatentCost,
      usefulLifeYears: vehicle?.usefulLifeYears,
      resaleValue: vehicle?.resaleValue,
      kmPerYear: vehicle?.kmPerYear,
      maintenanceCost: vehicle?.maintenanceCost,
      maintenanceKm: vehicle?.maintenanceKm,
      tiresCost: vehicle?.tiresCost,
      tiresKm: vehicle?.tiresKm,
    },
  });

  useEffect(() => {
    if (open) {
      setImagePreview(vehicle?.imageUrl || '');
    }
  }, [open, vehicle]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Formato no soportado',
        description: 'Por favor, selecciona un archivo de imagen (JPG, PNG, WebP).',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setImagePreview(compressedDataUrl);
        form.setValue('imageUrl', compressedDataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImagePreview('');
    form.setValue('imageUrl', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  async function onSubmit(values: FormValues) {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Error de autenticación',
        description: 'Debes iniciar sesión para gestionar vehículos.',
      });
      return;
    }
    setIsSubmitting(true);

    const vehicleId = isEditing ? vehicle.id : doc(collection(firestore, '_')).id;
    const vehicleRef = doc(firestore, 'vehicles', vehicleId);

    const vehicleData: Partial<Vehicle> = {
      ...values,
      id: vehicleId,
      ownerId: vehicle?.ownerId || user.uid,
      ownerEmail: vehicle?.ownerEmail || user.email || '',
      sharedWith: vehicle?.sharedWith || [],
      purchaseDate: values.purchaseDate ? new Date(values.purchaseDate).toISOString() : null,
      imageUrl: values.imageUrl || imagePreview || `https://picsum.photos/seed/${vehicleId}/600/400`,
      imageHint: `${values.make.toLowerCase()} ${values.model.toLowerCase()}`,
    };

    setDocumentNonBlocking(vehicleRef, vehicleData, { merge: true });

    toast({
      title: isEditing ? 'Vehículo Actualizado' : 'Vehículo Añadido',
      description: `Tu ${values.make} ${values.model} ha sido ${isEditing ? 'actualizado' : 'añadido'}.`,
    });

    setIsSubmitting(false);
    setOpen(false);
    if (!isEditing) {
      form.reset({
        make: '',
        model: '',
        year: undefined,
        plate: '',
        fuelCapacityLiters: undefined,
        averageConsumptionKmPerLiter: undefined,
        imageUrl: '',
        defaultFuelType: undefined,
        purchasePrice: undefined,
        purchaseDate: '',
        annualInsuranceCost: undefined,
        annualPatentCost: undefined,
        usefulLifeYears: undefined,
        resaleValue: undefined,
        kmPerYear: undefined,
        maintenanceCost: undefined,
        maintenanceKm: undefined,
        tiresCost: undefined,
        tiresKm: undefined,
      });
      setImagePreview('');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ? children : (
          <Button>
            <Plus className="-ml-1 mr-2 h-4 w-4" />
            Añadir Vehículo
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-headline">{isEditing ? 'Gestionar' : 'Añadir'} Vehículo</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Edita los detalles de tu vehículo.' : 'Añade un nuevo vehículo a tu garaje.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
            {/* Foto del Vehículo */}
            <div className="space-y-2">
              <FormLabel className="text-sm font-medium">Foto del Vehículo</FormLabel>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />

              {imagePreview ? (
                <div className="relative w-full h-40 rounded-xl overflow-hidden border border-border group bg-muted">
                  <Image
                    src={imagePreview}
                    alt="Foto del vehículo"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Camera className="mr-1.5 h-4 w-4" />
                      Cambiar foto
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={handleRemoveImage}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-32 rounded-xl border-2 border-dashed border-muted-foreground/30 hover:border-primary/60 hover:bg-primary/5 cursor-pointer flex flex-col items-center justify-center gap-2 transition-all"
                >
                  <div className="p-3 bg-muted rounded-full">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-semibold text-foreground">Seleccionar o tomar foto</p>
                    <p className="text-[11px] text-muted-foreground">JPG, PNG o WebP desde tu dispositivo</p>
                  </div>
                </div>
              )}
            </div>

            <Separator className="my-3" />

            <p className="text-sm font-medium">Información Básica</p>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="make" render={({ field }) => (
                <FormItem>
                  <FormLabel>Marca</FormLabel>
                  <FormControl>
                    <Input placeholder="ej: Toyota" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="model" render={({ field }) => (
                <FormItem>
                  <FormLabel>Modelo</FormLabel>
                  <FormControl>
                    <Input placeholder="ej: Corolla" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="year" render={({ field }) => (
                <FormItem>
                  <FormLabel>Año</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="ej: 2023" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="plate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Patente</FormLabel>
                  <FormControl>
                    <Input placeholder="ej: AB-123-CD" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="fuelCapacityLiters" render={({ field }) => (
                <FormItem>
                  <FormLabel>Capacidad Tanque (L)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="ej: 50" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="averageConsumptionKmPerLiter" render={({ field }) => (
                <FormItem>
                  <FormLabel>Consumo (km/L)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" placeholder="ej: 14.5" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField
              control={form.control}
              name="defaultFuelType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Combustible por Defecto</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger disabled={isLoadingFuelTypes}>
                        <SelectValue placeholder={isLoadingFuelTypes ? "Cargando..." : "Selecciona un tipo"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {fuelTypes?.map(fuelType => (
                        <SelectItem key={fuelType.id} value={fuelType.name}>{fuelType.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Separator className="my-6"/>
            
            <p className="text-sm font-medium">Datos para Cálculo de Costo Real (Opcional)</p>
            <FormDescription>
              Estos datos se usan para calcular la amortización y el costo real por km.
            </FormDescription>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="purchasePrice" render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio de Compra (USD)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="ej: 25000" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField
                control={form.control}
                name="purchaseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Compra</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="usefulLifeYears" render={({ field }) => (
                <FormItem>
                  <FormLabel>Años de Amortización</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="ej: 10" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="resaleValue" render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor de Reventa (USD)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="ej: 5000" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="annualInsuranceCost" render={({ field }) => (
                <FormItem>
                  <FormLabel>Costo Anual Seguro (USD)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="ej: 1200" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="annualPatentCost" render={({ field }) => (
                <FormItem>
                  <FormLabel>Costo Anual Patente (USD)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="ej: 800" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="kmPerYear" render={({ field }) => (
                <FormItem>
                  <FormLabel>Km / Año (Estimado)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="ej: 15000" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <Separator className="my-4"/>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="maintenanceCost" render={({ field }) => (
                <FormItem>
                  <FormLabel>Costo Mantenimiento (USD)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="ej: 300" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormDescription className="text-xs">Costo de un servicio mayor.</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="maintenanceKm" render={({ field }) => (
                <FormItem>
                  <FormLabel>Km entre Mantenimientos</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="ej: 10000" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="tiresCost" render={({ field }) => (
                <FormItem>
                  <FormLabel>Costo Neumáticos (USD)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="ej: 800" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormDescription className="text-xs">Juego completo.</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="tiresKm" render={({ field }) => (
                <FormItem>
                  <FormLabel>Km Vida Útil Neumáticos</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="ej: 50000" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
           
            <DialogFooter className="pt-4 mt-6 border-t">
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Guardar Cambios' : 'Añadir Vehículo'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
