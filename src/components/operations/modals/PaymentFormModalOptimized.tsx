import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2 } from "lucide-react";
import { Icons } from '@/components/Icons';

// Importar los nuevos componentes optimizados
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { ExchangeRateSection } from '@/components/forms/ExchangeRateSection';
import { AmountCurrencySection } from '@/components/forms/AmountCurrencySection';
import { ClientSelectionSection } from '../transaction/ClientSelectionSection';

// Imports existentes
import { createTransaction } from '@/integrations/supabase/transactionService';
import { getBankAccounts, BankAccountApp } from '@/integrations/supabase/bankAccountService';
import { saveExchangeRate } from '@/integrations/supabase/exchangeRateService';
import { useTransactions } from '@/context/TransactionContext';
import type { Transaction } from '@/types';

interface Denomination {
  id: string;
  value: number;
  count: number;
}

interface PaymentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentAdded: (payment: Transaction) => void;
  receivableId?: string;
  debtId?: string;
  defaultClientId?: string;
  maxAmount?: number;
}

export const PaymentFormModalOptimized: React.FC<PaymentFormModalProps> = ({
  isOpen,
  onClose,
  onPaymentAdded,
  receivableId,
  debtId,
  defaultClientId,
  maxAmount
}) => {
  // Estados del formulario
  const [amount, setAmount] = useState('0');
  const [currency, setCurrency] = useState('USD');
  const [method, setMethod] = useState('cash');
  const [reference, setReference] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedClient, setSelectedClient] = useState(defaultClientId || '');
  const [selectedBankAccount, setSelectedBankAccount] = useState('');
  const [loading, setLoading] = useState(false);
  const [denominations, setDenominations] = useState<Denomination[]>([{ id: uuidv4(), value: 0, count: 0 }]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountApp[]>([]);
  
  const { refetchTransactions } = useTransactions();
  
  // Usar el hook optimizado de tasa de cambio
  const exchangeRateHook = useExchangeRate();

  const denominationBasedAmount = useMemo(() => {
    return denominations.reduce((total, den) => total + den.value * den.count, 0);
  }, [denominations]);

  // Cargar cuentas bancarias
  useEffect(() => {
    const fetchAccounts = async () => {
      if (isOpen) {
        try {
          const accounts = await getBankAccounts();
          setBankAccounts(accounts);
        } catch (error) {
          console.error("Failed to fetch bank accounts:", error);
          toast.error("No se pudieron cargar las cuentas bancarias.");
        }
        
        if (defaultClientId) setSelectedClient(defaultClientId);
      }
    };
    fetchAccounts();
  }, [isOpen, defaultClientId]);

  // Actualizar monto cuando se usan denominaciones
  useEffect(() => {
    if ((currency === 'USD' || currency === 'EUR') && method === 'cash') {
      setAmount(denominationBasedAmount.toString());
    }
  }, [denominationBasedAmount, currency, method]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      let exchangeRateId: number | undefined = undefined;
      
      // Guardar tasa de cambio si es VES
      if (currency === 'VES') {
        const finalRate = exchangeRateHook.useCustomRate 
          ? parseFloat(exchangeRateHook.customRate) 
          : exchangeRateHook.exchangeRate;
        const savedRate = await saveExchangeRate({ 
          from_currency: 'USD', 
          to_currency: 'VES_PAY', 
          rate: finalRate, 
          date: date 
        });
        exchangeRateId = savedRate.id;
      }

      const finalAmount = (currency === 'USD' || currency === 'EUR') && method === 'cash' 
        ? denominationBasedAmount 
        : parseFloat(amount);

      // Para VES, guardamos el monto original en bolívares (NO convertir a USD)
      // La conversión se hará en tiempo real para mostrar equivalentes

      const denominationsToSave = (currency === 'USD' || currency === 'EUR') && method === 'cash'
        ? denominations.reduce((acc, den) => {
            if (den.value > 0 && den.count > 0) {
              acc[den.value.toString()] = den.count;
            }
            return acc;
          }, {} as Record<string, number>)
        : undefined;

      // TODO: Subir archivo de comprobante a Supabase Storage si existe
      const receiptUrl: string | undefined = receipt ? undefined : undefined;
      if (receipt) {
        // Aquí se implementará la subida del archivo
        // receiptUrl = await uploadReceipt(receipt);
        console.log('Archivo de comprobante seleccionado:', receipt.name);
      }

      const newTxData: Partial<Transaction> = {
        amount: finalAmount,
        date: new Date(date),
        description: reference || `Pago ${receivableId ? 'para cuenta por cobrar' : 'para deuda'} en ${currency}`,
        type: 'payment',
        clientId: selectedClient || undefined,
        paymentMethod: method,
        status: 'completed',
        currency: currency as Transaction['currency'],
        exchangeRateId: exchangeRateId,
        receivableId: receivableId || undefined,
        debtId: debtId || undefined,
        bankAccountId: selectedBankAccount || undefined,
        receipt: receiptUrl,
        notes: notes || undefined,
        denominations: denominationsToSave,
      };

      const newTx = await createTransaction(newTxData);

      toast.success("Pago registrado exitosamente");
      onPaymentAdded({
        id: newTx.id,
        type: newTx.type as Transaction['type'],
        amount: newTx.amount,
        description: newTx.description,
        date: new Date(newTx.date),
        clientId: newTx.client_id ?? undefined,
        status: newTx.status as Transaction['status'],
        receipt: newTx.receipt ?? undefined,
        invoice: newTx.invoice ?? undefined,
        deliveryNote: newTx.delivery_note ?? undefined,
        paymentMethod: newTx.payment_method ?? undefined,
        bankAccountId: newTx.bank_account_id ?? undefined,
        currency: newTx.currency as Transaction['currency'],
        exchangeRateId: newTx.exchange_rate_id ?? undefined,
        category: newTx.category ?? undefined,
        notes: newTx.notes ?? undefined,
        denominations: newTx.denominations as Record<string, number> | undefined,
        createdAt: new Date(newTx.created_at),
        updatedAt: new Date(newTx.updated_at),
        indirectForClientId: newTx.indirect_for_client_id ?? undefined,
        debtId: newTx.debt_id ?? undefined,
        receivableId: newTx.receivable_id ?? undefined,
        obraId: newTx.obra_id ?? undefined,
      });
      
      refetchTransactions();
      resetForm();
      onClose();
    } catch (error) {
      toast.error("Error al registrar el pago");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setAmount('0');
    setCurrency('USD');
    setMethod('cash');
    setReference('');
    setReceipt(null);
    setNotes('');
    setDate(new Date().toISOString().split('T')[0]);
    setSelectedClient(defaultClientId || '');
    setDenominations([{ id: uuidv4(), value: 0, count: 0 }]);
    setSelectedBankAccount('');
  };

  const handleAddDenomination = () => setDenominations([...denominations, { id: uuidv4(), value: 0, count: 0 }]);
  const handleRemoveDenomination = (id: string) => setDenominations(denominations.filter(d => d.id !== id));
  const handleDenominationChange = (id: string, field: 'value' | 'count', fieldValue: number) => {
    setDenominations(denominations.map(d => d.id === id ? { ...d, [field]: fieldValue } : d));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Registrar Pago</DialogTitle>
          <DialogDescription>
            Rellena los detalles para registrar un nuevo pago.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-1">
              <Label htmlFor="date">Fecha</Label>
              <Input 
                id="date" 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
                disabled={loading} 
              />
            </div>
            <div className="col-span-1">
              <Label htmlFor="method">Método de Pago</Label>
              <Select value={method} onValueChange={setMethod} disabled={loading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Efectivo</SelectItem>
                  <SelectItem value="transfer">Transferencia</SelectItem>
                  <SelectItem value="credit_card">Tarjeta de Crédito</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Componente optimizado para monto y moneda */}
          <AmountCurrencySection
            amount={amount}
            currency={currency}
            exchangeRate={exchangeRateHook.exchangeRate}
            onAmountChange={setAmount}
            onCurrencyChange={setCurrency}
            currencies={[
              { value: 'USD', label: 'USD' },
              { value: 'EUR', label: 'EUR' },
              { value: 'VES', label: 'VES' },
              { value: 'COP', label: 'COP' },
            ]}
          />

          {/* Componente optimizado para tasa de cambio */}
          {currency === 'VES' && (
            <ExchangeRateSection
              exchangeRate={exchangeRateHook.exchangeRate}
              customRate={exchangeRateHook.customRate}
              useCustomRate={exchangeRateHook.useCustomRate}
              isLoadingRate={exchangeRateHook.isLoadingRate}
              isRefreshing={exchangeRateHook.isRefreshing}
              lastUpdated={exchangeRateHook.lastUpdated}
              onCustomRateChange={exchangeRateHook.handleCustomRateChange}
              onUseCustomRateChange={exchangeRateHook.handleUseCustomRateChange}
              onRefreshRate={exchangeRateHook.refreshExchangeRate}
            />
          )}

          {/* Sección de denominaciones para efectivo USD/EUR */}
          {(currency === 'USD' || currency === 'EUR') && method === 'cash' && (
            <div className="col-span-2 mt-4 border-t pt-4">
              <div className="flex justify-between items-center mb-2">
                <Label>Desglose de Billetes</Label>
                <Button type="button" size="sm" variant="outline" onClick={handleAddDenomination} disabled={loading}>
                  <Plus className="h-4 w-4 mr-1" /> Añadir Fila
                </Button>
              </div>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {denominations.map(den => (
                  <div key={den.id} className="grid grid-cols-3 gap-2 items-center">
                    <Input 
                      type="number" 
                      placeholder="Denominación" 
                      value={den.value || ''} 
                      onChange={(e) => handleDenominationChange(den.id, 'value', parseInt(e.target.value) || 0)} 
                      disabled={loading} 
                    />
                    <Input 
                      type="number" 
                      placeholder="Cantidad" 
                      value={den.count || ''} 
                      onChange={(e) => handleDenominationChange(den.id, 'count', parseInt(e.target.value) || 0)} 
                      disabled={loading} 
                    />
                    <Button 
                      type="button" 
                      size="icon" 
                      variant="destructive" 
                      onClick={() => handleRemoveDenomination(den.id)} 
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selección de cuenta bancaria */}
          <div className="grid gap-2">
            <Label htmlFor="bank-account">Depositar en</Label>
            <Select value={selectedBankAccount} onValueChange={setSelectedBankAccount} disabled={loading}>
              <SelectTrigger id="bank-account">
                <SelectValue placeholder="Seleccionar cuenta..." />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts.map(account => (
                  <SelectItem key={account.id} value={account.id.toString()}>
                    <div className="flex flex-col">
                      <span className="font-medium">{account.bankName}</span>
                      <span className="text-xs text-muted-foreground">
                        {account.accountNumber} - {account.currency}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {maxAmount && (
              <p className="text-xs text-muted-foreground">
                Restante: {maxAmount.toFixed(2)}
              </p>
            )}
          </div>

          {/* Selección de cliente */}
          <ClientSelectionSection 
            selectedClient={selectedClient} 
            onClientChange={setSelectedClient} 
          />
          
          {/* Referencia */}
          <div>
            <Label htmlFor="reference">Referencia *</Label>
            <Input 
              id="reference" 
              value={reference} 
              onChange={(e) => setReference(e.target.value)} 
              placeholder="Referencia del pago" 
              disabled={loading}
            />
          </div>

          {/* Comprobante */}
          <div>
            <Label htmlFor="receipt">Comprobante</Label>
            <Input 
              id="receipt" 
              type="file"
              accept="image/*,.pdf,.doc,.docx"
              onChange={(e) => setReceipt(e.target.files?.[0] || null)} 
              disabled={loading}
              className="cursor-pointer"
            />
            {receipt && (
              <p className="text-xs text-muted-foreground mt-1">
                Archivo seleccionado: {receipt.name}
              </p>
            )}
          </div>
          
          {/* Notas */}
          <div>
            <Label htmlFor="notes">Notas</Label>
            <Textarea 
              id="notes" 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              placeholder="Información adicional..." 
              disabled={loading}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? 'Guardando...' : 'Guardar Pago'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 