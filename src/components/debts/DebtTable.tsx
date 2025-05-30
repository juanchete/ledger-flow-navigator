import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import type { EnrichedDebtForTable } from '../../pages/AllDebts';
import { formatCurrency } from '@/lib/utils';
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Pencil, Eye } from 'lucide-react';

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
    <div className="w-full">
      {/* Vista de escritorio - tabla completa */}
      <div className="hidden lg:block">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[150px]">Acreedor</TableHead>
                <TableHead className="min-w-[120px]">Cliente</TableHead>
                <TableHead className="min-w-[100px]">Categoría</TableHead>
                <TableHead className="text-right min-w-[100px]">Monto</TableHead>
                <TableHead className="text-right min-w-[120px]">Pagado</TableHead>
                <TableHead className="min-w-[100px]">Vencimiento</TableHead>
                <TableHead className="min-w-[90px]">Estado</TableHead>
                <TableHead className="text-right min-w-[140px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {debts.map((debt) => (
                <HoverCard key={debt.id} openDelay={300} closeDelay={100}>
                  <TableRow className="cursor-pointer hover:bg-gray-50">
                    <TableCell className="font-medium">
                      <HoverCardTrigger>
                        <div className="truncate max-w-[150px]">
                          {debt.creditor}
                        </div>
                      </HoverCardTrigger>
                    </TableCell>
                    <TableCell>
                      <div className="truncate max-w-[120px]">
                        {debt.primaryClient ? debt.primaryClient.name || 'N/A' : 'Sin cliente'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="truncate max-w-[100px]">
                        {debt.category || 'Sin categoría'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(debt.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        {(() => {
                          const paymentPercentage = debt.amount > 0 ? ((debt.totalPaid || 0) / debt.amount) * 100 : 0;
                          let colorClass = "text-red-600";
                          
                          if (paymentPercentage >= 100) {
                            colorClass = "text-green-600";
                          } else if (paymentPercentage >= 25) {
                            colorClass = "text-yellow-600";
                          }
                          
                          return (
                            <span className={`font-medium ${colorClass}`}>
                              {formatCurrency(debt.totalPaid || 0)}
                              <span className="text-xs ml-1">
                                ({paymentPercentage.toFixed(1)}%)
                              </span>
                            </span>
                          );
                        })()}
                        {(debt.totalPaid || 0) > 0 && (debt.totalPaid || 0) < debt.amount && (
                          <span className="text-xs text-muted-foreground">
                            Restante: {formatCurrency(Math.max(0, debt.amount - (debt.totalPaid || 0)))}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(debt.dueDate)}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(debt.calculatedStatus)}>
                        {getStatusText(debt.calculatedStatus)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-1 justify-end">
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
                      </div>
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
      </div>

      {/* Vista móvil y tablet - cards */}
      <div className="lg:hidden space-y-4">
        {debts.map((debt) => (
          <div key={debt.id} className="border rounded-lg p-4 space-y-3 bg-white shadow-sm">
            {/* Header de la card */}
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm sm:text-base truncate">
                  {debt.creditor}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  {debt.primaryClient ? debt.primaryClient.name : 'Sin cliente'}
                </p>
              </div>
              <Badge className={`${getStatusColor(debt.calculatedStatus)} text-xs ml-2 shrink-0`}>
                {getStatusText(debt.calculatedStatus)}
              </Badge>
            </div>

            {/* Información principal */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Monto:</span>
                <div className="font-medium">{formatCurrency(debt.amount)}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Pagado:</span>
                <div className={`font-medium ${debt.totalPaid > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                  {formatCurrency(debt.totalPaid || 0)}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Vencimiento:</span>
                <div className="font-medium">{formatDate(debt.dueDate)}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Categoría:</span>
                <div className="font-medium truncate">{debt.category || 'Sin categoría'}</div>
              </div>
            </div>

            {/* Progreso de pago en móvil */}
            {debt.amount > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progreso de pago</span>
                  <span>{((debt.totalPaid || 0) / debt.amount * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, (debt.totalPaid || 0) / debt.amount * 100)}%`
                    }}
                  ></div>
                </div>
              </div>
            )}

            {/* Acciones */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button 
                variant="outline" 
                size="sm" 
                asChild
                className="flex-1"
              >
                <Link to={`/all-debts/${debt.id}`} className="flex items-center justify-center gap-2">
                  <Eye className="h-4 w-4" />
                  Ver Detalle
                </Link>
              </Button>
              {onEditDebt && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onEditDebt(debt);
                  }}
                  className="flex items-center justify-center gap-2"
                >
                  <Pencil className="h-4 w-4" />
                  Editar
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
