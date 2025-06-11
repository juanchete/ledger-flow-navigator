import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createObra } from "@/integrations/supabase/obraService";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Obra } from "@/types";

const CreateObra: React.FC = () => {
  const navigate = useNavigate();
  const [obra, setObra] = useState<Partial<Obra>>({
    name: "",
    description: "",
    location: "",
    status: "planning",
    budget: 0,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createObra(obra);
      navigate("/obras");
    } catch (error) {
      console.error("Error creating obra:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (value: "planning" | "in-progress" | "completed" | "on-hold") => {
    setObra({ ...obra, status: value });
  };

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Crear Nueva Obra</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={obra.name}
                onChange={(e) => setObra({ ...obra, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={obra.description}
                onChange={(e) => setObra({ ...obra, description: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="location">Ubicación</Label>
              <Input
                id="location"
                value={obra.location}
                onChange={(e) => setObra({ ...obra, location: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="budget">Presupuesto</Label>
              <Input
                id="budget"
                type="number"
                value={obra.budget}
                onChange={(e) => setObra({ ...obra, budget: parseFloat(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="status">Estado</Label>
              <Select onValueChange={handleStatusChange} defaultValue={obra.status}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planificación</SelectItem>
                  <SelectItem value="in-progress">En Progreso</SelectItem>
                  <SelectItem value="completed">Completada</SelectItem>
                  <SelectItem value="on-hold">En Espera</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Creando..." : "Crear Obra"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateObra; 