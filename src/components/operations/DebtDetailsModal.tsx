
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";

interface Debt {
  id: string;
  creditor: string;
  amount: number;
  dueDate: Date;
  status: string;
  category: string;
  notes: string;
}

interface Receivable {
  id: string;
  clientId: string;
  amount: number;
  dueDate: Date;
  status: string;
  description: string;
  notes: string;
}

interface DebtDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Debt | Receivable;
  type: 'debt' | 'receivable';
}

export const DebtDetailsModal: React.FC<DebtDetailsModalProps> = ({ 
  isOpen, 
  onClose,
  item,
  type
}) => {
  const [status, setStatus] = useState(item.status);
  const [notes, setNotes] = useState(item.notes);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-400 text-yellow-900';
      case 'paid': return 'bg-green-500 text-white';
      case 'overdue': return 'bg-red-500 text-white';
      default: return 'bg-gray-300 text-gray-800';
    }
  };

  const handleSave = () => {
    // In a real app, this would update the database
    toast.success(`${type === 'debt' ? 'Deuda' : 'Cuenta por cobrar'} actualizada exitosamente`);
    onClose();
  };

  const isDebt = (item: Debt | Receivable): item is Debt => {
    return 'creditor' in item;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {type === 'debt' ? 'Detalle de Deuda' : 'Detalle de Cuenta por Cobrar'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-medium">
                {isDebt(item) ? item.creditor : item.description}
              </p>
              <p className="text-sm text-muted-foreground">
                {isDebt(item) ? `Categoría: ${item.category}` : `Cliente ID: ${item.clientId}`}
              </p>
            </div>
            <Badge className={`${getStatusColor(item.status)} text-sm py-1 px-3`}>
              {item.status}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Monto</Label>
              <p className="text-xl font-bold">{formatCurrency(item.amount)}</p>
            </div>
            <div>
              <Label>Fecha de Vencimiento</Label>
              <p>{formatDate(item.dueDate)}</p>
            </div>
          </div>

          <div>
            <Label htmlFor="status">Cambiar Estado</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="paid">Pagado</SelectItem>
                <SelectItem value="overdue">Vencido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Notas</Label>
            <Textarea 
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Guardar Cambios</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
