import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { getDebts } from '@/integrations/supabase/debtService';
import { getClients } from '@/integrations/supabase/clientService';
import { getTransactions } from '@/integrations/supabase/transactionService';
import type { Debt } from '@/integrations/supabase/debtService';
import type { Client } from '@/integrations/supabase/clientService';
import type { Transaction } from '@/integrations/supabase/transactionService';

interface PurchaseOperationFlowProps {
  onOperationSelect: (operation: {
    type: 'purchase' | 'payment';
    relatedId?: string;
    relatedType?: 'debt';
    clientId?: string;
    description: string;
  }) => void;
}

interface PendingDebt extends Debt {
  remainingAmount: number;
  clientName?: string;
}

export const PurchaseOperationFlow: React.FC<PurchaseOperationFlowProps> = ({ onOperationSelect }) => {
  const [operationType, setOperationType] = useState<string>('');
  const [pendingDebts, setPendingDebts] = useState<PendingDebt[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPendingDebts();
  }, []);

  const loadPendingDebts = async () => {
    setLoading(true);
    try {
      const [debtsData, clientsData, transactionsData] = await Promise.all([
        getDebts(),
        getClients(),
        getTransactions()
      ]);

      const transactions = transactionsData.map((t: Transaction) => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        debt_id: t.debt_id,
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

      setPendingDebts(debtsWithRemaining);
      setClients(clientsData);
    } catch (error) {
      console.error('Error loading pending debts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOperationTypeSelect = (type: string) => {
    setOperationType(type);
    setSelectedItemId('');
  };

  const handleItemSelect = (itemId: string) => {
    setSelectedItemId(itemId);
  };

  const handleConfirm = () => {
    if (!operationType) return;

    let finalType: 'purchase' | 'payment';
    let relatedId: string | undefined;
    let relatedType: 'debt' | undefined;
    let clientId: string | undefined;
    let description: string;

    if (operationType === 'new-purchase') {
      finalType = 'purchase';
      description = 'Nueva compra';
    } else if (operationType === 'pay-debt' && selectedItemId) {
      finalType = 'payment';
      relatedId = selectedItemId;
      relatedType = 'debt';
      const debt = pendingDebts.find(d => d.id === selectedItemId);
      clientId = debt?.client_id || undefined;
      description = `Pago de compra: ${debt?.creditor || 'Deuda'}`;
    } else {
      return;
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
      {/* Paso 1: Tipo de operación de compra */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">¿Qué tipo de operación de compra realizaste?</Label>
        <div className="grid grid-cols-1 gap-3">
          <Button
            variant={operationType === 'new-purchase' ? 'default' : 'outline'}
            onClick={() => handleOperationTypeSelect('new-purchase')}
            className="h-12 text-sm justify-start"
          >
            🛒 Nueva Compra
            <span className="ml-2 text-xs text-muted-foreground">
              Registrar una compra completamente nueva
            </span>
          </Button>
          
          {pendingDebts.length > 0 && (
            <Button
              variant={operationType === 'pay-debt' ? 'default' : 'outline'}
              onClick={() => handleOperationTypeSelect('pay-debt')}
              className="h-12 text-sm justify-start"
            >
              💳 Pagar Compra Pendiente
              <Badge variant="secondary" className="ml-2">
                {pendingDebts.length} pendiente{pendingDebts.length !== 1 ? 's' : ''}
              </Badge>
            </Button>
          )}
        </div>
      </div>

      {/* Paso 2: Selección de deuda específica */}
      {operationType === 'pay-debt' && pendingDebts.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <Label className="text-base font-semibold">Selecciona la compra a pagar:</Label>
            <Select value={selectedItemId} onValueChange={handleItemSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una compra pendiente..." />
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
                        Fecha límite: {new Date(debt.due_date).toLocaleDateString()}
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
      {operationType && (operationType === 'new-purchase' || selectedItemId) && (
        <>
          <Separator />
          <div className="flex justify-end">
            <Button onClick={handleConfirm} className="w-full sm:w-auto">
              {operationType === 'new-purchase' ? 'Continuar con Nueva Compra' : 'Continuar con Pago'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}; 