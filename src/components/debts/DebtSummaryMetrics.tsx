
import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency } from '@/lib/utils';

interface DebtSummaryMetricsProps {
  totalAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  paidAmount: number;
}

export const DebtSummaryMetrics: React.FC<DebtSummaryMetricsProps> = ({
  totalAmount,
  pendingAmount,
  overdueAmount,
  paidAmount
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Total Deudas</CardTitle>
          <CardDescription className="text-2xl font-bold text-red-600">
            {formatCurrency(totalAmount)}
          </CardDescription>
        </CardHeader>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
          <CardDescription className="text-2xl font-bold text-yellow-600">
            {formatCurrency(pendingAmount)}
          </CardDescription>
        </CardHeader>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Vencidas</CardTitle>
          <CardDescription className="text-2xl font-bold text-red-600">
            {formatCurrency(overdueAmount)}
          </CardDescription>
        </CardHeader>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Pagadas</CardTitle>
          <CardDescription className="text-2xl font-bold text-green-600">
            {formatCurrency(paidAmount)}
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
};
