
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { DebtSummary } from './debt/DebtSummary';
import { DebtMetadata } from './debt/DebtMetadata';
import { PaymentsSection } from './payments/PaymentsSection';
import { PaymentFormModal } from './modals/PaymentFormModal';
import { ConfirmationDialog } from './modals/ConfirmationDialog';

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
  clientId?: string;
  clientName?: string;
  clientType?: 'direct' | 'indirect';
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
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [confirmationDialog, setConfirmationDialog] = useState({
    isOpen: false,
    paymentId: ''
  });

  const isDebt = (item: Debt | Receivable): item is Debt => {
    return 'creditor' in item;
  };

  const handleSave = () => {
    // En una app real, esto actualizaría la base de datos
    toast.success(`${type === 'debt' ? 'Deuda' : 'Cuenta por cobrar'} actualizada exitosamente`);
    onClose();
  };

  const addPayment = (payment: Payment) => {
    setPayments([...payments, payment]);
    setShowPaymentModal(false);
    toast.success("Pago registrado exitosamente");
  };

  const removePayment = (paymentId: string) => {
    setConfirmationDialog({
      isOpen: false,
      paymentId: ''
    });
    setPayments(payments.filter(p => p.id !== paymentId));
    toast.success("Pago eliminado exitosamente");
  };

  const confirmRemovePayment = (paymentId: string) => {
    setConfirmationDialog({
      isOpen: true,
      paymentId
    });
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
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px] w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-bold">
              {type === 'debt' ? 'Detalle de Deuda' : 'Detalle de Cuenta por Cobrar'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 sm:space-y-4 pt-2 sm:pt-4">
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
              onRemovePayment={confirmRemovePayment}
              onAddPayment={() => setShowPaymentModal(true)}
            />
          </div>

          <DialogFooter className="mt-4 sm:mt-6 gap-2 sm:gap-0">
            <Button variant="outline" onClick={onClose} size="sm" className="text-sm">
              Cancelar
            </Button>
            <Button onClick={handleSave} size="sm" className="text-sm">
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Payment form modal */}
      <PaymentFormModal 
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onPaymentAdded={addPayment}
      />
      
      {/* Confirmation dialog for payment removal */}
      <ConfirmationDialog
        isOpen={confirmationDialog.isOpen}
        onClose={() => setConfirmationDialog({ isOpen: false, paymentId: '' })}
        onConfirm={() => removePayment(confirmationDialog.paymentId)}
        title="Eliminar Pago"
        description="¿Está seguro que desea eliminar este pago? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
      />
    </>
  );
};
