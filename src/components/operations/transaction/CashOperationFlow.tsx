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

interface CashOperationFlowProps {
  onOperationSelect: (operation: {
    type: 'sale' | 'purchase' | 'payment' | 'expense';
    relatedId?: string;
    relatedType?: 'debt' | 'receivable';
    clientId?: string;
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

export const CashOperationFlow: React.FC<CashOperationFlowProps> = ({ onOperationSelect }) => {
  const [cashDirection, setCashDirection] = useState<'received' | 'delivered' | null>(null);
  const [operationType, setOperationType] = useState<string>('');
  const [pendingDebts, setPendingDebts] = useState<PendingDebt[]>([]);
  const [pendingReceivables, setPendingReceivables] = useState<PendingReceivable[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Cargar datos cuando se monta el componente
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

      // Calcular deudas pendientes con montos restantes
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

      // Calcular cuentas por cobrar pendientes con montos restantes
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

  const handleCashDirectionSelect = (direction: 'received' | 'delivered') => {
    setCashDirection(direction);
    setOperationType('');
    setSelectedItemId('');
  };

  const handleOperationTypeSelect = (type: string) => {
    setOperationType(type);
    setSelectedItemId('');
  };

  const handleItemSelect = (itemId: string) => {
    setSelectedItemId(itemId);
  };

  const handleConfirm = () => {
    if (!cashDirection || !operationType) return;

    let finalType: 'sale' | 'purchase' | 'payment' | 'expense';
    let relatedId: string | undefined;
    let relatedType: 'debt' | 'receivable' | undefined;
    let clientId: string | undefined;
    let description: string;

    if (operationType === 'new-operation') {
      // Nueva operación
      if (cashDirection === 'received') {
        finalType = 'sale';
        description = 'Venta en efectivo';
      } else {
        finalType = 'purchase';
        description = 'Compra en efectivo';
      }
    } else if (operationType === 'expense') {
      finalType = 'expense';
      description = 'Gasto operativo en efectivo';
    } else if (operationType === 'pay-debt' && selectedItemId) {
      // Pago de deuda existente
      finalType = 'payment';
      relatedId = selectedItemId;
      relatedType = 'debt';
      const debt = pendingDebts.find(d => d.id === selectedItemId);
      clientId = debt?.client_id || undefined;
      description = `Pago de deuda: ${debt?.creditor || 'Deuda'}`;
    } else if (operationType === 'collect-receivable' && selectedItemId) {
      // Cobro de cuenta por cobrar existente
      finalType = 'payment';
      relatedId = selectedItemId;
      relatedType = 'receivable';
      const receivable = pendingReceivables.find(r => r.id === selectedItemId);
      clientId = receivable?.client_id || undefined;
      description = `Cobro de cuenta por cobrar: ${receivable?.description || 'Cuenta por cobrar'}`;
    } else {
      return; // Configuración inválida
    }

    onOperationSelect({
      type: finalType,
      relatedId,
      relatedType,
      clientId,
      description
    });
  };

  if (loading) {
    return <div className="text-center py-4">Cargando opciones...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Paso 1: Dirección del efectivo */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">¿Qué tipo de operación de efectivo realizaste?</Label>
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant={cashDirection === 'received' ? 'default' : 'outline'}
            onClick={() => handleCashDirectionSelect('received')}
            className="h-12 text-sm"
          >
            💰 Recibí Efectivo
          </Button>
          <Button
            variant={cashDirection === 'delivered' ? 'default' : 'outline'}
            onClick={() => handleCashDirectionSelect('delivered')}
            className="h-12 text-sm"
          >
            💸 Entregué Efectivo
          </Button>
        </div>
      </div>

      {/* Paso 2: Tipo de operación según la dirección */}
      {cashDirection && (
        <>
          <Separator />
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              {cashDirection === 'received' ? '¿De dónde viene el efectivo?' : '¿Para qué es el efectivo?'}
            </Label>
            <Select value={operationType} onValueChange={handleOperationTypeSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo de operación" />
              </SelectTrigger>
              <SelectContent>
                {cashDirection === 'received' ? (
                  <>
                    <SelectItem value="new-operation">💼 Venta nueva</SelectItem>
                    <SelectItem value="collect-receivable">📄 Cobro de cuenta por cobrar</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="new-operation">🛒 Compra nueva</SelectItem>
                    <SelectItem value="pay-debt">💳 Pago de deuda</SelectItem>
                    <SelectItem value="expense">💸 Gasto operativo</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {/* Paso 3: Selección específica si aplica */}
      {operationType === 'pay-debt' && pendingDebts.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <Label className="text-base font-semibold">Selecciona la deuda a pagar:</Label>
            <Select value={selectedItemId} onValueChange={handleItemSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar deuda" />
              </SelectTrigger>
              <SelectContent>
                {pendingDebts.map(debt => (
                  <SelectItem key={debt.id} value={debt.id}>
                    <div className="flex justify-between items-center w-full">
                      <span>{debt.creditor}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{debt.clientName || 'Sin cliente'}</Badge>
                        <span className="font-semibold">{formatCurrency(debt.remainingAmount)}</span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {operationType === 'collect-receivable' && pendingReceivables.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <Label className="text-base font-semibold">Selecciona la cuenta por cobrar:</Label>
            <Select value={selectedItemId} onValueChange={handleItemSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar cuenta por cobrar" />
              </SelectTrigger>
              <SelectContent>
                {pendingReceivables.map(receivable => (
                  <SelectItem key={receivable.id} value={receivable.id}>
                    <div className="flex justify-between items-center w-full">
                      <span>{receivable.description || 'Sin descripción'}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{receivable.clientName || 'Sin cliente'}</Badge>
                        <span className="font-semibold">{formatCurrency(receivable.remainingAmount)}</span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {/* Mensajes informativos si no hay datos */}
      {operationType === 'pay-debt' && pendingDebts.length === 0 && (
        <div className="text-center py-4 text-muted-foreground">
          No hay deudas pendientes para pagar
        </div>
      )}

      {operationType === 'collect-receivable' && pendingReceivables.length === 0 && (
        <div className="text-center py-4 text-muted-foreground">
          No hay cuentas por cobrar pendientes
        </div>
      )}

      {/* Botón de confirmación */}
      {cashDirection && operationType && (
        (operationType === 'new-operation' || operationType === 'expense' || 
         (operationType === 'pay-debt' && selectedItemId) ||
         (operationType === 'collect-receivable' && selectedItemId)) && (
          <>
            <Separator />
            <Button onClick={handleConfirm} className="w-full">
              Confirmar Operación de Efectivo
            </Button>
          </>
        )
      )}
    </div>
  );
}; 