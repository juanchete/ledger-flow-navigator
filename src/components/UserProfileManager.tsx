import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from '@/context/AuthContext';
import { userService } from '@/integrations/supabase/userService';
import type { UserProfile } from '@/types/auth';
import { toast } from 'sonner';

export function UserProfileManager() {
  const { user, userProfile, isAdmin, refreshProfile } = useAuth();
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Solo los administradores pueden cargar todos los usuarios
  useEffect(() => {
    if (isAdmin) {
      loadAllUsers();
    }
  }, [isAdmin]);

  const loadAllUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setAllUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudieron cargar los usuarios',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserRole = async (userId: string, role: string) => {
    try {
      await userService.updateUserRole(userId, role);
      
      // Actualizar la lista de usuarios
      if (userId === user?.id) {
        // Si es el usuario actual, actualizar el contexto
        await refreshProfile();
      }
      
      // Refrescar la lista de usuarios
      await loadAllUsers();
      
      toast({
        title: 'Rol actualizado',
        description: 'El rol del usuario ha sido actualizado correctamente',
      });
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo actualizar el rol del usuario',
      });
    }
  };

  if (!user || !userProfile) {
    return <div>No hay usuario autenticado</div>;
  }

  return (
    <div className="space-y-6">
      {/* Panel de información del usuario actual */}
      <Card>
        <CardHeader>
          <CardTitle>Tu perfil</CardTitle>
          <CardDescription>
            Información sobre tu cuenta de usuario
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Avatar>
              <AvatarImage src={userProfile.avatar_url || ''} />
              <AvatarFallback>
                {userProfile.full_name?.[0]?.toUpperCase() || userProfile.email[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">
                {userProfile.full_name || user.email}
                <Badge className="ml-2">{userProfile.role}</Badge>
              </div>
              <div className="text-sm text-muted-foreground">{userProfile.email}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Panel de administración de usuarios (solo para admin) */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Administración de usuarios</CardTitle>
            <CardDescription>
              Gestiona los roles de usuario del sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div>Cargando usuarios...</div>
            ) : (
              <div className="space-y-4">
                {allUsers.map((userItem) => (
                  <div key={userItem.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <div className="font-medium">
                        {userItem.full_name || userItem.email}
                        <Badge className="ml-2">{userItem.role}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">{userItem.email}</div>
                    </div>
                    <div className="space-x-2">
                      {userItem.role !== 'admin' && (
                        <Button
                          onClick={() => updateUserRole(userItem.id, 'admin')}
                          variant="outline"
                          size="sm"
                        >
                          Hacer Admin
                        </Button>
                      )}
                      {userItem.role !== 'user' && (
                        <Button
                          onClick={() => updateUserRole(userItem.id, 'user')}
                          variant="outline"
                          size="sm"
                        >
                          Hacer Usuario
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
