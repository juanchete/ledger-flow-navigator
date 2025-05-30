import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
      <div className="text-center py-8 text-muted-foreground">
        No se encontraron deudas con los criterios seleccionados.
      </div>
    );
  }

  return (
    <>
      {/* Mobile Cards View */}
      <div className="block lg:hidden space-y-3 p-4">
        {debts.map((debt) => (
          <Card key={debt.id} className="border">
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate">{debt.creditor}</h3>
                    <p className="text-xs text-muted-foreground">
                      {debt.primaryClient ? debt.primaryClient.name : 'Sin cliente'}
                    </p>
                  </div>
                  <Badge className={`ml-2 text-xs ${getStatusColor(debt.calculatedStatus)}`}>
                    {getStatusText(debt.calculatedStatus)}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground">Monto:</span>
                    <p className="font-medium">{formatCurrency(debt.amount)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Pagado:</span>
                    <p className="font-medium text-green-600">
                      {formatCurrency(debt.totalPaid || 0)}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground">Vencimiento:</span>
                    <p className="font-medium">{formatDate(debt.dueDate)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Categoría:</span>
                    <p className="font-medium truncate">{debt.category || 'Sin categoría'}</p>
                  </div>
                </div>

                {/* Progreso de pago */}
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
                
                <div className="flex gap-2 pt-2">
                  {onEditDebt && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => onEditDebt(debt)}
                      className="flex-1"
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Editar
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    asChild
                    className="flex-1"
                  >
                    <Link to={`/all-debts/${debt.id}`}>
                      Ver Detalle
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Acreedor</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Monto Total</TableHead>
              <TableHead>Pagado</TableHead>
              <TableHead>Fecha de Vencimiento</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {debts.map((debt) => (
              <HoverCard key={debt.id}>
                <HoverCardTrigger asChild>
                  <TableRow>
                    <TableCell className="font-medium">{debt.creditor}</TableCell>
                    <TableCell>
                      {debt.primaryClient ? debt.primaryClient.name : 'Sin cliente'}
                    </TableCell>
                    <TableCell>{debt.category || 'Sin categoría'}</TableCell>
                    <TableCell>{formatCurrency(debt.amount)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        {(() => {
                          const paymentPercentage = debt.amount > 0 ? ((debt.totalPaid || 0) / debt.amount) * 100 : 0;
                          let colorClass = "text-red-600"; // Rojo por defecto (0-24%)
                          
                          if (paymentPercentage >= 100) {
                            colorClass = "text-green-600"; // Verde (100%)
                          } else if (paymentPercentage >= 25) {
                            colorClass = "text-yellow-600"; // Amarillo (25-99%)
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
                    <TableCell className="text-right flex items-center justify-end gap-2">
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
                </HoverCardTrigger>
                <HoverCardContent className="w-80 p-4">
                  <span className="font-semibold text-xs text-gray-700">Historial de pagos:</span>
                  {(() => {
                    const pagos = debt.payments || [];
                    let saldoAnterior = debt.amount;
                    if (pagos.length > 0) {
                      return (
                        <ul className="mt-1 space-y-1">
                          {pagos.map((payment, idx) => {
                            const row = (
                              <li key={payment.id || idx} className="text-xs items-center border-b last:border-b-0 py-1 grid grid-cols-4 gap-1">
                                <span className="col-span-1">{formatDate(payment.date)}</span>
                                <span className="col-span-1 truncate">Cliente</span>
                                <span className="col-span-1 font-semibold text-right">{formatCurrency(payment.amount)}</span>
                                <span className="col-span-1 text-right text-gray-500">Antes: {formatCurrency(saldoAnterior)} <br/> Desp: {formatCurrency(Math.max(0, saldoAnterior - payment.amount))}</span>
                              </li>
                            );
                            saldoAnterior = Math.max(0, saldoAnterior - payment.amount);
                            return row;
                          })}
                        </ul>
                      );
                    }
                    return <div className="text-xs text-gray-500 mt-1">Sin pagos asociados</div>;
                  })()}
                </HoverCardContent>
              </HoverCard>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
};
