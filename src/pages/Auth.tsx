import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { userService } from '@/integrations/supabase/userService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Error al iniciar sesión",
          description: "Credenciales inválidas. Por favor, inténtalo de nuevo.",
        });
        return;
      }

      if (data.user) {
        // Primero verificar si el usuario ya existe en la tabla 'users'
        const { data: existingUser } = await supabase
          .from("users")
          .select("*")
          .eq("id", data.user.id)
          .single();
        
        if (!existingUser) {
          // Si no existe, crear un nuevo perfil con rol predeterminado
          await userService.upsertUserProfile(data.user.id, {
            email: data.user.email || '',
            role: 'user' // Rol predeterminado solo para usuarios nuevos
          });
        } else {
          // Si ya existe, solo actualizar datos básicos sin cambiar el rol
          await supabase
            .from("users")
            .update({
              email: data.user.email || existingUser.email,
              updated_at: new Date().toISOString()
            })
            .eq("id", data.user.id);
        }
        
        navigate('/');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Ocurrió un error al iniciar sesión.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 p-8 border rounded-lg shadow-lg bg-card">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Iniciar Sesión</h2>
          <p className="mt-2 text-muted-foreground">Ingresa tus credenciales para continuar</p>
        </div>
        
        <form onSubmit={handleLogin} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
                className="w-full"
              />
            </div>
            <div>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                required
                className="w-full"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </Button>
        </form>
      </div>
    </div>
  );
}
