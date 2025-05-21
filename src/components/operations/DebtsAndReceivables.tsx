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
import type { Tables } from "@/integrations/supabase/types";

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

interface Transaction {
  id: string;
  type: string;
  receivableId?: string;
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
        const [receivablesData, transactionsData, debtsData] = await Promise.all([
          getReceivables(),
          getTransactions(),
          getDebts()
        ]);
        setReceivables(
          receivablesData.map((r: Tables<'receivables'>) => ({
            id: r.id,
            clientId: r.client_id,
            amount: r.amount,
            dueDate: new Date(r.due_date),
            status: r.status || 'pending',
            description: r.description || '',
            notes: r.notes || ''
          }))
        );
        setTransactions(
          transactionsData.map((t: Tables<'transactions'>) => ({
            id: t.id,
            type: t.type,
            receivableId: t.receivable_id,
            clientId: t.client_id,
            amount: t.amount,
            date: t.date,
            status: t.status
          }))
        );
        setDebts(
          debtsData.map((d: Tables<'debts'>) => ({
            id: d.id,
            creditor: d.creditor,
            amount: d.amount,
            dueDate: new Date(d.due_date),
            status: d.status || 'pending',
            category: d.category || '',
            notes: d.notes || ''
          }))
        );
      } catch (err) {
        console.error("Error al cargar datos de Supabase:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="flex flex-col md:flex-row gap-6 w-full">
      {/* Cuentas por Cobrar */}
      <Card className="h-full w-full">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Cuentas por Cobrar</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-green-500 text-white px-4 py-1 text-base font-semibold rounded-full shadow-sm">
              Total: {formatCurrency(receivables.reduce((sum, rec) => sum + rec.amount, 0))}
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
              {receivables
                .slice()
                .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
                .slice(0, 5)
                .map((receivable: Receivable) => (
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
                ))}
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>
      {/* Deudas */}
      <Card className="h-full w-full">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Deudas Pendientes</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-red-500 text-white px-4 py-1 text-base font-semibold rounded-full shadow-sm">
              Total: {formatCurrency(debts.reduce((sum, debt) => sum + debt.amount, 0))}
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
              {debts
                .slice()
                .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
                .slice(0, 5)
                .map((debt: Debt) => (
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
                            const isSupabaseTransaction = (t: Transaction | Tables<'transactions'>): t is Tables<'transactions'> => {
                              return 'debt_id' in t;
                            };
                            const pagos = transactions
                              .filter(t => t.type === 'payment' && isSupabaseTransaction(t) && t.debt_id === debt.id)
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
                ))}
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
