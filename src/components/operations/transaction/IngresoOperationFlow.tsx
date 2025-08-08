import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
    type: 'ingreso';
    description: string;
    category?: string;
    relatedId?: string;
    relatedType?: 'receivable';
    clientId?: string;
  }) => void;
}

interface PendingReceivable extends Receivable {
  remainingAmount: number;
  clientName?: string;
}

export const IngresoOperationFlow: React.FC<IngresoOperationFlowProps> = ({ onOperationSelect }) => {
  const [ingresoType, setIngresoType] = useState<string>('');
  const [pendingReceivables, setPendingReceivables] = useState<PendingReceivable[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Cargar las cuentas por cobrar al montar el componente
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

      console.log('Receivables data:', receivablesData);
      console.log('Transactions data:', transactionsData);

      const transactions = transactionsData.map((t: Transaction) => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        receivable_id: t.receivable_id,
        status: t.status
      }));

      // Calcular cuentas por cobrar pendientes
      // Solo incluir las que tienen estado 'pending' o 'active' y NO están en 'paid' o 'cancelled'
      const receivablesWithRemaining = receivablesData
        .filter(receivable => {
          // Filtrar por estados activos
          const activeStatuses = ['pending', 'active'];
          const inactiveStatuses = ['paid', 'cancelled', 'completed'];
          
          // Si el estado está en la lista de inactivos, no incluir
          if (inactiveStatuses.includes(receivable.status)) {
            console.log(`Receivable ${receivable.id} excluded - status: ${receivable.status}`);
            return false;
          }
          
          // Si no tiene estado o está en estados activos, incluir para calcular
          return !receivable.status || activeStatuses.includes(receivable.status);
        })
        .map(receivable => {
          const collections = transactions.filter(
            t => t.type === 'ingreso' && t.receivable_id === receivable.id && t.status === 'completed'
          );
          const totalCollected = collections.reduce((sum, t) => sum + t.amount, 0);
          const remainingAmount = Math.max(0, receivable.amount - totalCollected);
          const client = clientsData.find(c => c.id === receivable.client_id);
          
          console.log(`Receivable ${receivable.id}: amount=${receivable.amount}, collected=${totalCollected}, remaining=${remainingAmount}`);
          
          return {
            ...receivable,
            remainingAmount,
            clientName: client?.name
          };
        })
        .filter(receivable => receivable.remainingAmount > 0);

      console.log('Pending receivables:', receivablesWithRemaining);
      setPendingReceivables(receivablesWithRemaining);
      setClients(clientsData);
    } catch (error) {
      console.error('Error loading pending receivables:', error);
    } finally {
      setLoading(false);
    }
  };

  const ingresoTypes = [
    { value: 'receivable-collection', label: 'Cobro de Cuenta', icon: '💳', description: 'Cobrar una cuenta por cobrar existente' },
    { value: 'transfer', label: 'Transferencia Recibida', icon: '💸', description: 'Dinero recibido por transferencia' },
    { value: 'deposit', label: 'Depósito Directo', icon: '🏦', description: 'Depósito en cuenta bancaria' },
    { value: 'refund', label: 'Reembolso', icon: '💵', description: 'Devolución de dinero' },
    { value: 'interest', label: 'Intereses Ganados', icon: '📈', description: 'Intereses de inversiones o cuentas' },
    { value: 'gift', label: 'Regalo o Donación', icon: '🎁', description: 'Dinero recibido como regalo' },
    { value: 'other', label: 'Otro Ingreso', icon: '💰', description: 'Otros tipos de ingresos' }
  ];

  const handleIngresoTypeSelect = (type: string) => {
    setIngresoType(type);
    setSelectedItemId('');
  };

  const handleItemSelect = (itemId: string) => {
    setSelectedItemId(itemId);
  };

  const handleConfirm = () => {
    if (!ingresoType) return;

    let relatedId: string | undefined;
    let relatedType: 'receivable' | undefined;
    let clientId: string | undefined;
    let description: string;

    const typeInfo = ingresoTypes.find(it => it.value === ingresoType);

    if (ingresoType === 'receivable-collection' && selectedItemId) {
      relatedId = selectedItemId;
      relatedType = 'receivable';
      const receivable = pendingReceivables.find(r => r.id === selectedItemId);
      clientId = receivable?.client_id || undefined;
      description = `Cobro de cuenta: ${receivable?.description || 'Cuenta por cobrar'}`;
    } else {
      // Ingresos directos sin relación a cuentas por cobrar
      description = typeInfo?.label || 'Ingreso';
    }

    onOperationSelect({
      type: 'ingreso',
      description,
      category: ingresoType,
      relatedId,
      relatedType,
      clientId
    });
  };

  if (loading) {
    return <div className="text-center py-4">Cargando opciones...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Paso 1: Tipo de ingreso */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">¿Qué tipo de ingreso recibiste?</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ingresoTypes.map((type) => (
            <Button
              key={type.value}
              variant={ingresoType === type.value ? 'default' : 'outline'}
              onClick={() => handleIngresoTypeSelect(type.value)}
              className="h-16 text-sm justify-start p-3"
              disabled={
                type.value === 'receivable-collection' && pendingReceivables.length === 0
              }
            >
              <div className="flex items-start gap-3 w-full">
                <span className="text-lg">{type.icon}</span>
                <div className="flex flex-col items-start text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{type.label}</span>
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

      {/* Paso 2: Selección específica para cuentas por cobrar */}
      {ingresoType === 'receivable-collection' && pendingReceivables.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <Label className="text-base font-semibold">Selecciona la cuenta a cobrar:</Label>
            <Select value={selectedItemId} onValueChange={handleItemSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una cuenta por cobrar pendiente..." />
              </SelectTrigger>
              <SelectContent>
                {pendingReceivables.map((receivable) => (
                  <SelectItem key={receivable.id} value={receivable.id}>
                    <div className="flex flex-col">
                      <div className="font-medium">
                        {receivable.description}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Pendiente: {formatCurrency(receivable.remainingAmount)} {receivable.currency}
                        <span className="mx-2">•</span>
                        {receivable.clientName || 'Sin cliente'}
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
      {ingresoType && (
        ingresoType !== 'receivable-collection' || selectedItemId
      ) && (
        <>
          <Separator />
          <div className="flex justify-end">
            <Button onClick={handleConfirm} className="w-full sm:w-auto">
              Continuar con Ingreso
            </Button>
          </div>
        </>
      )}
    </div>
  );
};