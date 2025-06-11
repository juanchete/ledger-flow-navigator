import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getAllObras } from "@/integrations/supabase/obraService";
import { Obra } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const AllObras: React.FC = () => {
  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchObras = async () => {
      try {
        const data = await getAllObras();
        setObras(data);
      } catch (error) {
        console.error("Error fetching obras:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchObras();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Progress value={50} />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">Obras</h1>
        <Button asChild>
          <Link to="/obras/new">Crear Obra</Link>
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {obras.map((obra) => (
          <Card key={obra.id}>
            <CardHeader>
              <CardTitle>{obra.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{obra.description}</p>
              <p>
                <strong>Estado:</strong> {obra.status}
              </p>
              <Button asChild className="mt-4">
                <Link to={`/obras/${obra.id}`}>Ver Detalles</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AllObras; 