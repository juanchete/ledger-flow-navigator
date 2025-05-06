
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { DebtSummary } from './debt/DebtSummary';
import { DebtMetadata } from './debt/DebtMetadata';
import { PaymentsSection } from './payments/PaymentsSection';

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

interface Payment {
  id: string;
  amount: number;
  date: Date;
  method: string;
  notes?: string;
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
  const [payments, setPayments] = useState<Payment[]>([]);

  const isDebt = (item: Debt | Receivable): item is Debt => {
    return 'creditor' in item;
  };

  const handleSave = () => {
    // En una app real, esto actualizaría la base de datos
    toast.success(`${type === 'debt' ? 'Deuda' : 'Cuenta por cobrar'} actualizada exitosamente`);
    onClose();
  };

  const removePayment = (paymentId: string) => {
    setPayments(payments.filter(p => p.id !== paymentId));
    toast.success("Pago eliminado exitosamente");
  };

  // Calcular totales
  const totalAmount = item.amount;
  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const remainingAmount = totalAmount - totalPaid;

  // Actualizar estado automáticamente basado en pagos
  const updateStatusBasedOnPayments = () => {
    if (totalPaid >= totalAmount) {
      return 'paid';
    } else if (status === 'overdue') {
      return 'overdue';
    } else {
      return 'pending';
    }
  };

  // Estado calculado
  const calculatedStatus = updateStatusBasedOnPayments();

  // Prepare data for DebtSummary component
  const summaryName = isDebt(item) ? item.creditor : item.description;
  const summarySubtext = isDebt(item) ? 
    `Categoría: ${item.category}` : 
    `Cliente ID: ${item.clientId}`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {type === 'debt' ? 'Detalle de Deuda' : 'Detalle de Cuenta por Cobrar'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Summary component with name, status, and amounts */}
          <DebtSummary
            name={summaryName}
            subtext={summarySubtext}
            status={calculatedStatus}
            totalAmount={totalAmount}
            totalPaid={totalPaid}
            remainingAmount={remainingAmount}
          />

          {/* Metadata component with due date, status selector, and notes */}
          <DebtMetadata
            dueDate={item.dueDate}
            status={status}
            notes={notes}
            onStatusChange={setStatus}
            onNotesChange={(e) => setNotes(e.target.value)}
          />

          {/* Payments section component */}
          <PaymentsSection
            payments={payments}
            onRemovePayment={removePayment}
          />
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Guardar Cambios</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
