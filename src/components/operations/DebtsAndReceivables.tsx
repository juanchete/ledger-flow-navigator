import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mockDetailedDebts, mockDetailedReceivables, mockTransactions, mockClients } from '@/data/mockData';
import { formatCurrency } from '@/lib/utils';
import { DebtDetailsModal } from './DebtDetailsModal';
import { Link } from 'react-router-dom';
import { ArrowRight, Info } from 'lucide-react';
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Debt {
  id: string;
  creditor: string;
  amount: number;
  dueDate: Date;
  status: string;
  category: string;
  notes: string;
}

interface Receivable {
  id: string;
  clientId: string;
  amount: number;
  dueDate: Date;
  status: string;
  description: string;
  notes: string;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-400 text-yellow-900';
    case 'paid':
      return 'bg-green-500 text-white';
    case 'overdue':
      return 'bg-red-500 text-white';
    default:
      return 'bg-gray-300 text-gray-800';
  }
};

const formatDate = (date: Date) => {
  return new Date(date).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

export const DebtsAndReceivables: React.FC = () => {
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [selectedReceivable, setSelectedReceivable] = useState<Receivable | null>(null);
  const [modalType, setModalType] = useState<'debt' | 'receivable'>('debt');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleDebtClick = (debt: Debt) => {
    setSelectedDebt(debt);
    setModalType('debt');
    setIsModalOpen(true);
  };

  const handleReceivableClick = (receivable: Receivable) => {
    setSelectedReceivable(receivable);
    setModalType('receivable');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 w-full">
      {/* Deudas */}
      <Card className="h-full w-full md:w-1/2">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Deudas Pendientes</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-red-500 text-white px-4 py-1 text-base font-semibold rounded-full shadow-sm">
              Total: {formatCurrency(mockDetailedDebts.reduce((sum, debt) => sum + debt.amount, 0))}
            </Badge>
            <Button variant="outline" size="sm" asChild className="whitespace-nowrap">
              <Link to="/all-debts">
                Ver Todos <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <TooltipProvider>
              {mockDetailedDebts.map((debt: Debt) => (
                <HoverCard key={debt.id}>
                  <HoverCardTrigger asChild>
                    <div className="flex items-center justify-between py-2 px-3 border-b hover:bg-gray-50 cursor-pointer transition-colors rounded-sm">
                      <div className="flex items-center gap-3">
                        <Badge className={`${getStatusColor(debt.status)} h-2 w-2 p-1 rounded-full`} />
                        <span className="font-medium">{debt.creditor}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500">{formatDate(debt.dueDate)}</span>
                        <span className="font-semibold">{formatCurrency(debt.amount)}</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6" 
                              onClick={() => handleDebtClick(debt)}
                            >
                              <Info className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Ver detalles completos</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80 p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">{debt.creditor}</h4>
                        <Badge className={getStatusColor(debt.status)}>{debt.status}</Badge>
                      </div>
                      <div className="mt-3">
                        <span className="font-semibold text-xs text-gray-700">Historial de pagos:</span>
                        {(() => {
                          const pagos = mockTransactions
                            .filter(t => t.type === 'payment' && t.debtId === debt.id)
                            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                          let saldoAnterior = debt.amount;
                          if (pagos.length > 0) {
                            return (
                              <ul className="mt-1 space-y-1">
                                {pagos.map((t, idx) => {
                                  const cliente = t.clientId ? mockClients.find(c => c.id === t.clientId) : null;
                                  const saldoDespues = Math.max(0, saldoAnterior - t.amount);
                                  const row = (
                                    <li key={t.id} className="text-xs items-center border-b last:border-b-0 py-1 grid grid-cols-4 gap-1">
                                      <span className="col-span-1">{new Date(t.date).toLocaleDateString('es-ES')}</span>
                                      <span className="col-span-1 truncate">{cliente ? cliente.name : 'Cliente'}</span>
                                      <span className="col-span-1 font-semibold text-right">{formatCurrency(t.amount)}</span>
                                      <span className="col-span-1 text-right text-gray-500">Antes: {formatCurrency(saldoAnterior)} <br/> Desp: {formatCurrency(saldoDespues)}</span>
                                    </li>
                                  );
                                  saldoAnterior = saldoDespues;
                                  return row;
                                })}
                              </ul>
                            );
                          } else {
                            return <div className="text-xs text-gray-500 mt-1">Sin pagos asociados</div>;
                          }
                        })()}
                      </div>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              ))}
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>

      {/* Cuentas por Cobrar */}
      <Card className="h-full w-full md:w-1/2">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Cuentas por Cobrar</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-green-500 text-white px-4 py-1 text-base font-semibold rounded-full shadow-sm">
              Total: {formatCurrency(mockDetailedReceivables.reduce((sum, rec) => sum + rec.amount, 0))}
            </Badge>
            <Button variant="outline" size="sm" asChild className="whitespace-nowrap">
              <Link to="/all-receivables">
                Ver Todos <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <TooltipProvider>
              {mockDetailedReceivables.map((receivable: Receivable) => (
                <HoverCard key={receivable.id}>
                  <HoverCardTrigger asChild>
                    <div className="flex items-center justify-between py-2 px-3 border-b hover:bg-gray-50 cursor-pointer transition-colors rounded-sm">
                      <div className="flex items-center gap-3">
                        <Badge className={`${getStatusColor(receivable.status)} h-2 w-2 p-1 rounded-full`} />
                        <span className="font-medium">{receivable.description}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500">{formatDate(receivable.dueDate)}</span>
                        <span className="font-semibold">{formatCurrency(receivable.amount)}</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6" 
                              onClick={() => handleReceivableClick(receivable)}
                            >
                              <Info className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Ver detalles completos</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80 p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">{receivable.description}</h4>
                        <Badge className={getStatusColor(receivable.status)}>{receivable.status}</Badge>
                      </div>
                      <div className="mt-3">
                        <span className="font-semibold text-xs text-gray-700">Historial de pagos:</span>
                        {(() => {
                          const pagos = mockTransactions
                            .filter(t => t.type === 'payment' && t.receivableId === receivable.id)
                            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                          let saldoAnterior = receivable.amount;
                          if (pagos.length > 0) {
                            return (
                              <ul className="mt-1 space-y-1">
                                {pagos.map((t, idx) => {
                                  const cliente = t.clientId ? mockClients.find(c => c.id === t.clientId) : null;
                                  const saldoDespues = Math.max(0, saldoAnterior - t.amount);
                                  const row = (
                                    <li key={t.id} className="text-xs items-center border-b last:border-b-0 py-1 grid grid-cols-4 gap-1">
                                      <span className="col-span-1">{new Date(t.date).toLocaleDateString('es-ES')}</span>
                                      <span className="col-span-1 truncate">{cliente ? cliente.name : 'Cliente'}</span>
                                      <span className="col-span-1 font-semibold text-right">{formatCurrency(t.amount)}</span>
                                      <span className="col-span-1 text-right text-gray-500">Antes: {formatCurrency(saldoAnterior)} <br/> Desp: {formatCurrency(saldoDespues)}</span>
                                    </li>
                                  );
                                  saldoAnterior = saldoDespues;
                                  return row;
                                })}
                              </ul>
                            );
                          } else {
                            return <div className="text-xs text-gray-500 mt-1">Sin pagos asociados</div>;
                          }
                        })()}
                      </div>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              ))}
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>

      {/* Modal for displaying debt/receivable details */}
      {isModalOpen && selectedDebt && modalType === 'debt' && (
        <DebtDetailsModal 
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          item={selectedDebt}
          type="debt"
        />
      )}
      {isModalOpen && selectedReceivable && modalType === 'receivable' && (
        <DebtDetailsModal 
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          item={selectedReceivable}
          type="receivable"
        />
      )}
    </div>
  );
};
