import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4 text-finance-blue">404</h1>
        <p className="text-2xl text-gray-600 mb-4">¡Ups! Página no encontrada</p>
        <p className="text-gray-500 mb-8">
          La página que buscas pudo haber sido eliminada o no existe.
        </p>
        <Button asChild>
          <Link to="/">Volver al Panel</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
