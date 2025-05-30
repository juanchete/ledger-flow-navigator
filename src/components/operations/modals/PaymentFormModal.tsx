import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ClientSelectionSection } from '../transaction/ClientSelectionSection';
import { toast } from "sonner";
import { v4 as uuidv4 } from 'uuid';
import { getClients } from '@/integrations/supabase/clientService';
import { createTransaction } from '@/integrations/supabase/transactionService';
import { getBankAccounts } from '@/integrations/supabase/bankAccountService';
import { saveExchangeRate } from '@/integrations/supabase/exchangeRateService';
import { useTransactions } from '@/context/TransactionContext';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { formatCurrency } from '@/lib/utils';
import type { Client } from '@/integrations/supabase/clientService';
import type { BankAccount } from '@/integrations/supabase/bankAccountService';

interface Payment {
  id: string;
  amount: number;
  date: Date;
  method: string;
  clientId?: string;
  clientName?: string;
  clientType?: 'direct' | 'indirect';
  notes?: string;
}

interface PaymentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentAdded: (payment: Payment) => void;
  receivableId?: string; // ID de la cuenta por cobrar para asociar el pago
  debtId?: string; // ID de la deuda para asociar el pago
  defaultClientId?: string; // Cliente predeterminado
  maxAmount?: number; // Monto máximo permitido (monto restante)
}

export const PaymentFormModal: React.FC<PaymentFormModalProps> = ({
  isOpen,
  onClose,
  onPaymentAdded,
  receivableId,
  debtId,
  defaultClientId,
  maxAmount
}) => {
  const [amount, setAmount] = useState(100);
  const [method, setMethod] = useState('credit_card');
  const [notes, setNotes] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedBankAccount, setSelectedBankAccount] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'VES'>('USD');
  const [exchangeRate, setExchangeRate] = useState<number>(0);
  const [useCustomRate, setUseCustomRate] = useState(false);
  const [customRate, setCustomRate] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Usar el contexto de transacciones para actualizar automáticamente la lista
  const { refetchTransactions } = useTransactions();
  const { rates } = useExchangeRates();

  useEffect(() => {
    const fetchData = async () => {
      const [clientsData, bankAccountsData] = await Promise.all([
        getClients(),
        getBankAccounts()
      ]);
      setClients(clientsData);
      setBankAccounts(bankAccountsData);
    };
    fetchData();
  }, []);

  // Establecer cliente predeterminado cuando se proporciona
  useEffect(() => {
    if (defaultClientId && isOpen) {
      setSelectedClient(defaultClientId);
    }
  }, [defaultClientId, isOpen]);

  // Establecer monto máximo cuando se proporciona
  useEffect(() => {
    if (maxAmount && isOpen) {
      setAmount(Math.min(100, maxAmount));
    }
  }, [maxAmount, isOpen]);

  // Cargar tasa de cambio cuando se selecciona VES
  useEffect(() => {
    if (currency === 'VES' && rates) {
      const parallelRate = rates.usd_to_ves_parallel;
      setExchangeRate(parallelRate);
      setCustomRate(parallelRate.toString());
    }
  }, [currency, rates]);

  const handleSubmit = async () => {
    // Validar monto máximo considerando la conversión de moneda
    if (maxAmount) {
      let amountToValidate = amount;
      
      // Si el pago es en VES, convertir a USD para la validación
      if (currency === 'VES') {
        const finalRate = useCustomRate ? parseFloat(customRate) : exchangeRate;
        if (finalRate && finalRate > 0) {
          amountToValidate = amount / finalRate; // Convertir VES a USD
        }
      }
      
      if (amountToValidate > maxAmount) {
        const maxAmountMessage = currency === 'VES' 
          ? `Bs. ${(maxAmount * (useCustomRate ? parseFloat(customRate) : exchangeRate)).toLocaleString('es-VE')} (${formatCurrency(maxAmount)})`
          : formatCurrency(maxAmount);
        toast.error(`El monto no puede exceder ${maxAmountMessage}`);
        return;
      }
    }

    // Validar que se haya seleccionado una cuenta bancaria
    if (!selectedBankAccount) {
      toast.error('Debe seleccionar una cuenta bancaria');
      return;
    }

    // Validar tasa de cambio para pagos en VES
    if (currency === 'VES' && (!exchangeRate || exchangeRate <= 0)) {
      toast.error('Debe establecer una tasa de cambio válida para pagos en VES');
      return;
    }

    setLoading(true);
    const selectedClientData = clients.find(c => c.id === selectedClient);
    
    try {
      let exchangeRateId: number | null = null;
      
      // Si el pago es en VES, guardar la tasa de cambio utilizada
      if (currency === 'VES') {
        const finalRate = useCustomRate ? parseFloat(customRate) : exchangeRate;
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        
        const savedRate = await saveExchangeRate({
          from_currency: 'USD',
          to_currency: 'VES_PAY', // Indicar que es una tasa para pago (máximo 8 caracteres)
          rate: finalRate,
          date: today
        });
        
        exchangeRateId = savedRate.id;
      }

      // Registrar el pago en Supabase
      const newTx = await createTransaction({
        id: uuidv4(),
        amount,
        date: new Date().toISOString(),
        description: notes || `Pago ${receivableId ? 'para cuenta por cobrar' : debtId ? 'para deuda' : ''} en ${currency}`,
        type: 'payment',
        client_id: selectedClient || null,
        payment_method: method,
        status: 'completed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        currency: currency,
        exchange_rate_id: exchangeRateId,
        // Asociar con la cuenta por cobrar o deuda si se proporciona
        receivable_id: receivableId || null,
        debt_id: debtId || null,
        bank_account_id: selectedBankAccount,
        // Otros campos opcionales en null
        category: null,
        indirect_for_client_id: null,
        invoice: null,
        notes,
        receipt: null,
        delivery_note: null,
      });
      
      // Llamar callback con el pago creado (adaptado al tipo Payment)
      onPaymentAdded({
        id: newTx.id,
        amount: newTx.amount,
        date: new Date(newTx.date),
        method: newTx.payment_method || '',
        notes: newTx.notes || '',
        clientId: newTx.client_id || undefined,
        clientName: selectedClientData?.name,
        clientType: selectedClientData?.client_type as 'direct' | 'indirect',
      });
      
      toast.success('Pago registrado exitosamente');
      
      // Actualizar el contexto de transacciones para refrescar automáticamente las listas
      await refetchTransactions();
      
      resetForm();
      onClose();
    } catch (e) {
      console.error('Error al registrar el pago:', e);
      toast.error('Error al registrar el pago');
    }
    setLoading(false);
  };

  const resetForm = () => {
    setAmount(maxAmount ? Math.min(100, maxAmount) : 100);
    setMethod('credit_card');
    setNotes('');
    setSelectedBankAccount('');
    setCurrency('USD');
    setExchangeRate(0);
    setUseCustomRate(false);
    setCustomRate('');
    if (!defaultClientId) {
      setSelectedClient('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        resetForm();
        onClose();
      }
    }}>
      <DialogContent className="max-w-md w-full max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-base sm:text-lg">
            {receivableId ? 'Registrar Pago para Cuenta por Cobrar' : 
             debtId ? 'Registrar Pago para Deuda' : 
             'Registrar Nuevo Pago'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3 sm:space-y-4 pt-2">
          <div className="grid gap-2">
            <Label htmlFor="amount" className="text-sm">Monto</Label>
            <Input 
              id="amount"
              type="number" 
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="text-sm"
            />
            {maxAmount && (
              <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded-md">
                {currency === 'VES' ? (
                  <div className="space-y-1">
                    <div>Monto máximo: Bs. {(maxAmount * (useCustomRate ? parseFloat(customRate) || 1 : exchangeRate || 1)).toLocaleString('es-VE')}</div>
                    <div>Equivalente a: {formatCurrency(maxAmount)}</div>
                  </div>
                ) : (
                  <div>Monto máximo: {formatCurrency(maxAmount)}</div>
                )}
              </div>
            )}
          </div>

          {/* Selector de Moneda */}
          <div className="grid gap-2">
            <Label htmlFor="currency" className="text-sm">Moneda</Label>
            <Select value={currency} onValueChange={(value) => setCurrency(value as 'USD' | 'VES')}>
              <SelectTrigger id="currency" className="text-sm">
                <SelectValue placeholder="Selecciona la moneda" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">Dólares (USD)</SelectItem>
                <SelectItem value="VES">Bolívares (VES)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sección de Tasa de Cambio (solo para VES) */}
          {currency === 'VES' && (
            <div className="grid gap-3 p-3 border rounded-lg bg-muted/10">
              <Label className="text-sm font-medium">Tasa de Cambio (USD/VES)</Label>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="useCustomRatePayment"
                    checked={useCustomRate}
                    onChange={(e) => setUseCustomRate(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="useCustomRatePayment" className="text-sm">
                    Usar tasa personalizada
                  </Label>
                </div>
                
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={useCustomRate ? customRate : exchangeRate.toString()}
                  onChange={(e) => {
                    if (useCustomRate) {
                      setCustomRate(e.target.value);
                    }
                  }}
                  disabled={!useCustomRate}
                  placeholder="Tasa de cambio"
                  className={`text-sm ${!useCustomRate ? "bg-muted" : ""}`}
                />
                
                <div className="text-xs text-muted-foreground">
                  {useCustomRate ? 
                    "Usando tasa personalizada" : 
                    `Tasa paralelo actual: Bs. ${exchangeRate.toFixed(2)}`
                  }
                </div>

                {/* Mostrar equivalente en USD */}
                <div className="text-xs text-blue-600 font-medium p-2 bg-blue-50 rounded-md">
                  Equivalente: ${(amount / (useCustomRate ? parseFloat(customRate) || 1 : exchangeRate)).toFixed(2)} USD
                </div>
              </div>
            </div>
          )}
          
          <div className="grid gap-2">
            <Label htmlFor="method" className="text-sm">Método de Pago</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger id="method" className="text-sm">
                <SelectValue placeholder="Selecciona un método" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="credit_card">Tarjeta de Crédito</SelectItem>
                <SelectItem value="debit_card">Tarjeta de Débito</SelectItem>
                <SelectItem value="cash">Efectivo</SelectItem>
                <SelectItem value="transfer">Transferencia</SelectItem>
                <SelectItem value="check">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="bankAccount" className="text-sm">Cuenta Bancaria *</Label>
            <Select value={selectedBankAccount} onValueChange={setSelectedBankAccount}>
              <SelectTrigger id="bankAccount" className="text-sm">
                <SelectValue placeholder="Selecciona la cuenta donde se depositará" />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    <div className="flex flex-col text-left">
                      <span className="font-medium">{account.bank}</span>
                      <span className="text-xs text-muted-foreground">
                        {account.account_number} - {account.currency === 'USD' 
                          ? `$${account.amount.toLocaleString()}` 
                          : `Bs. ${account.amount.toLocaleString()}`}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              El pago se depositará en la cuenta seleccionada y se actualizará automáticamente el saldo.
            </p>
          </div>
          
          <ClientSelectionSection 
            selectedClient={selectedClient}
            onClientChange={setSelectedClient}
          />
          
          <div className="grid gap-2">
            <Label htmlFor="notes" className="text-sm">Notas</Label>
            <Textarea 
              id="notes" 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Información adicional sobre el pago"
              className="text-sm min-h-[60px] resize-none"
            />
          </div>
        </div>
        
        <DialogFooter className="mt-4 sm:mt-6 gap-2 sm:gap-0 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={loading} 
            className="text-sm w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading} 
            className="text-sm w-full sm:w-auto"
          >
            {loading ? 'Registrando...' : 'Registrar Pago'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
