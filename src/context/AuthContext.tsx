import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { userService } from '@/integrations/supabase/userService';
import type { Session } from '@supabase/supabase-js';
import type { UserProfile } from '@/integrations/supabase/types';

interface AuthContextProps {
  session: Session | null;
  user: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

// Crear el contexto con valores por defecto
const AuthContext = createContext<AuthContextProps>({
  session: null,
  user: null,
  loading: true,
  isAdmin: false,
  refreshProfile: async () => {},
  logout: async () => {},
});

// Hook personalizado para acceder al contexto
export const useAuth = () => useContext(AuthContext);

// Proveedor del contexto
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Detectar cambios en la sesión
  useEffect(() => {
    setLoading(true);

    // Obtener la sesión actual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        loadUserProfile();
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    // Escuchar cambios en el estado de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        loadUserProfile();
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Cargar el perfil del usuario desde la tabla personalizada
  const loadUserProfile = async () => {
    if (!session?.user?.id) return;

    try {
      const profile = await userService.getCurrentUserProfile();
      setUser(profile);
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  // Refrescar el perfil del usuario (útil después de actualizaciones)
  const refreshProfile = async () => {
    setLoading(true);
    await loadUserProfile();
  };

  // Cerrar sesión
  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  // Determinar si el usuario es administrador
  const isAdmin = user?.role === 'admin';

  const value = {
    session,
    user,
    loading,
    isAdmin,
    refreshProfile,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 