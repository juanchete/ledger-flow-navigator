
import { useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Si está cargando, mostrar un indicador de carga
  if (loading) {
    return <div className="w-full h-screen flex items-center justify-center">Cargando...</div>;
  }

  // Si no hay usuario autenticado, redirigir al login
  if (!user) {
    return <Navigate to="/auth" />;
  }

  // Si se requiere rol de admin y el usuario no es admin, redirigir al dashboard
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
}
