import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { getBankAccounts, BankAccountApp } from '@/integrations/supabase/bankAccountService';
import { saveExchangeRate, useExchangeRates } from '@/integrations/supabase/exchangeRateService';
import { useTransactions } from '@/context/TransactionContext';
import { formatCurrency } from '@/lib/utils';
import type { Client, BankAccount, Transaction } from '@/types';
import { Plus, Trash2 } from "lucide-react";
import { Icons } from '@/components/Icons';
import { validateCashDenominations, formatValidationErrors } from "@/utils/validations";

interface Denomination {
  id: string;
  value: number;
  count: number;
}

interface PaymentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentAdded: (payment: Transaction) => void;
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
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState('cash');
  const [reference, setReference] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedClient, setSelectedClient] = useState(defaultClientId || '');
  const [selectedBankAccount, setSelectedBankAccount] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'EUR' | 'VES' | 'COP'>('USD');
  const [exchangeRate, setExchangeRate] = useState<number>(0);
  const [useCustomRate, setUseCustomRate] = useState(true);
  const [customRate, setCustomRate] = useState('');
  const [loading, setLoading] = useState(false);
  const [denominations, setDenominations] = useState<Denomination[]>([{ id: uuidv4(), value: 0, count: 0 }]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountApp[]>([]);
  
  const { refetchTransactions } = useTransactions();
  const { rates } = useExchangeRates();

  const denominationBasedAmount = useMemo(() => {
    return denominations.reduce((total, den) => total + den.value * den.count, 0);
  }, [denominations]);

  useEffect(() => {
    async function fetchAccounts() {
      try {
        const accounts = await getBankAccounts();
        setBankAccounts(accounts);
      } catch (error) {
        console.error("Failed to fetch bank accounts:", error);
        toast.error("No se pudieron cargar las cuentas bancarias.");
      }
    }
    if (isOpen) {
      fetchAccounts();
      if(defaultClientId) setSelectedClient(defaultClientId);
    }
  }, [isOpen, defaultClientId]);

  useEffect(() => {
    if (currency === 'VES' && rates.parallel) {
      setExchangeRate(rates.parallel);
    }
  }, [currency, rates]);

  useEffect(() => {
    if ((currency === 'USD' || currency === 'EUR') && method === 'cash') {
      setAmount(denominationBasedAmount);
    }
  }, [denominationBasedAmount, currency, method]);

  const handleSubmit = async () => {
    // Validaciones básicas
    if (!amount || amount <= 0) {
      toast.error("Por favor ingrese un monto válido mayor a 0");
      return;
    }

    if (!reference) {
      toast.error("Por favor ingrese una referencia");
      return;
    }

    // Validación de denominaciones para efectivo en USD/EUR
    const denominationValidation = validateCashDenominations(
      denominations,
      amount,
      currency,
      method
    );
    
    if (!denominationValidation.isValid) {
      toast.error(formatValidationErrors(denominationValidation.errors));
      return;
    }

    setLoading(true);
    try {
      let exchangeRateId: number | undefined = undefined;
      if (currency === 'VES') {
        const finalRate = useCustomRate ? parseFloat(customRate) : exchangeRate;
        const savedRate = await saveExchangeRate({ from_currency: 'USD', to_currency: 'VES_PAY', rate: finalRate, date: date });
        exchangeRateId = savedRate.id;
      }

      const finalAmount = (currency === 'USD' || currency === 'EUR') && method === 'cash' ? denominationBasedAmount : amount;

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
        currency: currency,
        exchangeRateId: exchangeRateId,
        receivableId: receivableId || undefined,
        debtId: debtId || undefined,
        bankAccountId: selectedBankAccount || undefined,
        receipt: receiptUrl,
        notes: notes || undefined,
        denominations: denominationsToSave,
      };

      console.log("newTxData a enviar:", newTxData);

      const newTx = await createTransaction(newTxData);

      toast.success("Pago registrado exitosamente", newTx);
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
    setAmount(0);
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
                    <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={loading} />
                </div>
                <div className="col-span-1">
                    <Label htmlFor="currency">Moneda</Label>
                    <Select value={currency} onValueChange={(value) => setCurrency(value as 'USD' | 'EUR' | 'VES' | 'COP')} disabled={loading}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                            <SelectItem value="VES">VES</SelectItem>
                            <SelectItem value="COP">COP</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                 <div className="col-span-1">
                    <Label htmlFor="amount">Monto</Label>
                    <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} disabled={loading || ((currency === 'USD' || currency === 'EUR') && method === 'cash')} />
                    {maxAmount && <p className="text-xs text-muted-foreground mt-1">Restante: {maxAmount.toFixed(2)}</p>}
                </div>
                 <div className="col-span-1">
                    <Label htmlFor="method">Método de Pago</Label>
                    <Select value={method} onValueChange={setMethod} disabled={loading}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="cash">Efectivo</SelectItem>
                            <SelectItem value="transfer">Transferencia</SelectItem>
                            <SelectItem value="credit_card">Tarjeta de Crédito</SelectItem>
                            <SelectItem value="other">Otro</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {(currency === 'USD' || currency === 'EUR') && method === 'cash' && (
            <div className="col-span-2 mt-4 border-t pt-4">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <Label>Desglose de Billetes - {currency} *</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Especifica las denominaciones de billetes recibidos
                  </p>
                  <p className="text-xs text-orange-600 font-medium mt-1">
                    ⚠️ Obligatorio para pagos en efectivo con {currency}
                  </p>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={handleAddDenomination} disabled={loading}>
                  <Plus className="h-4 w-4 mr-1" /> Añadir Fila
                </Button>
              </div>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {denominations.map(den => (
                  <div key={den.id} className="grid grid-cols-3 gap-2 items-center">
                    <Input type="number" placeholder="Denominación *" value={den.value || ''} onChange={(e) => handleDenominationChange(den.id, 'value', parseInt(e.target.value) || 0)} disabled={loading} className="border-orange-200 focus:border-orange-400" required />
                    <Input type="number" placeholder="Cantidad *" value={den.count || ''} onChange={(e) => handleDenominationChange(den.id, 'count', parseInt(e.target.value) || 0)} disabled={loading} className="border-orange-200 focus:border-orange-400" required />
                    <Button type="button" size="icon" variant="destructive" onClick={() => handleRemoveDenomination(den.id)} disabled={loading}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              
              {/* Indicador visual de validación de denominaciones */}
              {denominationBasedAmount > 0 && amount > 0 && (
                <div className={`mt-3 p-2 rounded-lg border text-sm ${
                  Math.abs(denominationBasedAmount - amount) < 0.01
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  {Math.abs(denominationBasedAmount - amount) < 0.01 ? (
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">✅</span>
                      <span>Las denominaciones coinciden con el monto del pago</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-red-600">❌</span>
                      <span>
                        Discrepancia: Denominaciones = {currency} {denominationBasedAmount.toFixed(2)}, 
                        Monto del pago = {currency} {amount.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="bank-account">Depositar en</Label>
            <Select value={selectedBankAccount} onValueChange={setSelectedBankAccount} disabled={loading}>
                <SelectTrigger id="bank-account"><SelectValue placeholder="Seleccionar cuenta..." /></SelectTrigger>
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
           </div>


          <ClientSelectionSection selectedClient={selectedClient} onClientChange={setSelectedClient} />
          
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
          
          <div>
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Información adicional..." disabled={loading}/>
          </div>
        </div>
        <DialogFooter>
            <Button variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Guardando...' : 'Guardar Pago'}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
