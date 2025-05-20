
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import type { EnrichedDebtForTable } from '../../pages/AllDebts';
import { formatCurrency } from '@/lib/utils';
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Pencil } from 'lucide-react';

interface DebtTableProps {
  debts: EnrichedDebtForTable[];
  formatDate: (date: Date | string) => string;
  onDebtClick: (debt: EnrichedDebtForTable) => void;
  onEditDebt?: (debt: EnrichedDebtForTable) => void;
}

export const DebtTable: React.FC<DebtTableProps> = ({ 
  debts,
  formatDate,
  onDebtClick,
  onEditDebt
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-500 text-white';
      case 'pending':
        return 'bg-yellow-400 text-yellow-900';
      case 'overdue':
        return 'bg-red-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Pagado';
      case 'pending':
        return 'Pendiente';
      case 'overdue':
        return 'Vencido';
      default:
        return status;
    }
  };

  if (debts.length === 0) {
    return (
      <div className="text-center p-6 text-gray-500">
        No se encontraron deudas con los criterios seleccionados.
      </div>
    );
  }

  return (
    <div className="overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Acreedor</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead className="text-right">Monto</TableHead>
            <TableHead className="text-right">Pagado</TableHead>
            <TableHead>Vencimiento</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {debts.map((debt) => (
            <HoverCard key={debt.id} openDelay={300} closeDelay={100}>
              <TableRow className="cursor-pointer hover:bg-gray-50">
                <TableCell className="font-medium">
                  <HoverCardTrigger>
                    {debt.creditor}
                  </HoverCardTrigger>
                </TableCell>
                <TableCell>
                  {debt.primaryClient ? (
                    <>
                      {debt.primaryClient.name || debt.client_id || 'N/A'}
                    </>
                  ) : (
                    <>Sin cliente</>
                  )}
                </TableCell>
                <TableCell>{debt.category || 'Sin categoría'}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(debt.amount)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(debt.totalPaid || 0)}
                </TableCell>
                <TableCell>{formatDate(debt.dueDate)}</TableCell>
                <TableCell>
                  <Badge className={getStatusColor(debt.calculatedStatus)}>
                    {getStatusText(debt.calculatedStatus)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  {onEditDebt && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onEditDebt(debt);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    asChild
                  >
                    <Link to={`/all-debts/${debt.id}`}>
                      Ver Detalle
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
              <HoverCardContent className="w-80">
                <div className="space-y-2">
                  <h4 className="font-semibold">{debt.creditor}</h4>
                  
                  <div className="text-sm">
                    <div><span className="font-semibold">Monto:</span> {formatCurrency(debt.amount)}</div>
                    <div><span className="font-semibold">Pagado:</span> {formatCurrency(debt.totalPaid || 0)}</div>
                    <div><span className="font-semibold">Pendiente:</span> {formatCurrency(Math.max(0, debt.amount - (debt.totalPaid || 0)))}</div>
                    <div><span className="font-semibold">Vencimiento:</span> {formatDate(debt.dueDate)}</div>
                    <div><span className="font-semibold">Notas:</span> {debt.notes || 'Sin notas'}</div>
                  </div>
                  
                  {debt.payments && debt.payments.length > 0 && (
                    <div>
                      <h5 className="font-semibold text-xs mt-2 mb-1">Pagos realizados:</h5>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {debt.payments.map((payment, idx) => (
                          <div key={payment.id || idx} className="text-xs flex justify-between border-b pb-1">
                            <span>{formatDate(payment.date)}</span>
                            <span className="font-medium">{formatCurrency(payment.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </HoverCardContent>
            </HoverCard>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
