import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from '@/lib/utils';
import { DebtDetailsModal } from './DebtDetailsModal';
import { Link } from 'react-router-dom';
import { ArrowRight, Info } from 'lucide-react';
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getReceivables } from "@/integrations/supabase/receivableService";
import { getTransactions } from "@/integrations/supabase/transactionService";
import { getDebts } from "@/integrations/supabase/debtService";
import { getClients } from "@/integrations/supabase/clientService";
import type { Tables } from "@/integrations/supabase/types";
import type { Client } from "@/integrations/supabase/clientService";

interface Debt {
  id: string;
  creditor: string;
  amount: number;
  dueDate: Date;
  status: string;
  category: string;
  notes: string;
  clientId?: string;
  clientName?: string;
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

interface Transaction {
  id: string;
  type: string;
  receivableId?: string;
  debtId?: string;
  clientId?: string;
  amount: number;
  date: string | Date;
  status: string;
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
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [receivablesData, transactionsData, debtsData, clientsData] = await Promise.all([
          getReceivables(),
          getTransactions(),
          getDebts(),
          getClients()
        ]);
        
        // Mapear transacciones primero
        const mappedTransactions = transactionsData.map((t: Tables<'transactions'>) => ({
          id: t.id,
          type: t.type,
          receivableId: t.receivable_id,
          debtId: t.debt_id,
          clientId: t.client_id,
          amount: t.amount,
          date: t.date,
          status: t.status
        }));
        setTransactions(mappedTransactions);
        
        // Calcular estado real de receivables basado en pagos
        const receivablesWithCalculatedStatus = receivablesData.map((r: Tables<'receivables'>) => {
          const payments = mappedTransactions.filter(
            t => t.type === 'payment' && t.receivableId === r.id && t.status === 'completed'
          );
          const totalPaid = payments.reduce((sum, t) => sum + t.amount, 0);
          const calculatedStatus = totalPaid >= r.amount ? 'paid' : (r.status || 'pending');
          
          return {
            id: r.id,
            clientId: r.client_id,
            amount: r.amount,
            dueDate: new Date(r.due_date),
            status: calculatedStatus,
            description: r.description || '',
            notes: r.notes || ''
          };
        });
        setReceivables(receivablesWithCalculatedStatus);
        
        setClients(clientsData);
        
        // Calcular estado real de deudas basado en pagos
        const debtsWithCalculatedStatus = debtsData.map((d: Tables<'debts'>) => {
          const client = clientsData.find(c => c.id === d.client_id);
          const payments = mappedTransactions.filter(
            t => t.type === 'payment' && t.debtId === d.id && t.status === 'completed'
          );
          const totalPaid = payments.reduce((sum, t) => sum + t.amount, 0);
          const calculatedStatus = totalPaid >= d.amount ? 'paid' : (d.status || 'pending');
          
          return {
            id: d.id,
            creditor: d.creditor,
            amount: d.amount,
            dueDate: new Date(d.due_date),
            status: calculatedStatus,
            category: d.category || '',
            notes: d.notes || '',
            clientId: d.client_id || undefined,
            clientName: client?.name || undefined
          };
        });
        setDebts(debtsWithCalculatedStatus);
        
      } catch (err) {
        console.error("Error al cargar datos de Supabase:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="flex flex-col lg:flex-row gap-4 md:gap-6 w-full max-w-full overflow-hidden">
      {/* Cuentas por Cobrar */}
      <Card className="h-full w-full max-w-full min-w-0">
        <CardHeader className="pb-3 flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <CardTitle className="text-lg font-semibold">Cuentas por Cobrar</CardTitle>
          </div>
          <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-2">
            <Badge className="bg-green-500 text-white px-3 py-1 text-sm font-semibold rounded-full shadow-sm text-center">
              Total: {formatCurrency(
                receivables
                  .filter(r => r.status === 'pending')
                  .reduce((sum, rec) => {
                    const payments = transactions.filter(
                      t => t.type === 'payment' && t.receivableId === rec.id && t.status === 'completed'
                    );
                    const totalPaid = payments.reduce((paidSum, t) => paidSum + t.amount, 0);
                    const remainingAmount = Math.max(0, rec.amount - totalPaid);
                    return sum + remainingAmount;
                  }, 0)
              )}
            </Badge>
            <Button variant="outline" size="sm" asChild className="whitespace-nowrap w-full sm:w-auto">
              <Link to="/all-receivables">
                Ver Todos <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <TooltipProvider>
              {(() => {
                const pendingReceivables = receivables
                  .filter(receivable => receivable.status === 'pending')
                  .slice()
                  .sort((a, b) => b.amount - a.amount)
                  .slice(0, 5);
                
                if (pendingReceivables.length === 0) {
                  return (
                    <div className="text-center py-8 text-muted-foreground">
                      No hay cuentas por cobrar pendientes
                    </div>
                  );
                }
                
                return pendingReceivables.map((receivable: Receivable) => (
                  <HoverCard key={receivable.id}>
                    <HoverCardTrigger asChild>
                      <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 py-2 px-3 border-b hover:bg-gray-50 cursor-pointer transition-colors rounded-sm">
                        <div className="flex items-center gap-3 min-w-0 flex-shrink">
                          <Badge className={`${getStatusColor(receivable.status)} h-2 w-2 p-1 rounded-full flex-shrink-0`} />
                          <span className="font-medium truncate min-w-0">{receivable.description}</span>
                        </div>
                        <div className="flex items-center justify-between sm:gap-4 flex-shrink-0">
                          <span className="text-sm text-gray-500 flex-shrink-0">{formatDate(receivable.dueDate)}</span>
                          <div className="flex items-center gap-2 flex-shrink-0">
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
                            const pagos = transactions
                              .filter(t => t.type === 'payment' && t.receivableId === receivable.id)
                              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                            let saldoAnterior = receivable.amount;
                            if (pagos.length > 0) {
                              return (
                                <ul className="mt-1 space-y-1">
                                  {pagos.map((t, idx) => {
                                    const row = (
                                      <li key={t.id} className="text-xs items-center border-b last:border-b-0 py-1 grid grid-cols-4 gap-1">
                                        <span className="col-span-1">{new Date(t.date).toLocaleDateString('es-ES')}</span>
                                        <span className="col-span-1 truncate">{t.clientId ? t.clientId : 'Cliente'}</span>
                                        <span className="col-span-1 font-semibold text-right">{formatCurrency(t.amount)}</span>
                                        <span className="col-span-1 text-right text-gray-500">Antes: {formatCurrency(saldoAnterior)} <br/> Desp: {formatCurrency(Math.max(0, saldoAnterior - t.amount))}</span>
                                      </li>
                                    );
                                    saldoAnterior = Math.max(0, saldoAnterior - t.amount);
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
                ));
              })()}
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>
      {/* Deudas */}
      <Card className="h-full w-full max-w-full min-w-0">
        <CardHeader className="pb-3 flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <CardTitle className="text-lg font-semibold">Deudas Pendientes</CardTitle>
          </div>
          <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-2">
            <Badge className="bg-red-500 text-white px-3 py-1 text-sm font-semibold rounded-full shadow-sm text-center">
              Total: {formatCurrency(
                debts
                  .filter(d => d.status === 'pending')
                  .reduce((sum, debt) => {
                    const payments = transactions.filter(
                      t => t.type === 'payment' && t.debtId === debt.id && t.status === 'completed'
                    );
                    const totalPaid = payments.reduce((paidSum, t) => paidSum + t.amount, 0);
                    const remainingAmount = Math.max(0, debt.amount - totalPaid);
                    return sum + remainingAmount;
                  }, 0)
              )}
            </Badge>
            <Button variant="outline" size="sm" asChild className="whitespace-nowrap w-full sm:w-auto">
              <Link to="/all-debts">
                Ver Todos <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <TooltipProvider>
              {(() => {
                const pendingDebts = debts
                  .filter(debt => debt.status === 'pending')
                  .slice()
                  .sort((a, b) => b.amount - a.amount)
                  .slice(0, 5);
                
                if (pendingDebts.length === 0) {
                  return (
                    <div className="text-center py-8 text-muted-foreground">
                      No hay deudas pendientes
                    </div>
                  );
                }
                
                return pendingDebts.map((debt: Debt) => (
                  <HoverCard key={debt.id}>
                    <HoverCardTrigger asChild>
                      <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 py-2 px-3 border-b hover:bg-gray-50 cursor-pointer transition-colors rounded-sm">
                        <div className="flex items-center gap-3 min-w-0 flex-shrink">
                          <Badge className={`${getStatusColor(debt.status)} h-2 w-2 p-1 rounded-full flex-shrink-0`} />
                          <span className="font-medium truncate min-w-0">{debt.clientName || 'Sin cliente'}</span>
                        </div>
                        <div className="flex items-center justify-between sm:gap-4 flex-shrink-0">
                          <span className="text-sm text-gray-500 flex-shrink-0">{formatDate(debt.dueDate)}</span>
                          <div className="flex items-center gap-2 flex-shrink-0">
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
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80 p-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold">{debt.clientName || 'Sin cliente'}</h4>
                          <Badge className={getStatusColor(debt.status)}>{debt.status}</Badge>
                        </div>
                        {debt.creditor && (
                          <p className="text-sm text-gray-600">Acreedor: {debt.creditor}</p>
                        )}
                        <div className="mt-3">
                          <span className="font-semibold text-xs text-gray-700">Historial de pagos:</span>
                          {(() => {
                            const pagos = transactions
                              .filter(t => t.type === 'payment' && t.debtId === debt.id)
                              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                            let saldoAnterior = debt.amount;
                            if (pagos.length > 0) {
                              return (
                                <ul className="mt-1 space-y-1">
                                  {pagos.map((t, idx) => {
                                    const row = (
                                      <li key={t.id} className="text-xs items-center border-b last:border-b-0 py-1 grid grid-cols-4 gap-1">
                                        <span className="col-span-1">{new Date(t.date).toLocaleDateString('es-ES')}</span>
                                        <span className="col-span-1 truncate">{t.clientId ? t.clientId : 'Cliente'}</span>
                                        <span className="col-span-1 font-semibold text-right">{formatCurrency(t.amount)}</span>
                                        <span className="col-span-1 text-right text-gray-500">Antes: {formatCurrency(saldoAnterior)} <br/> Desp: {formatCurrency(Math.max(0, saldoAnterior - t.amount))}</span>
                                      </li>
                                    );
                                    saldoAnterior = Math.max(0, saldoAnterior - t.amount);
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
                ));
              })()}
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>
      {/* Modal para detalles de cuentas por cobrar y deudas */}
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
