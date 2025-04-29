import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockDetailedDebts, mockDetailedReceivables } from '@/data/mockData';
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
  return (
    <div className="flex flex-col md:flex-row gap-6 w-full">
      {/* Deudas */}
      <Card className="h-full w-full md:w-1/2">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Deudas Pendientes</CardTitle>
          </div>
          <Badge className="bg-red-500 text-white px-4 py-1 text-base font-semibold rounded-full shadow-sm">
            Total: {formatCurrency(mockDetailedDebts.reduce((sum, debt) => sum + debt.amount, 0))}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {mockDetailedDebts.map((debt: Debt) => (
            <div key={debt.id} className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex flex-col gap-1 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-base">{debt.creditor}</span>
                  <span className="block text-xs text-gray-500">{debt.category}</span>
                </div>
                <Badge className={`ml-2 h-6 px-2 text-xs font-semibold rounded ${getStatusColor(debt.status)}`}>{debt.status}</Badge>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-lg font-bold">{formatCurrency(debt.amount)}</span>
                <span className="text-xs text-gray-500">Vence: {formatDate(debt.dueDate)}</span>
              </div>
              <span className="text-xs text-gray-600 mt-1">{debt.notes}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Cuentas por Cobrar */}
      <Card className="h-full w-full md:w-1/2">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Cuentas por Cobrar</CardTitle>
          </div>
          <Badge className="bg-green-500 text-white px-4 py-1 text-base font-semibold rounded-full shadow-sm">
            Total: {formatCurrency(mockDetailedReceivables.reduce((sum, rec) => sum + rec.amount, 0))}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {mockDetailedReceivables.map((receivable: Receivable) => (
            <div key={receivable.id} className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex flex-col gap-1 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-base">{receivable.description}</span>
                  <span className="block text-xs text-gray-500">Cliente ID: {receivable.clientId}</span>
                </div>
                <Badge className={`ml-2 h-6 px-2 text-xs font-semibold rounded ${getStatusColor(receivable.status)}`}>{receivable.status}</Badge>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-lg font-bold">{formatCurrency(receivable.amount)}</span>
                <span className="text-xs text-gray-500">Vence: {formatDate(receivable.dueDate)}</span>
              </div>
              <span className="text-xs text-gray-600 mt-1">{receivable.notes}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}; 