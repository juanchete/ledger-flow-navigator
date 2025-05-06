
import React from 'react';
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import { StatusBadge } from "../common/StatusBadge";

interface DebtSummaryProps {
  name: string;
  subtext: string;
  status: string;
  totalAmount: number;
  totalPaid: number;
  remainingAmount: number;
}

export const DebtSummary: React.FC<DebtSummaryProps> = ({
  name,
  subtext,
  status,
  totalAmount,
  totalPaid,
  remainingAmount
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-lg font-medium">{name}</p>
          <p className="text-sm text-muted-foreground">{subtext}</p>
        </div>
        <StatusBadge status={status} className="text-sm py-1 px-3" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label>Monto Total</Label>
          <p className="text-xl font-bold">{formatCurrency(totalAmount)}</p>
        </div>
        <div>
          <Label>Pagado</Label>
          <p className="text-xl font-semibold text-green-600">{formatCurrency(totalPaid)}</p>
        </div>
        <div>
          <Label>Pendiente</Label>
          <p className="text-xl font-semibold text-amber-600">{formatCurrency(remainingAmount)}</p>
        </div>
      </div>
    </div>
  );
};
