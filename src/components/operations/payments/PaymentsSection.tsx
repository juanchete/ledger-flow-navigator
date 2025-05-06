
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { PaymentsList } from "./PaymentsList";
import { TransactionForm } from '../TransactionForm';

interface Payment {
  id: string;
  amount: number;
  date: Date;
  method: string;
  notes?: string;
}

interface PaymentsSectionProps {
  payments: Payment[];
  onRemovePayment: (id: string) => void;
}

export const PaymentsSection: React.FC<PaymentsSectionProps> = ({ 
  payments,
  onRemovePayment
}) => {
  const [showTransactionModal, setShowTransactionModal] = useState(false);

  return (
    <div className="pt-4 border-t">
      <div className="flex items-center justify-between mb-4">
        <Label className="text-lg font-medium">Pagos Asociados</Label>
        <Dialog open={showTransactionModal} onOpenChange={setShowTransactionModal}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              className="flex items-center gap-1"
            >
              <Plus size={16} />
              Registrar Pago
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Registrar Nuevo Pago</DialogTitle>
            </DialogHeader>
            <TransactionForm />
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTransactionModal(false)}>
                Cancelar
              </Button>
              <Button onClick={() => {
                toast.success("Pago registrado exitosamente");
                setShowTransactionModal(false);
              }}>
                Registrar Pago
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <PaymentsList 
        payments={payments} 
        onRemovePayment={onRemovePayment} 
      />
    </div>
  );
};
