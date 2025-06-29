import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { getDebts } from '@/integrations/supabase/debtService';
import { getReceivables } from '@/integrations/supabase/receivableService';
import { getClients } from '@/integrations/supabase/clientService';
import { getTransactions } from '@/integrations/supabase/transactionService';
import type { Debt } from '@/integrations/supabase/debtService';
import type { Receivable } from '@/integrations/supabase/receivableService';
import type { Client } from '@/integrations/supabase/clientService';
import type { Transaction } from '@/integrations/supabase/transactionService';

interface PaymentOperationFlowProps {
  onOperationSelect: (operation: {
    type: 'payment';
    relatedId?: string;
    relatedType?: 'debt' | 'receivable';
    clientId?: string;
    paymentType?: string;
    description: string;
  }) => void;
}

interface PendingDebt extends Debt {
  remainingAmount: number;
  clientName?: string;
}

interface PendingReceivable extends Receivable {
  remainingAmount: number;
  clientName?: string;
}

const paymentTypes = [
  { value: 'debt-payment', label: 'Pago de Deuda', icon: '💳', description: 'Pagar una deuda existente' },
  { value: 'receivable-collection', label: 'Cobro de Venta', icon: '💰', description: 'Cobrar una cuenta por cobrar' },
  { value: 'supplier-payment', label: 'Pago a Proveedor', icon: '🏭', description: 'Pago directo a proveedor' },
  { value: 'salary-payment', label: 'Pago de Nómina', icon: '👥', description: 'Pago de salarios y empleados' },
  { value: 'service-payment', label: 'Pago de Servicio', icon: '⚡', description: 'Pago de servicios contratados' },
  { value: 'other-payment', label: 'Otro Pago', icon: '📝', description: 'Otros tipos de pagos' }
];

export const PaymentOperationFlow: React.FC<PaymentOperationFlowProps> = ({ onOperationSelect }) => {
  const [paymentType, setPaymentType] = useState<string>('');
  const [pendingDebts, setPendingDebts] = useState<PendingDebt[]>([]);
  const [pendingReceivables, setPendingReceivables] = useState<PendingReceivable[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPendingItems();
  }, []);

  const loadPendingItems = async () => {
    setLoading(true);
    try {
      const [debtsData, receivablesData, clientsData, transactionsData] = await Promise.all([
        getDebts(),
        getReceivables(),
        getClients(),
        getTransactions()
      ]);

      const transactions = transactionsData.map((t: Transaction) => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        debt_id: t.debt_id,
        receivable_id: t.receivable_id,
        status: t.status
      }));

      // Calcular deudas pendientes
      const debtsWithRemaining = debtsData
        .filter(debt => debt.status === 'pending')
        .map(debt => {
          const payments = transactions.filter(
            t => t.type === 'payment' && t.debt_id === debt.id && t.status === 'completed'
          );
          const totalPaid = payments.reduce((sum, t) => sum + t.amount, 0);
          const remainingAmount = Math.max(0, debt.amount - totalPaid);
          const client = clientsData.find(c => c.id === debt.client_id);
          
          return {
            ...debt,
            remainingAmount,
            clientName: client?.name
          };
        })
        .filter(debt => debt.remainingAmount > 0);

      // Calcular cuentas por cobrar pendientes
      const receivablesWithRemaining = receivablesData
        .filter(receivable => receivable.status === 'pending')
        .map(receivable => {
          const payments = transactions.filter(
            t => t.type === 'payment' && t.receivable_id === receivable.id && t.status === 'completed'
          );
          const totalPaid = payments.reduce((sum, t) => sum + t.amount, 0);
          const remainingAmount = Math.max(0, receivable.amount - totalPaid);
          const client = clientsData.find(c => c.id === receivable.client_id);
          
          return {
            ...receivable,
            remainingAmount,
            clientName: client?.name
          };
        })
        .filter(receivable => receivable.remainingAmount > 0);

      setPendingDebts(debtsWithRemaining);
      setPendingReceivables(receivablesWithRemaining);
      setClients(clientsData);
    } catch (error) {
      console.error('Error loading pending items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentTypeSelect = (type: string) => {
    setPaymentType(type);
    setSelectedItemId('');
  };

  const handleItemSelect = (itemId: string) => {
    setSelectedItemId(itemId);
  };

  const handleConfirm = () => {
    if (!paymentType) return;

    let relatedId: string | undefined;
    let relatedType: 'debt' | 'receivable' | undefined;
    let clientId: string | undefined;
    let description: string;

    const typeInfo = paymentTypes.find(pt => pt.value === paymentType);

    if (paymentType === 'debt-payment' && selectedItemId) {
      relatedId = selectedItemId;
      relatedType = 'debt';
      const debt = pendingDebts.find(d => d.id === selectedItemId);
      clientId = debt?.client_id || undefined;
      description = `Pago de deuda: ${debt?.creditor || 'Deuda'}`;
    } else if (paymentType === 'receivable-collection' && selectedItemId) {
      relatedId = selectedItemId;
      relatedType = 'receivable';
      const receivable = pendingReceivables.find(r => r.id === selectedItemId);
      clientId = receivable?.client_id || undefined;
      description = `Cobro de venta: ${receivable?.description || 'Cuenta por cobrar'}`;
    } else {
      // Pagos directos sin relación a deudas/cuentas por cobrar
      description = typeInfo?.label || 'Pago';
    }

    onOperationSelect({
      type: 'payment',
      relatedId,
      relatedType,
      clientId,
      paymentType,
      description
    });
  };

  if (loading) {
    return <div className="text-center py-4">Cargando opciones...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Paso 1: Tipo de pago */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">¿Qué tipo de pago realizaste?</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {paymentTypes.map((type) => (
            <Button
              key={type.value}
              variant={paymentType === type.value ? 'default' : 'outline'}
              onClick={() => handlePaymentTypeSelect(type.value)}
              className="h-16 text-sm justify-start p-3"
              disabled={
                (type.value === 'debt-payment' && pendingDebts.length === 0) ||
                (type.value === 'receivable-collection' && pendingReceivables.length === 0)
              }
            >
              <div className="flex items-start gap-3 w-full">
                <span className="text-lg">{type.icon}</span>
                <div className="flex flex-col items-start text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{type.label}</span>
                    {type.value === 'debt-payment' && pendingDebts.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {pendingDebts.length}
                      </Badge>
                    )}
                    {type.value === 'receivable-collection' && pendingReceivables.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {pendingReceivables.length}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground line-clamp-2">
                    {type.description}
                  </span>
                </div>
              </div>
            </Button>
          ))}
        </div>
      </div>

      {/* Paso 2: Selección específica para deudas */}
      {paymentType === 'debt-payment' && pendingDebts.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <Label className="text-base font-semibold">Selecciona la deuda a pagar:</Label>
            <Select value={selectedItemId} onValueChange={handleItemSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una deuda pendiente..." />
              </SelectTrigger>
              <SelectContent>
                {pendingDebts.map((debt) => (
                  <SelectItem key={debt.id} value={debt.id}>
                    <div className="flex flex-col">
                      <div className="font-medium">
                        {debt.creditor}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Pendiente: {formatCurrency(debt.remainingAmount)} {debt.currency}
                        <span className="mx-2">•</span>
                        {debt.clientName || 'Sin cliente'}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {/* Paso 2: Selección específica para cuentas por cobrar */}
      {paymentType === 'receivable-collection' && pendingReceivables.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <Label className="text-base font-semibold">Selecciona la venta a cobrar:</Label>
            <Select value={selectedItemId} onValueChange={handleItemSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una cuenta por cobrar..." />
              </SelectTrigger>
              <SelectContent>
                {pendingReceivables.map((receivable) => (
                  <SelectItem key={receivable.id} value={receivable.id}>
                    <div className="flex flex-col">
                      <div className="font-medium">
                        {receivable.clientName || 'Cliente desconocido'} - {receivable.description}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Pendiente: {formatCurrency(receivable.remainingAmount)} {receivable.currency}
                        <span className="mx-2">•</span>
                        Fecha: {new Date(receivable.due_date).toLocaleDateString()}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {/* Botón de confirmación */}
      {paymentType && (
        (paymentType !== 'debt-payment' && paymentType !== 'receivable-collection') ||
        selectedItemId
      ) && (
        <>
          <Separator />
          <div className="flex justify-end">
            <Button onClick={handleConfirm} className="w-full sm:w-auto">
              Continuar con Pago
            </Button>
          </div>
        </>
      )}
    </div>
  );
}; 