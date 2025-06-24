import React, { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { toast } from "@/components/ui/use-toast";
import { Plus, Trash2 } from "lucide-react";
import { Icons } from '@/components/Icons';

// Componentes optimizados
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { ExchangeRateSection } from '@/components/forms/ExchangeRateSection';
import { AmountCurrencySection } from '@/components/forms/AmountCurrencySection';
import { ClientSelectionSection } from "./transaction/ClientSelectionSection";
import { getBankAccounts, BankAccountApp } from "@/integrations/supabase/bankAccountService";
import { useTransactions } from "@/context/TransactionContext";
import type { Transaction } from "@/types";

interface Denomination {
  id: string;
  value: number;
  count: number;
}

interface TransactionFormProps {
  onSuccess?: () => void;
  showCancelButton?: boolean;
}

export const TransactionFormOptimized: React.FC<TransactionFormProps> = ({
  onSuccess,
  showCancelButton = false,
}) => {
  const navigate = useNavigate();
  const { addTransaction } = useTransactions();

  // Estados del formulario organizados como en PaymentFormModalOptimized
  const [transactionType, setTransactionType] = useState<Transaction["type"]>("sale");
  const [amount, setAmount] = useState('0');
  const [currency, setCurrency] = useState('USD');
  const [method, setMethod] = useState('cash');
  const [reference, setReference] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedBankAccount, setSelectedBankAccount] = useState('');
  const [denominations, setDenominations] = useState<Denomination[]>([{ id: uuidv4(), value: 0, count: 0 }]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountApp[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Estados específicos para balance-change
  const [bankCommission, setBankCommission] = useState('0');
  const [transferCount, setTransferCount] = useState('1');
  const [destinationBankAccount, setDestinationBankAccount] = useState('');

  // Hook para manejo de tasa de cambio
  const exchangeRateHook = useExchangeRate();

  // Calcular monto basado en denominaciones
  const denominationBasedAmount = useMemo(() => {
    return denominations.reduce((total, den) => total + den.value * den.count, 0);
  }, [denominations]);

  // Cargar datos iniciales
  useEffect(() => {
    const loadData = async () => {
      setIsLoadingData(true);
      try {
        const data = await getBankAccounts();
        setBankAccounts(data);
      } catch (error) {
        console.error("Error loading bank accounts:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar las cuentas bancarias",
          variant: "destructive",
        });
      } finally {
        setIsLoadingData(false);
      }
    };
    loadData();
  }, []);

  // Actualizar monto cuando se usan denominaciones
  useEffect(() => {
    if ((currency === 'USD' || currency === 'EUR') && method === 'cash') {
      setAmount(denominationBasedAmount.toString());
    }
  }, [denominationBasedAmount, currency, method]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Validaciones básicas
    if (!transactionType || !amount || !reference) {
      toast({
        title: "Error en el formulario",
        description: "Por favor complete todos los campos obligatorios.",
        variant: "destructive",
      });
      return;
    }

    // Validación específica para balance-change
    if (transactionType === 'balance-change') {
      if (!selectedBankAccount || !destinationBankAccount) {
        toast({
          title: "Error en cambio de saldo",
          description: "Por favor seleccione tanto la cuenta origen como la cuenta destino.",
          variant: "destructive",
        });
        return;
      }
      
      if (selectedBankAccount === destinationBankAccount) {
        toast({
          title: "Error en cambio de saldo",
          description: "La cuenta origen y destino deben ser diferentes.",
          variant: "destructive",
        });
        return;
      }
    }

    const finalAmount = (currency === 'USD' || currency === 'EUR') && method === 'cash' 
      ? denominationBasedAmount 
      : parseFloat(amount);

    if (isNaN(finalAmount) || finalAmount <= 0) {
      toast({
        title: "Monto inválido",
        description: "Por favor ingrese un monto válido mayor que cero.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const now = new Date().toISOString();
      
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
      
      const newTransaction = {
        id: uuidv4(),
        type: transactionType as Transaction['type'],
        amount: finalAmount,
        description: reference,
        date: now,
        status: "completed" as const,
        category: category || undefined,
        notes: notes || undefined,
        payment_method: method || undefined,
        client_id: selectedClient || undefined,
        created_at: now,
        updated_at: now,
        bank_account_id: selectedBankAccount || undefined,
        currency: currency as Transaction['currency'],
        receipt: receiptUrl,
        denominations: denominationsToSave,
        // Campos específicos para balance-change
        bank_commission: transactionType === 'balance-change' ? parseFloat(bankCommission) || 0 : undefined,
        transfer_count: transactionType === 'balance-change' ? parseInt(transferCount) || 1 : undefined,
        destination_bank_account_id: transactionType === 'balance-change' ? destinationBankAccount || undefined : undefined,
      };

      const result = await addTransaction(newTransaction);
      
      if (result) {
        toast({
          title: "¡Éxito!",
          description: "La transacción se ha creado correctamente.",
        });
        
        resetForm();
        if (onSuccess) {
          onSuccess();
        } else {
          navigate(`/operations/transaction/${result.id}`);
        }
      } else {
        throw new Error("No se pudo crear la transacción");
      }
    } catch (error) {
      console.error("Error al crear la transacción:", error);
      toast({
        title: "Error",
        description: "Ha ocurrido un error al guardar la transacción.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTransactionType("sale");
    setAmount('0');
    setCurrency('USD');
    setMethod('cash');
    setReference('');
    setReceipt(null);
    setCategory('');
    setNotes('');
    setDate(new Date().toISOString().split('T')[0]);
    setSelectedClient('');
    setSelectedBankAccount('');
    setDenominations([{ id: uuidv4(), value: 0, count: 0 }]);
    
    // Reset campos específicos de balance-change
    setBankCommission('0');
    setTransferCount('1');
    setDestinationBankAccount('');
  };

  // Funciones para manejo de denominaciones
  const handleAddDenomination = () => setDenominations([...denominations, { id: uuidv4(), value: 0, count: 0 }]);
  const handleRemoveDenomination = (id: string) => setDenominations(denominations.filter(d => d.id !== id));
  const handleDenominationChange = (id: string, field: 'value' | 'count', fieldValue: number) => {
    setDenominations(denominations.map(d => d.id === id ? { ...d, [field]: fieldValue } : d));
  };

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Cargando formulario...</div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 py-4">
      
      {/* Primera fila: Fecha y Tipo de Transacción */}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-1">
          <Label htmlFor="date">Fecha</Label>
          <Input 
            id="date" 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)} 
            disabled={loading}
            className="h-10 sm:h-11"
          />
        </div>
        <div className="col-span-1">
          <Label htmlFor="transaction-type">Tipo de Transacción</Label>
          <Select value={transactionType} onValueChange={(value) => setTransactionType(value as Transaction["type"])} disabled={loading}>
            <SelectTrigger id="transaction-type" className="h-10 sm:h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sale">Venta</SelectItem>
              <SelectItem value="expense">Gasto</SelectItem>
              <SelectItem value="purchase">Compra</SelectItem>
              <SelectItem value="banking">Bancario</SelectItem>
              <SelectItem value="balance-change">Cambio de Balance</SelectItem>
              <SelectItem value="payment">Pago</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Segunda fila: Categoría y Método de Pago */}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-1">
          <Label htmlFor="category">Categoría</Label>
          <Input
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Categoría"
            disabled={loading}
            className="h-10 sm:h-11"
          />
        </div>
        <div className="col-span-1">
          <Label htmlFor="method">Método de Pago</Label>
          <Select value={method} onValueChange={setMethod} disabled={loading}>
            <SelectTrigger id="method" className="h-10 sm:h-11">
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
        ]}
      />

      {/* Componente optimizado para tasa de cambio */}
      {currency === 'VES' && transactionType !== 'balance-change' && (
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

      {/* Campos específicos para Cambio de Balance */}
      {transactionType === 'balance-change' && (
        <div className="col-span-2 mt-4 border-t pt-4">
          <div className="mb-4">
            <Label className="text-base font-medium">Información de Cambio de Saldo</Label>
            <p className="text-sm text-muted-foreground">Detalles específicos para operaciones bancarias</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-1">
              <Label htmlFor="bank-commission">Comisión del Banco</Label>
              <Input
                id="bank-commission"
                type="number"
                step="0.01"
                value={bankCommission}
                onChange={(e) => setBankCommission(e.target.value)}
                placeholder="0.00"
                disabled={loading}
                className="h-10 sm:h-11"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Monto que cobra el banco por la operación
              </p>
            </div>
            
            <div className="col-span-1">
              <Label htmlFor="transfer-count">Número de Transferencias</Label>
              <Input
                id="transfer-count"
                type="number"
                min="1"
                value={transferCount}
                onChange={(e) => setTransferCount(e.target.value)}
                placeholder="1"
                disabled={loading}
                className="h-10 sm:h-11"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Cantidad de transferencias realizadas
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Selección de cuenta bancaria */}
      <div className="grid gap-2">
        <Label htmlFor="bank-account">
          {transactionType === 'balance-change' ? 'Cuenta Origen' : 'Cuenta Bancaria'}
        </Label>
        <Select value={selectedBankAccount} onValueChange={setSelectedBankAccount} disabled={loading}>
          <SelectTrigger id="bank-account" className="h-10 sm:h-11">
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
      </div>

      {/* Campo específico para balance-change: Banco Destinatario */}
      {transactionType === 'balance-change' ? (
        <div className="grid gap-2">
          <Label htmlFor="destination-bank">Banco Destinatario</Label>
          <Select value={destinationBankAccount} onValueChange={setDestinationBankAccount} disabled={loading}>
            <SelectTrigger id="destination-bank" className="h-10 sm:h-11">
              <SelectValue placeholder="Seleccionar cuenta destino..." />
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
        </div>
      ) : (
        /* Selección de cliente para otros tipos de transacciones */
        <ClientSelectionSection 
          selectedClient={selectedClient} 
          onClientChange={setSelectedClient} 
        />
      )}
      
      {/* Referencia */}
      <div>
        <Label htmlFor="reference">Referencia *</Label>
        <Input 
          id="reference" 
          value={reference} 
          onChange={(e) => setReference(e.target.value)} 
          placeholder="Referencia de la transacción" 
          disabled={loading}
          className="h-10 sm:h-11"
          required
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
          className="h-10 sm:h-11 cursor-pointer"
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
          placeholder="Notas adicionales sobre la transacción" 
          disabled={loading}
          className="min-h-[60px]"
        />
      </div>

      {/* Botones */}
      <div className="flex justify-end gap-2 pt-4">
        {showCancelButton && (
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onSuccess ? onSuccess() : navigate("/operations")}
            disabled={loading}
          >
            Cancelar
          </Button>
        )}
        <Button 
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? "Guardando..." : "Guardar Transacción"}
        </Button>
      </div>
    </div>
  );
}; 