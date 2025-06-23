import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { getObraById, getGastosByObraId, createGastoObra, uploadReceiptImage } from "@/integrations/supabase/obraService";
import { createReceivable } from "@/integrations/supabase/receivableService";
import { createTransaction } from "@/integrations/supabase/transactionService";
import { Obra, GastoObra } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Icons } from "@/components/Icons";
import { ArrowLeft, Building2, Receipt, Plus, ExternalLink } from "lucide-react";

const InvestmentProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [obra, setObra] = useState<Obra | null>(null);
  const [gastos, setGastos] = useState<GastoObra[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGasto, setNewGasto] = useState({ description: "", amount: 0, date: new Date().toISOString().split("T")[0], receipt: null as File | null });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchObraDetails = async () => {
      if (!id) return;
      try {
        const obraData = await getObraById(id);
        setObra(obraData);
        const gastosData = await getGastosByObraId(id);
        setGastos(gastosData);
      } catch (error) {
        console.error("Error fetching project details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchObraDetails();
  }, [id]);

  const handleCreateGasto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setIsSaving(true);

    try {
      let receiptUrl: string | undefined = undefined;
      if (newGasto.receipt) {
        receiptUrl = await uploadReceiptImage(newGasto.receipt);
      }

      const gastoData = { 
        description: newGasto.description,
        amount: newGasto.amount,
        date: new Date(newGasto.date),
        obraId: id, 
        receiptUrl: receiptUrl 
      };
      
      const gasto = await createGastoObra(gastoData);
      setGastos([...gastos, gasto]);

      await createReceivable({
        clientId: "internal-obras-client",
        amount: gastoData.amount,
        dueDate: new Date(),
        description: `Gasto de proyecto: ${obra?.name} - ${gastoData.description}`,
        obraId: id,
        status: "pending",
      });

      await createTransaction({
        type: "expense",
        amount: gastoData.amount,
        description: `Gasto de proyecto: ${obra?.name} - ${gastoData.description}`,
        date: new Date(),
        obraId: id,
        status: "completed",
      });

      setNewGasto({ description: "", amount: 0, date: new Date().toISOString().split("T")[0], receipt: null });
      if(fileInputRef.current) fileInputRef.current.value = "";
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error creating expense:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'planning':
        return <Badge variant="secondary">Planificación</Badge>;
      case 'in-progress':
        return <Badge variant="default">En Progreso</Badge>;
      case 'completed':
        return <Badge variant="outline" className="border-green-500 text-green-700">Completado</Badge>;
      case 'on-hold':
        return <Badge variant="destructive">En Espera</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const totalGastos = gastos.reduce((sum, gasto) => sum + gasto.amount, 0);

  if (loading) return (
    <div className="flex justify-center items-center h-screen">
      <Icons.spinner className="h-8 w-8 animate-spin" />
    </div>
  );
  
  if (!obra) return (
    <div className="container mx-auto p-4">
      <Card>
        <CardContent className="p-6 text-center">
          <p>Proyecto no encontrado.</p>
          <Button asChild className="mt-4">
            <Link to="/obras">Volver a Gastos</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild className="gap-1">
          <Link to="/obras">
            <ArrowLeft size={16} />
            Volver a Gastos
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6" />
          <h1 className="text-3xl font-bold tracking-tight">{obra.name}</h1>
          {getStatusBadge(obra.status)}
        </div>
      </div>

      {/* Project Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Información del Proyecto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Descripción</p>
              <p>{obra.description || "Sin descripción"}</p>
            </div>
            {obra.location && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ubicación</p>
                <p>{obra.location}</p>
              </div>
            )}
            {obra.budget && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Presupuesto</p>
                <p className="text-lg font-semibold">${obra.budget.toLocaleString()}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Gastado</p>
              <p className="text-lg font-semibold text-red-600">${totalGastos.toLocaleString()}</p>
            </div>
          </div>
          
          {obra.budget && (
            <div className="pt-4 border-t">
              <div className="flex justify-between text-sm mb-2">
                <span>Progreso del presupuesto</span>
                <span>{((totalGastos / obra.budget) * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    totalGastos > obra.budget ? 'bg-red-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min((totalGastos / obra.budget) * 100, 100)}%` }}
                ></div>
              </div>
              {totalGastos > obra.budget && (
                <p className="text-sm text-red-600 mt-1">
                  Excedido por ${(totalGastos - obra.budget).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expenses Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Receipt className="h-6 w-6" />
              Gastos del Proyecto
            </h2>
            <p className="text-sm text-muted-foreground">
              Registra los gastos asociados a este proyecto de inversión
            </p>
          </div>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Añadir Gasto
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Añadir Nuevo Gasto</DialogTitle>
                <DialogDescription>
                  Registra un gasto para este proyecto. Se creará una cuenta por cobrar asociada y se registrará como transacción.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateGasto} className="space-y-4">
                <div>
                  <Label htmlFor="description">Descripción del Gasto</Label>
                  <Textarea
                    id="description"
                    value={newGasto.description}
                    onChange={(e) => setNewGasto({ ...newGasto, description: e.target.value })}
                    placeholder="Describe el gasto realizado..."
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="amount">Monto</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={newGasto.amount}
                    onChange={(e) => setNewGasto({ ...newGasto, amount: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    required
                    disabled={isSaving}
                  />
                </div>
                <div>
                  <Label htmlFor="date">Fecha del Gasto</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newGasto.date}
                    onChange={(e) => setNewGasto({ ...newGasto, date: e.target.value })}
                    required
                    disabled={isSaving}
                  />
                </div>
                <div>
                  <Label htmlFor="receipt">Comprobante (Opcional)</Label>
                  <Input
                    id="receipt"
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => setNewGasto({ ...newGasto, receipt: e.target.files ? e.target.files[0] : null })}
                    disabled={isSaving}
                    accept="image/*,.pdf"
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isSaving}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                    {isSaving ? "Guardando..." : "Añadir Gasto"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Expenses List */}
        <div className="space-y-3">
          {gastos.length > 0 ? (
            gastos.map((gasto) => (
              <Card key={gasto.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1 flex-1">
                      <p className="font-medium">{gasto.description}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Fecha: {new Date(gasto.date).toLocaleDateString()}</span>
                        <span className="font-semibold text-red-600">${gasto.amount.toLocaleString()}</span>
                      </div>
                    </div>
                    {gasto.receiptUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={gasto.receiptUrl} target="_blank" rel="noopener noreferrer" className="gap-1">
                          <ExternalLink className="h-3 w-3" />
                          Ver Comprobante
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-6">
                <div className="text-center text-muted-foreground">
                  <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay gastos registrados para este proyecto</p>
                  <p className="text-sm">Añade el primer gasto para comenzar el seguimiento</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvestmentProjectDetail; 