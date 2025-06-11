import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { getObraById, getGastosByObraId, createGastoObra, uploadReceiptImage } from "@/integrations/supabase/obraService";
import { createReceivable } from "@/integrations/supabase/receivableService";
import { createTransaction } from "@/integrations/supabase/transactionService";
import { Obra, GastoObra } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Icons } from "@/components/Icons";

const ObraDetail: React.FC = () => {
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
        console.error("Error fetching obra details:", error);
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
        description: `Gasto de obra: ${obra?.name} - ${gastoData.description}`,
        obraId: id,
        status: "pending",
      });

      await createTransaction({
        type: "expense",
        amount: gastoData.amount,
        description: `Gasto de obra: ${obra?.name} - ${gastoData.description}`,
        date: new Date(),
        obraId: id,
        status: "completed",
      });

      setNewGasto({ description: "", amount: 0, date: new Date().toISOString().split("T")[0], receipt: null });
      if(fileInputRef.current) fileInputRef.current.value = "";
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error creating gasto:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!obra) return <div>Obra not found.</div>;

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>{obra.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{obra.description}</p>
          <p><strong>Ubicación:</strong> {obra.location}</p>
          <p><strong>Estado:</strong> {obra.status}</p>
          <p><strong>Presupuesto:</strong> ${obra.budget?.toLocaleString()}</p>
        </CardContent>
      </Card>

      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Gastos de la Obra</h2>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button>Añadir Nuevo Gasto</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Añadir Nuevo Gasto</DialogTitle>
                <DialogDescription>
                  Añade un nuevo gasto a la obra. Esto creará una cuenta por cobrar asociada.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateGasto} className="space-y-4">
                <div>
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={newGasto.description}
                    onChange={(e) => setNewGasto({ ...newGasto, description: e.target.value })}
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
                    required
                    disabled={isSaving}
                  />
                </div>
                <div>
                  <Label htmlFor="date">Fecha</Label>
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
                  <Label htmlFor="receipt">Factura</Label>
                  <Input
                    id="receipt"
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => setNewGasto({ ...newGasto, receipt: e.target.files ? e.target.files[0] : null })}
                    disabled={isSaving}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isSaving}>Cancelar</Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                    {isSaving ? "Guardando..." : "Añadir Gasto"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <div className="mt-4">
          {gastos.map((gasto) => (
            <Card key={gasto.id} className="mb-4">
              <CardContent className="p-4">
                <p><strong>Descripción:</strong> {gasto.description}</p>
                <p><strong>Monto:</strong> ${gasto.amount.toLocaleString()}</p>
                <p><strong>Fecha:</strong> {new Date(gasto.date).toLocaleDateString()}</p>
                {gasto.receiptUrl && (
                  <a href={gasto.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                    Ver Factura
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ObraDetail; 