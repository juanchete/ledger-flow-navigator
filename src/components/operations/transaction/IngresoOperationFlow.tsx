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

interface IngresoOperationFlowProps {
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

export const IngresoOperationFlow: React.FC<IngresoOperationFlowProps> = ({ onOperationSelect }) => {
  const [operationType, setOperationType] = useState<string>('');
  const [pendingReceivables, setPendingReceivables] = useState<PendingReceivable[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Cargar datos cuando se monta el componente
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
      // Nueva venta
      finalType = 'sale';
      description = 'Venta en efectivo';
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
      {/* Paso 1: Tipo de ingreso */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">💰 ¿Qué tipo de ingreso realizaste?</Label>
        <div className="grid grid-cols-1 gap-3">
          <Button
            variant={operationType === 'new-sale' ? 'default' : 'outline'}
            onClick={() => handleOperationTypeSelect('new-sale')}
            className="h-12 text-sm justify-start"
          >
            <span className="mr-2">🛒</span>
            Nueva Venta
          </Button>
          {pendingReceivables.length > 0 && (
            <Button
              variant={operationType === 'collect-receivable' ? 'default' : 'outline'}
              onClick={() => handleOperationTypeSelect('collect-receivable')}
              className="h-12 text-sm justify-start"
            >
              <span className="mr-2">📥</span>
              Cobrar Cuenta Pendiente ({pendingReceivables.length})
            </Button>
          )}
        </div>
      </div>

      {/* Paso 2: Selección específica para cobro de cuentas por cobrar */}
      {operationType === 'collect-receivable' && pendingReceivables.length > 0 && (
        <div className="space-y-3">
          <Separator />
          <Label className="text-base font-semibold">Selecciona la cuenta por cobrar:</Label>
          <Select value={selectedItemId} onValueChange={handleItemSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar cuenta por cobrar..." />
            </SelectTrigger>
            <SelectContent>
              {pendingReceivables.map((receivable) => (
                <SelectItem key={receivable.id} value={receivable.id}>
                  <div className="flex flex-col py-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{receivable.clientName || 'Cliente'}</span>
                      <Badge variant="outline" className="text-xs">
                        {formatCurrency(receivable.remainingAmount, receivable.currency || 'USD')}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {receivable.description || 'Sin descripción'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Vence: {new Date(receivable.due_date).toLocaleDateString()}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Botón de confirmación */}
      {operationType && (operationType === 'new-sale' || (operationType === 'collect-receivable' && selectedItemId)) && (
        <div className="pt-4">
          <Separator className="mb-4" />
          <Button onClick={handleConfirm} className="w-full h-12">
            ✅ Continuar con {operationType === 'new-sale' ? 'Nueva Venta' : 'Cobro de Cuenta'}
          </Button>
        </div>
      )}
    </div>
  );
}; 