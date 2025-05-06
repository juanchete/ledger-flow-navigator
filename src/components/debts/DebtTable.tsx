
import React from 'react';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/operations/common/StatusBadge";
import { formatCurrency } from '@/lib/utils';

interface Debt {
  id: string;
  creditor: string;
  amount: number;
  dueDate: Date;
  status: string;
  category: string;
  notes: string;
}

interface DebtTableProps {
  debts: Debt[];
  formatDate: (date: Date) => string;
  onDebtClick: (debt: Debt) => void;
}

export const DebtTable: React.FC<DebtTableProps> = ({
  debts,
  formatDate,
  onDebtClick
}) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Acreedor</TableHead>
          <TableHead>Categoría</TableHead>
          <TableHead>Monto</TableHead>
          <TableHead>Fecha de Vencimiento</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {debts.length > 0 ? (
          debts.map((debt) => (
            <TableRow key={debt.id}>
              <TableCell className="font-medium">{debt.creditor}</TableCell>
              <TableCell>{debt.category}</TableCell>
              <TableCell>{formatCurrency(debt.amount)}</TableCell>
              <TableCell>{formatDate(debt.dueDate)}</TableCell>
              <TableCell>
                <StatusBadge status={debt.status} />
              </TableCell>
              <TableCell className="text-right">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onDebtClick(debt)}
                >
                  Ver Detalle
                </Button>
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
              No se encontraron deudas con los filtros aplicados
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};
