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
import { ArrowLeft, Building2 } from "lucide-react";
import { Link } from "react-router-dom";

const CreateInvestmentProject: React.FC = () => {
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
      console.error("Error creating investment project:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (value: "planning" | "in-progress" | "completed" | "on-hold") => {
    setObra({ ...obra, status: value });
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild className="gap-1">
          <Link to="/obras">
            <ArrowLeft size={16} />
            Volver a Gastos
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6" />
          <h1 className="text-3xl font-bold tracking-tight">Nuevo Proyecto de Inversión</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Crear Proyecto de Inversión</CardTitle>
          <p className="text-sm text-muted-foreground">
            Los proyectos de inversión son gastos que incrementan tu patrimonio, como obras, equipos o mejoras.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nombre del Proyecto</Label>
              <Input
                id="name"
                value={obra.name}
                onChange={(e) => setObra({ ...obra, name: e.target.value })}
                placeholder="Ej: Remodelación de oficina, Compra de maquinaria..."
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={obra.description}
                onChange={(e) => setObra({ ...obra, description: e.target.value })}
                placeholder="Describe los detalles del proyecto..."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="location">Ubicación (Opcional)</Label>
              <Input
                id="location"
                value={obra.location}
                onChange={(e) => setObra({ ...obra, location: e.target.value })}
                placeholder="Dirección o lugar donde se ejecutará el proyecto"
              />
            </div>
            <div>
              <Label htmlFor="budget">Presupuesto Estimado</Label>
              <Input
                id="budget"
                type="number"
                value={obra.budget}
                onChange={(e) => setObra({ ...obra, budget: parseFloat(e.target.value) })}
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
            <div>
              <Label htmlFor="status">Estado Inicial</Label>
              <Select onValueChange={handleStatusChange} defaultValue={obra.status}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planificación</SelectItem>
                  <SelectItem value="in-progress">En Progreso</SelectItem>
                  <SelectItem value="completed">Completado</SelectItem>
                  <SelectItem value="on-hold">En Espera</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Creando..." : "Crear Proyecto"}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate("/obras")}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateInvestmentProject; 