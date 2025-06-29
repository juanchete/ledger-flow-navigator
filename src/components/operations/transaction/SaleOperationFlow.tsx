import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { getReceivables } from '@/integrations/supabase/receivableService';
import { getClients } from '@/integrations/supabase/clientService';
import { getTransactions } from '@/integrations/supabase/transactionService';
import type { Receivable } from '@/integrations/supabase/receivableService';
import type { Client } from '@/integrations/supabase/clientService';
import type { Transaction } from '@/integrations/supabase/transactionService';

interface SaleOperationFlowProps {
  onOperationSelect: (operation: {
    type: 'sale' | 'payment';
    relatedId?: string;
    relatedType?: 'receivable';
    clientId?: string;
    description: string;
  }) => void;
}

interface PendingReceivable extends Receivable {
  remainingAmount: number;
  clientName?: string;
}

export const SaleOperationFlow: React.FC<SaleOperationFlowProps> = ({ onOperationSelect }) => {
  const [operationType, setOperationType] = useState<string>('');
  const [pendingReceivables, setPendingReceivables] = useState<PendingReceivable[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPendingReceivables();
  }, []);

  const loadPendingReceivables = async () => {
    setLoading(true);
    try {
      const [receivablesData, clientsData, transactionsData] = await Promise.all([
        getReceivables(),
        getClients(),
        getTransactions()
      ]);

      const transactions = transactionsData.map((t: Transaction) => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        receivable_id: t.receivable_id,
        status: t.status
      }));

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

      setPendingReceivables(receivablesWithRemaining);
      setClients(clientsData);
    } catch (error) {
      console.error('Error loading pending receivables:', error);
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

    let finalType: 'sale' | 'payment';
    let relatedId: string | undefined;
    let relatedType: 'receivable' | undefined;
    let clientId: string | undefined;
    let description: string;

    if (operationType === 'new-sale') {
      finalType = 'sale';
      description = 'Nueva venta';
    } else if (operationType === 'collect-receivable' && selectedItemId) {
      finalType = 'payment';
      relatedId = selectedItemId;
      relatedType = 'receivable';
      const receivable = pendingReceivables.find(r => r.id === selectedItemId);
      clientId = receivable?.client_id || undefined;
      description = `Cobro de venta: ${receivable?.description || 'Cuenta por cobrar'}`;
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
      {/* Paso 1: Tipo de operación de venta */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">¿Qué tipo de operación de venta realizaste?</Label>
        <div className="grid grid-cols-1 gap-3">
          <Button
            variant={operationType === 'new-sale' ? 'default' : 'outline'}
            onClick={() => handleOperationTypeSelect('new-sale')}
            className="h-12 text-sm justify-start"
          >
            🆕 Nueva Venta
            <span className="ml-2 text-xs text-muted-foreground">
              Registrar una venta completamente nueva
            </span>
          </Button>
          
          {pendingReceivables.length > 0 && (
            <Button
              variant={operationType === 'collect-receivable' ? 'default' : 'outline'}
              onClick={() => handleOperationTypeSelect('collect-receivable')}
              className="h-12 text-sm justify-start"
            >
              💰 Cobrar Venta Pendiente
              <Badge variant="secondary" className="ml-2">
                {pendingReceivables.length} pendiente{pendingReceivables.length !== 1 ? 's' : ''}
              </Badge>
            </Button>
          )}
        </div>
      </div>

      {/* Paso 2: Selección de cuenta por cobrar específica */}
      {operationType === 'collect-receivable' && pendingReceivables.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <Label className="text-base font-semibold">Selecciona la venta a cobrar:</Label>
            <Select value={selectedItemId} onValueChange={handleItemSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una venta pendiente..." />
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
      {operationType && (operationType === 'new-sale' || selectedItemId) && (
        <>
          <Separator />
          <div className="flex justify-end">
            <Button onClick={handleConfirm} className="w-full sm:w-auto">
              {operationType === 'new-sale' ? 'Continuar con Nueva Venta' : 'Continuar con Cobro'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}; 