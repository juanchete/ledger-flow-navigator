import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mockDetailedDebts, mockDetailedReceivables } from '@/data/mockData';
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
  return <div className="flex flex-col md:flex-row gap-6 w-full">
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
              {mockDetailedDebts.map((debt: Debt) => <HoverCard key={debt.id}>
                  <HoverCardTrigger asChild>
                    <div className="flex items-center justify-between py-2 px-3 border-b hover:bg-gray-50 cursor-pointer transition-colors rounded-sm">
                      <div className="flex items-center gap-3">
                        <Badge className={`${getStatusColor(debt.status)} h-2 w-2 p-1 rounded-full`} />
                        <span className="font-medium">{debt.creditor}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        
                        <span className="font-semibold">{formatCurrency(debt.amount)}</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDebtClick(debt)}>
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
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Categoría:</span>
                          <span>{debt.category}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Monto:</span>
                          <span className="font-semibold">{formatCurrency(debt.amount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Fecha de vencimiento:</span>
                          <span>{formatDate(debt.dueDate)}</span>
                        </div>
                        {debt.notes && <div className="mt-2">
                            <span className="text-gray-500">Notas:</span>
                            <p className="text-xs mt-1 text-gray-600">{debt.notes}</p>
                          </div>}
                      </div>
                    </div>
                  </HoverCardContent>
                </HoverCard>)}
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
              {mockDetailedReceivables.map((receivable: Receivable) => <HoverCard key={receivable.id}>
                  <HoverCardTrigger asChild>
                    <div className="flex items-center justify-between py-2 px-3 border-b hover:bg-gray-50 cursor-pointer transition-colors rounded-sm">
                      <div className="flex items-center gap-3">
                        <Badge className={`${getStatusColor(receivable.status)} h-2 w-2 p-1 rounded-full`} />
                        <span className="font-medium">{receivable.description}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        
                        <span className="font-semibold">{formatCurrency(receivable.amount)}</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleReceivableClick(receivable)}>
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
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Cliente ID:</span>
                          <span>{receivable.clientId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Monto:</span>
                          <span className="font-semibold">{formatCurrency(receivable.amount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Fecha de vencimiento:</span>
                          <span>{formatDate(receivable.dueDate)}</span>
                        </div>
                        {receivable.notes && <div className="mt-2">
                            <span className="text-gray-500">Notas:</span>
                            <p className="text-xs mt-1 text-gray-600">{receivable.notes}</p>
                          </div>}
                      </div>
                    </div>
                  </HoverCardContent>
                </HoverCard>)}
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>

      {/* Modal for displaying debt/receivable details */}
      {isModalOpen && selectedDebt && modalType === 'debt' && <DebtDetailsModal isOpen={isModalOpen} onClose={handleCloseModal} item={selectedDebt} type="debt" />}
      {isModalOpen && selectedReceivable && modalType === 'receivable' && <DebtDetailsModal isOpen={isModalOpen} onClose={handleCloseModal} item={selectedReceivable} type="receivable" />}
    </div>;
};