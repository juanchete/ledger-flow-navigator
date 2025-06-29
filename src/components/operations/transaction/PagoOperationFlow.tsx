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

interface PagoOperationFlowProps {
  onOperationSelect: (operation: {
    type: 'purchase' | 'payment' | 'expense';
    relatedId?: string;
    relatedType?: 'debt';
    clientId?: string;
    description: string;
    category?: string;
  }) => void;
}

interface PendingDebt extends Debt {
  remainingAmount: number;
  clientName?: string;
}

const expenseCategories = [
  { id: 'operacional', name: 'Gasto Operacional', icon: '💼' },
  { id: 'transporte', name: 'Transporte', icon: '🚗' },
  { id: 'servicios', name: 'Servicios Públicos', icon: '💡' },
  { id: 'alimentacion', name: 'Alimentación', icon: '🍽️' },
  { id: 'mantenimiento', name: 'Mantenimiento', icon: '🔧' },
  { id: 'suministros', name: 'Suministros de Oficina', icon: '📎' },
  { id: 'marketing', name: 'Marketing y Publicidad', icon: '📢' },
  { id: 'tecnologia', name: 'Tecnología', icon: '💻' },
  { id: 'otros', name: 'Otros Gastos', icon: '📝' }
];

export const PagoOperationFlow: React.FC<PagoOperationFlowProps> = ({ onOperationSelect }) => {
  const [operationType, setOperationType] = useState<string>('');
  const [pendingDebts, setPendingDebts] = useState<PendingDebt[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Cargar datos cuando se monta el componente
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
    setSelectedCategory('');
  };

  const handleItemSelect = (itemId: string) => {
    setSelectedItemId(itemId);
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
  };

  const handleConfirm = () => {
    if (!operationType) return;

    let finalType: 'purchase' | 'payment' | 'expense';
    let relatedId: string | undefined;
    let relatedType: 'debt' | undefined;
    let clientId: string | undefined;
    let description: string;
    let category: string | undefined;

    if (operationType === 'new-purchase') {
      // Nueva compra
      finalType = 'purchase';
      description = 'Compra en efectivo';
    } else if (operationType === 'pay-debt' && selectedItemId) {
      // Pago de deuda existente
      finalType = 'payment';
      relatedId = selectedItemId;
      relatedType = 'debt';
      const debt = pendingDebts.find(d => d.id === selectedItemId);
      clientId = debt?.client_id || undefined;
      description = `Pago de deuda: ${debt?.creditor || 'Deuda'}`;
    } else if (operationType === 'expense' && selectedCategory) {
      // Gasto operativo
      finalType = 'expense';
      category = selectedCategory;
      const categoryInfo = expenseCategories.find(c => c.id === selectedCategory);
      description = `Gasto: ${categoryInfo?.name || 'Gasto operativo'}`;
    } else {
      return; // Configuración inválida
    }

    onOperationSelect({
      type: finalType,
      relatedId,
      relatedType,
      clientId,
      description,
      category
    });
  };

  if (loading) {
    return <div className="text-center py-4">Cargando opciones...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Paso 1: Tipo de pago */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">💸 ¿Qué tipo de pago realizaste?</Label>
        <div className="grid grid-cols-1 gap-3">
          <Button
            variant={operationType === 'new-purchase' ? 'default' : 'outline'}
            onClick={() => handleOperationTypeSelect('new-purchase')}
            className="h-12 text-sm justify-start"
          >
            <span className="mr-2">🛍️</span>
            Nueva Compra
          </Button>
          {pendingDebts.length > 0 && (
            <Button
              variant={operationType === 'pay-debt' ? 'default' : 'outline'}
              onClick={() => handleOperationTypeSelect('pay-debt')}
              className="h-12 text-sm justify-start"
            >
              <span className="mr-2">💳</span>
              Pagar Deuda Pendiente ({pendingDebts.length})
            </Button>
          )}
          <Button
            variant={operationType === 'expense' ? 'default' : 'outline'}
            onClick={() => handleOperationTypeSelect('expense')}
            className="h-12 text-sm justify-start"
          >
            <span className="mr-2">📋</span>
            Gasto Operativo
          </Button>
        </div>
      </div>

      {/* Paso 2: Selección específica para pago de deudas */}
      {operationType === 'pay-debt' && pendingDebts.length > 0 && (
        <div className="space-y-3">
          <Separator />
          <Label className="text-base font-semibold">Selecciona la deuda a pagar:</Label>
          <Select value={selectedItemId} onValueChange={handleItemSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar deuda..." />
            </SelectTrigger>
            <SelectContent>
              {pendingDebts.map((debt) => (
                <SelectItem key={debt.id} value={debt.id}>
                  <div className="flex flex-col py-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{debt.creditor}</span>
                      <Badge variant="outline" className="text-xs">
                        {formatCurrency(debt.remainingAmount, debt.currency || 'USD')}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {debt.clientName && `Cliente: ${debt.clientName}`}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Vence: {new Date(debt.due_date).toLocaleDateString()}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Paso 2: Selección de categoría para gastos */}
      {operationType === 'expense' && (
        <div className="space-y-3">
          <Separator />
          <Label className="text-base font-semibold">Selecciona la categoría del gasto:</Label>
          <div className="grid grid-cols-2 gap-2">
            {expenseCategories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'default' : 'outline'}
                onClick={() => handleCategorySelect(category.id)}
                className="h-12 text-xs justify-start p-2"
              >
                <span className="mr-2">{category.icon}</span>
                <span className="truncate">{category.name}</span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Botón de confirmación */}
      {operationType && (
        operationType === 'new-purchase' || 
        (operationType === 'pay-debt' && selectedItemId) ||
        (operationType === 'expense' && selectedCategory)
      ) && (
        <div className="pt-4">
          <Separator className="mb-4" />
          <Button onClick={handleConfirm} className="w-full h-12">
            ✅ Continuar con {
              operationType === 'new-purchase' ? 'Nueva Compra' :
              operationType === 'pay-debt' ? 'Pago de Deuda' :
              'Gasto Operativo'
            }
          </Button>
        </div>
      )}
    </div>
  );
}; 