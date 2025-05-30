
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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <Card className="text-center">
        <CardHeader className="pb-2 px-3 sm:px-6">
          <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
            Total Deudas
          </CardTitle>
          <CardDescription className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600">
            {formatCurrency(totalAmount)}
          </CardDescription>
        </CardHeader>
      </Card>
      
      <Card className="text-center">
        <CardHeader className="pb-2 px-3 sm:px-6">
          <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
            Pendientes
          </CardTitle>
          <CardDescription className="text-lg sm:text-xl lg:text-2xl font-bold text-yellow-600">
            {formatCurrency(pendingAmount)}
          </CardDescription>
        </CardHeader>
      </Card>
      
      <Card className="text-center">
        <CardHeader className="pb-2 px-3 sm:px-6">
          <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
            Vencidas
          </CardTitle>
          <CardDescription className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600">
            {formatCurrency(overdueAmount)}
          </CardDescription>
        </CardHeader>
      </Card>
      
      <Card className="text-center">
        <CardHeader className="pb-2 px-3 sm:px-6">
          <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
            Pagadas
          </CardTitle>
          <CardDescription className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">
            {formatCurrency(paidAmount)}
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
};
