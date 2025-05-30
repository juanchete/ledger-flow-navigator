import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { userService } from '@/integrations/supabase/userService';
import { Session, User } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import type { UserProfile } from '@/integrations/supabase/types';

// Claves para localStorage
const STORAGE_KEYS = {
  USER_PROFILE: 'app_user_profile',
  USER_SESSION: 'app_user_session',
  PROFILE_TIMESTAMP: 'app_profile_timestamp'
};

// Tiempo de caché en milisegundos (5 minutos)
const CACHE_TTL = 5 * 60 * 1000;

// Funciones para manejar el almacenamiento del perfil
const saveProfileToStorage = (profile: UserProfile) => {
  localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
  localStorage.setItem(STORAGE_KEYS.PROFILE_TIMESTAMP, Date.now().toString());
};

const getProfileFromStorage = (): { profile: UserProfile | null, isFresh: boolean } => {
  const stored = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
  const timestamp = localStorage.getItem(STORAGE_KEYS.PROFILE_TIMESTAMP);
  
  if (!stored) return { profile: null, isFresh: false };
  
  try {
    const profile = JSON.parse(stored) as UserProfile;
    
    // Verificar si los datos del caché son recientes
    const isFresh = timestamp 
      ? (Date.now() - parseInt(timestamp)) < CACHE_TTL 
      : false;
      
    return { profile, isFresh };
  } catch (e) {
    console.error('Error parsing stored profile:', e);
    return { profile: null, isFresh: false };
  }
};

const clearStoredProfile = () => {
  localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
  localStorage.removeItem(STORAGE_KEYS.PROFILE_TIMESTAMP);
};

interface AuthContextType {
  session: Session | null;
  user: User | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  userProfile: null,
  isAdmin: false,
  loading: true,
  logout: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const { profile: storedProfile } = getProfileFromStorage();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(storedProfile);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  // Referencia para rastrear si ya estamos cargando el perfil
  const isLoadingProfile = useRef(false);
  // última vez que se cargó el perfil
  const lastProfileLoad = useRef<number>(0);

  // Cargar el perfil del usuario desde la tabla personalizada con timeout
  const loadUserProfile = async (userId: string, force = false) => {
    // Si ya estamos cargando o si se cargó recientemente (menos de 10 segundos) y no es forzado, no volver a cargar
    const now = Date.now();
    if (isLoadingProfile.current || (!force && now - lastProfileLoad.current < 10000)) {
      console.log("Omitiendo carga de perfil - ya en progreso o cargado recientemente");
      return;
    }
    
    isLoadingProfile.current = true;
    
    try {
      console.log("Cargando perfil de usuario:", userId);
      
      // Verificar si tenemos un perfil en caché válido
      const { profile: cachedProfile, isFresh } = getProfileFromStorage();
      
      // Si tenemos un perfil en caché válido y es del mismo usuario, usarlo inmediatamente
      if (cachedProfile && cachedProfile.id === userId) {
        console.log("Perfil cargado desde caché:", cachedProfile, isFresh ? "(reciente)" : "(antiguo)");
        setUserProfile(cachedProfile);
        
        // Si el perfil en caché es reciente y no es una carga forzada, no consultar a la API
        if (isFresh && !force) {
          console.log("Usando perfil en caché reciente, omitiendo llamada a la API");
          lastProfileLoad.current = now;
          return;
        }
      }
      
      // Configurar un timeout para no quedarse atascado
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout al cargar el perfil')), 8000);
      });
      
      // Obtener perfil desde Supabase
      const fetchProfilePromise = supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();
        
      // Usar Promise.race para limitar el tiempo de espera
      const { data, error } = await Promise.race([
        fetchProfilePromise,
        timeoutPromise.then(() => {
          console.warn("Timeout al cargar perfil, usando datos almacenados");
          return { data: cachedProfile, error: null };
        })
      ]) as { data: UserProfile | null; error: Error | null };
      
      if (error) {
        console.error("Error obteniendo perfil:", error);
        if (cachedProfile) {
          console.log("Usando perfil almacenado debido al error");
          return;
        }
      }
      
      if (data) {
        console.log("Perfil obtenido desde Supabase:", data);
        setUserProfile(data);
        saveProfileToStorage(data);
      } else if (!cachedProfile) {
        console.log("Perfil no encontrado, creando uno nuevo");
        // Si no existe, crear un nuevo perfil
        await userService.upsertUserProfile(userId, {
          email: user?.email || '',
        });
        
        // Obtener el perfil recién creado
        const { data: newProfile } = await supabase
          .from("users")
          .select("*")
          .eq("id", userId)
          .single();
          
        if (newProfile) {
          console.log("Nuevo perfil creado:", newProfile);
          setUserProfile(newProfile);
          saveProfileToStorage(newProfile);
        }
      }
      
      // Actualizar el timestamp de la última carga
      lastProfileLoad.current = now;
      
    } catch (error) {
      console.error('Error loading user profile:', error);
      // Si hay un error pero tenemos un perfil almacenado, usamos ese
      const { profile: fallbackProfile } = getProfileFromStorage();
      if (fallbackProfile && !userProfile) {
        console.log("Usando perfil almacenado debido a error en la carga");
        setUserProfile(fallbackProfile);
      }
    } finally {
      isLoadingProfile.current = false;
    }
  };

  // Refrescar el perfil del usuario (forzar recarga desde la API)
  const refreshProfile = async () => {
    if (user?.id) {
      await loadUserProfile(user.id, true); // Forzar recarga desde la API
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    const initializeAuth = async () => {
      try {
        // Intentar restaurar sesión desde localStorage primero
        const { data: { session } } = await supabase.auth.getSession();
        
        if (isMounted) {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            await loadUserProfile(session.user.id);
          }
        }
      } catch (err) {
        console.error("Error al inicializar autenticación:", err);
      } finally {
        if (isMounted) {
          // Establecer timeout para evitar el spinner de carga infinito
          setTimeout(() => {
            setLoading(false);
          }, 1500); // Dar tiempo para cargar, pero no demasiado
        }
      }
    };

    // Inicializar autenticación
    initializeAuth();

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (isMounted) {
          console.log("Evento de autenticación:", event);
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            await loadUserProfile(session.user.id);
          } else {
            setUserProfile(null);
            clearStoredProfile();
            navigate('/auth');
          }
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  // Función de logout
  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setUserProfile(null);
    clearStoredProfile();
    navigate('/auth');
  };

  if (loading) {
    return <div className="w-full h-screen flex items-center justify-center">Cargando...</div>;
  }

  // Determinar si el usuario es administrador
  const isAdmin = userProfile?.role === 'admin';

  return (
    <AuthContext.Provider value={{ 
      session, 
      user, 
      userProfile, 
      isAdmin, 
      loading, 
      logout, 
      refreshProfile 
    }}>
      {children}
    </AuthContext.Provider>
  );
}
