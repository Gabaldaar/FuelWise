'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, doc, setDoc, deleteDoc } from 'firebase/firestore';
import type { FleetCollaborator } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Users, UserPlus, Trash2, ShieldCheck, Mail, Loader2, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function FleetUsersSettings() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [emailInput, setEmailInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const collaboratorsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'fleet_collaborators'));
  }, [firestore, user]);

  const { data: allCollaborators, isLoading } = useCollection<FleetCollaborator>(collaboratorsQuery);

  // Filter collaborators invited by current user (or all if current user is primary admin)
  const myCollaborators = allCollaborators || [];

  const handleAddCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = emailInput.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      toast({
        variant: 'destructive',
        title: 'Email inválido',
        description: 'Por favor, ingresa un correo electrónico válido.',
      });
      return;
    }

    if (cleanEmail === user?.email?.toLowerCase()) {
      toast({
        variant: 'destructive',
        title: 'Acción no permitida',
        description: 'Ya eres el propietario de esta cuenta.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Document ID encoded from email
      const docId = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
      const collaboratorRef = doc(firestore, 'fleet_collaborators', docId);

      const collaboratorData: FleetCollaborator = {
        id: docId,
        email: cleanEmail,
        invitedBy: user?.email || 'Administrador',
        invitedById: user?.uid || '',
        role: 'admin',
        addedAt: new Date().toISOString(),
      };

      await setDoc(collaboratorRef, collaboratorData, { merge: true });

      toast({
        title: 'Usuario Invitado',
        description: `Se han otorgado permisos de administración a ${cleanEmail}.`,
      });
      setEmailInput('');
    } catch (error: any) {
      console.error('Error adding collaborator:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudo guardar la invitación.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveCollaborator = async (collaboratorId: string, email: string) => {
    try {
      const collaboratorRef = doc(firestore, 'fleet_collaborators', collaboratorId);
      await deleteDoc(collaboratorRef);
      toast({
        title: 'Permiso Revocado',
        description: `Se ha retirado el acceso a ${email}.`,
      });
    } catch (error: any) {
      console.error('Error removing collaborator:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo revocar el acceso.',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Current User Card */}
      <Card className="bg-muted/30 border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-full text-primary">
              <User className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Tu Cuenta Actual</CardTitle>
              <CardDescription>{user?.email || 'Usuario'}</CardDescription>
            </div>
            <Badge variant="outline" className="ml-auto bg-primary/10 text-primary border-primary/30">
              Propietario / Admin
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Invite Collaborator Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="h-5 w-5 text-primary" />
            Invitar Colaborador a Administrar la Flota
          </CardTitle>
          <CardDescription>
            Ingresa el correo de Google de la persona a la que deseas darle acceso para registrar recargas, servicios, viajes y gestionar tus vehículos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddCollaborator} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="ej: usuario.invitado@gmail.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="pl-9"
                required
              />
            </div>
            <Button type="submit" disabled={isSubmitting} className="sm:w-auto">
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              Otorgar Acceso
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Collaborators List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Colaboradores con Acceso a la Flota
          </CardTitle>
          <CardDescription>
            Usuarios autorizados para ver y registrar datos en los vehículos de tu garaje.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 flex justify-center items-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : myCollaborators.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
              <ShieldCheck className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
              <p className="font-medium text-sm">No hay colaboradores adicionales.</p>
              <p className="text-xs mt-1">Invita a otro usuario ingresando su email arriba.</p>
            </div>
          ) : (
            <div className="divide-y rounded-md border">
              {myCollaborators.map((collab) => (
                <div
                  key={collab.id}
                  className="flex items-center justify-between p-3.5 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-secondary text-secondary-foreground">
                      <Mail className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{collab.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Invitado por: {collab.invitedBy || 'Admin'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      Administrador
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 w-8"
                      onClick={() => handleRemoveCollaborator(collab.id, collab.email)}
                      title="Revocar acceso"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
