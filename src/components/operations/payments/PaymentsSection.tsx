
import React from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { PaymentsList } from "./PaymentsList";

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
  onAddPayment: () => void;
}

export const PaymentsSection: React.FC<PaymentsSectionProps> = ({ 
  payments,
  onRemovePayment,
  onAddPayment
}) => {
  return (
    <div className="pt-4 border-t">
      <div className="flex items-center justify-between mb-4">
        <Label className="text-lg font-medium">Pagos Asociados</Label>
        <Button 
          variant="outline" 
          size="sm"
          className="flex items-center gap-1"
          onClick={onAddPayment}
        >
          <Plus size={16} />
          Registrar Pago
        </Button>
      </div>

      <PaymentsList 
        payments={payments} 
        onRemovePayment={onRemovePayment} 
      />
    </div>
  );
};
