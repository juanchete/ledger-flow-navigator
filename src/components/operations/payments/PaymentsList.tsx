
import React from 'react';
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";

interface Payment {
  id: string;
  amount: number;
  date: Date;
  method: string;
  notes?: string;
}

interface PaymentsListProps {
  payments: Payment[];
  onRemovePayment: (id: string) => void;
}

export const PaymentsList: React.FC<PaymentsListProps> = ({ 
  payments, 
  onRemovePayment 
}) => {
  if (payments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No hay pagos registrados. Haga clic en "Registrar Pago" para añadir uno.
      </p>
    );
  }

  return (
    <div className="space-y-2 max-h-[200px] overflow-y-auto">
      {payments.map((payment) => (
        <div 
          key={payment.id} 
          className="flex items-center justify-between bg-background p-3 rounded-md border"
        >
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="font-medium">{formatCurrency(payment.amount)}</span>
              <span className="text-sm text-muted-foreground">
                {format(new Date(payment.date), 'dd/MM/yyyy')}
              </span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-sm capitalize">{payment.method}</span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 text-destructive" 
                onClick={() => onRemovePayment(payment.id)}
              >
                <Trash2 size={14} />
              </Button>
            </div>
            {payment.notes && (
              <p className="text-xs text-muted-foreground mt-1">{payment.notes}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
