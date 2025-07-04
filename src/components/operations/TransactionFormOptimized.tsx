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
import { CashOperationFlow } from "./transaction/CashOperationFlow";
import { SaleOperationFlow } from "./transaction/SaleOperationFlow";
import { PurchaseOperationFlow } from "./transaction/PurchaseOperationFlow";
import { ExpenseOperationFlow } from "./transaction/ExpenseOperationFlow";
import { PaymentOperationFlow } from "./transaction/PaymentOperationFlow";
import { IngresoOperationFlow } from "./transaction/IngresoOperationFlow";
import { PagoOperationFlow } from "./transaction/PagoOperationFlow";
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
  const [transactionType, setTransactionType] = useState<Transaction["type"]>("payment");
  const [amount, setAmount] = useState('0');
  const [currency, setCurrency] = useState('USD');
  const [method, setMethod] = useState('transfer');
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
  const [bankCommission, setBankCommission] = useState('0'); // Ahora representa porcentaje
  const [transferCount, setTransferCount] = useState('1');
  const [destinationBankAccount, setDestinationBankAccount] = useState('');

  // Estados para los flujos interactivos
  const [showCashFlow, setShowCashFlow] = useState(false);
  const [showSaleFlow, setShowSaleFlow] = useState(false);
  const [showPurchaseFlow, setShowPurchaseFlow] = useState(false);
  const [showExpenseFlow, setShowExpenseFlow] = useState(false);
  const [showPaymentFlow, setShowPaymentFlow] = useState(false);
  const [showIngresoFlow, setShowIngresoFlow] = useState(false);
  const [showPagoFlow, setShowPagoFlow] = useState(true);
  
  const [operationData, setOperationData] = useState<{
    type: 'sale' | 'purchase' | 'payment' | 'expense';
    relatedId?: string;
    relatedType?: 'debt' | 'receivable';
    clientId?: string;
    description: string;
    category?: string;
    paymentType?: string;
  } | null>(null);

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

  // Manejar cambio de tipo de transacción
  const handleTransactionTypeChange = (value: Transaction["type"]) => {
    setTransactionType(value);
    // Reset todos los flujos
    setShowCashFlow(false);
    setShowSaleFlow(false);
    setShowPurchaseFlow(false);
    setShowExpenseFlow(false);
    setShowPaymentFlow(false);
    setShowIngresoFlow(false);
    setShowPagoFlow(false);
    setOperationData(null);
    
    // Mostrar el flujo correspondiente
    if (value === 'cash') {
      setShowCashFlow(true);
    } else if (value === 'sale') {
      setShowSaleFlow(true);
    } else if (value === 'purchase') {
      setShowPurchaseFlow(true);
    } else if (value === 'expense') {
      setShowExpenseFlow(true);
    } else if (value === 'payment') {
      setShowPagoFlow(true);
    } else if (value === 'ingreso') {
      setShowIngresoFlow(true);
    }
    // "balance-change" no necesita flujo especial, es directo
  };

  // Manejar selección de operación de efectivo
  const handleCashOperationSelect = (operation: {
    type: 'sale' | 'purchase' | 'payment' | 'expense';
    relatedId?: string;
    relatedType?: 'debt' | 'receivable';
    clientId?: string;
    description: string;
  }) => {
    setOperationData(operation);
    setTransactionType(operation.type);
    setReference(operation.description);
    setMethod('cash'); // Establecer automáticamente el método de pago como efectivo
    if (operation.clientId) {
      setSelectedClient(operation.clientId);
    }
    setShowCashFlow(false);
  };

  // Manejar selección de operación de venta
  const handleSaleOperationSelect = (operation: {
    type: 'sale' | 'payment';
    relatedId?: string;
    relatedType?: 'receivable';
    clientId?: string;
    description: string;
  }) => {
    setOperationData(operation);
    setTransactionType(operation.type);
    setReference(operation.description);
    setMethod('transfer'); // Mantener transferencia por defecto
    if (operation.clientId) {
      setSelectedClient(operation.clientId);
    }
    setShowSaleFlow(false);
  };

  // Manejar selección de operación de compra
  const handlePurchaseOperationSelect = (operation: {
    type: 'purchase' | 'payment';
    relatedId?: string;
    relatedType?: 'debt';
    clientId?: string;
    description: string;
  }) => {
    setOperationData(operation);
    setTransactionType(operation.type);
    setReference(operation.description);
    setMethod('transfer'); // Mantener transferencia por defecto
    if (operation.clientId) {
      setSelectedClient(operation.clientId);
    }
    setShowPurchaseFlow(false);
  };

  // Manejar selección de operación de gasto
  const handleExpenseOperationSelect = (operation: {
    type: 'expense';
    category?: string;
    description: string;
  }) => {
    setOperationData({ ...operation, relatedId: undefined, relatedType: undefined, clientId: undefined });
    setTransactionType(operation.type);
    setReference(operation.description);
    setMethod('transfer'); // Mantener transferencia por defecto
    if (operation.category) {
      setCategory(operation.category);
    }
    setShowExpenseFlow(false);
  };

  // Manejar selección de operación de pago
  const handlePaymentOperationSelect = (operation: {
    type: 'payment';
    relatedId?: string;
    relatedType?: 'debt' | 'receivable';
    clientId?: string;
    paymentType?: string;
    description: string;
  }) => {
    setOperationData(operation);
    setTransactionType(operation.type);
    setReference(operation.description);
    setMethod('transfer'); // Mantener transferencia por defecto
    if (operation.clientId) {
      setSelectedClient(operation.clientId);
    }
    setShowPaymentFlow(false);
  };

  // Manejar selección de operación de ingreso
  const handleIngresoOperationSelect = (operation: {
    type: 'sale' | 'payment';
    relatedId?: string;
    relatedType?: 'receivable';
    clientId?: string;
    description: string;
  }) => {
    setOperationData(operation);
    setTransactionType(operation.type);
    setReference(operation.description);
    setMethod('cash'); // Establecer automáticamente el método de pago como efectivo para ingresos
    if (operation.clientId) {
      setSelectedClient(operation.clientId);
    }
    setShowIngresoFlow(false);
  };

  // Manejar selección de operación de pago completo
  const handlePagoOperationSelect = (operation: {
    type: 'purchase' | 'payment' | 'expense';
    relatedId?: string;
    relatedType?: 'debt';
    clientId?: string;
    description: string;
    category?: string;
  }) => {
    setOperationData(operation);
    setTransactionType(operation.type);
    setReference(operation.description);
    setMethod('cash'); // Establecer automáticamente el método de pago como efectivo para pagos
    if (operation.clientId) {
      setSelectedClient(operation.clientId);
    }
    if (operation.category) {
      setCategory(operation.category);
    }
    setShowPagoFlow(false);
  };

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

    const baseAmount = (currency === 'USD' || currency === 'EUR') && method === 'cash' 
      ? denominationBasedAmount 
      : parseFloat(amount);

    if (isNaN(baseAmount) || baseAmount <= 0) {
      toast({
        title: "Monto inválido",
        description: "Por favor ingrese un monto válido mayor que cero.",
        variant: "destructive",
      });
      return;
    }

    // Validación de saldo para transacciones que requieren dinero (excluimos 'sale' e 'ingreso' porque suman dinero)
    const shouldValidateBalance = ['purchase', 'expense', 'payment', 'balance-change'].includes(transactionType);
    if (shouldValidateBalance && selectedBankAccount) {
      const selectedAccount = bankAccounts.find(acc => acc.id.toString() === selectedBankAccount);
      if (selectedAccount) {
        // Calcular monto final incluyendo transferencias y comisiones
        let finalAmountForValidation = baseAmount;
        if (transactionType === 'balance-change') {
          const transferMultiplier = parseInt(transferCount) || 1;
          finalAmountForValidation = baseAmount * transferMultiplier;
          
          if (bankCommission) {
            const commissionPercentage = parseFloat(bankCommission) || 0;
            const commissionAmount = (finalAmountForValidation * commissionPercentage) / 100;
            finalAmountForValidation = finalAmountForValidation + commissionAmount;
          }
        }

        if (finalAmountForValidation > selectedAccount.amount) {
          toast({
            title: "Saldo insuficiente",
            description: `No hay suficiente saldo en la cuenta seleccionada. Saldo disponible: ${selectedAccount.currency} ${selectedAccount.amount.toLocaleString()}`,
            variant: "destructive",
          });
          return;
        }
      }
    }

    // Calcular monto final incluyendo número de transferencias y comisión por porcentaje
    let finalAmount = baseAmount;
    if (transactionType === 'balance-change') {
      // Multiplicar por el número de transferencias
      const transferMultiplier = parseInt(transferCount) || 1;
      finalAmount = baseAmount * transferMultiplier;
      
      // Aplicar comisión sobre el monto total (después de multiplicar por transferencias)
      if (bankCommission) {
        const commissionPercentage = parseFloat(bankCommission) || 0;
        const commissionAmount = (finalAmount * commissionPercentage) / 100;
        finalAmount = finalAmount + commissionAmount;
      }
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
      
      // Construir las notas incluyendo información de balance-change si aplica
      let finalNotes = notes || '';
      if (transactionType === 'balance-change') {
        const balanceChangeInfo = [];
        if (bankCommission && parseFloat(bankCommission) > 0) {
          balanceChangeInfo.push(`Comisión bancaria: ${bankCommission}%`);
        }
        if (transferCount && parseInt(transferCount) > 1) {
          balanceChangeInfo.push(`Número de transferencias: ${transferCount}`);
        }
        if (destinationBankAccount) {
          const destAccount = bankAccounts.find(acc => acc.id.toString() === destinationBankAccount);
          balanceChangeInfo.push(`Cuenta destino: ${destAccount?.bank} - ${destAccount?.account_number}`);
        }
        
        if (balanceChangeInfo.length > 0) {
          finalNotes = finalNotes 
            ? `${finalNotes}\n\n--- Detalles del cambio de saldo ---\n${balanceChangeInfo.join('\n')}`
            : `--- Detalles del cambio de saldo ---\n${balanceChangeInfo.join('\n')}`;
        }
      }

      const newTransaction = {
        id: uuidv4(),
        type: transactionType,
        amount: finalAmount,
        description: reference,
        date: now,
        status: "completed" as const,
        category: category || null,
        notes: finalNotes || null,
        payment_method: method || null,
        client_id: selectedClient || null,
        bank_account_id: selectedBankAccount || null,
        currency: currency,
        receipt: receiptUrl || null,
        denominations: denominationsToSave || null,
        created_at: now,
        updated_at: now,
        // Campos específicos para balance-change (ahora que existen en la DB)
        bank_commission: transactionType === 'balance-change' && bankCommission ? 
          parseFloat(bankCommission) : null,
        transfer_count: transactionType === 'balance-change' ? 
          parseInt(transferCount) || 1 : null,
        destination_bank_account_id: transactionType === 'balance-change' ? 
          destinationBankAccount || null : null,
        // Campos específicos para operaciones de efectivo
        debt_id: operationData?.relatedType === 'debt' ? operationData.relatedId : null,
        receivable_id: operationData?.relatedType === 'receivable' ? operationData.relatedId : null,
      };

      const result = await addTransaction(newTransaction);
      
      if (result) {
        // El toast de éxito ahora se maneja en el TransactionContext
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
      // El toast de error se maneja en el TransactionContext
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTransactionType("purchase");
    setAmount('0');
    setCurrency('USD');
    setMethod('transfer');
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
    
    // Reset flujos interactivos - compra por defecto
    setShowCashFlow(false);
    setShowSaleFlow(false);
    setShowPurchaseFlow(true);
    setShowExpenseFlow(false);
    setShowPaymentFlow(false);
    setShowIngresoFlow(false);
    setShowPagoFlow(false);
    setOperationData(null);
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
    <div className="grid gap-4 py-4 w-full max-w-full">
      
      {/* Primera fila: Fecha y Tipo de Transacción - responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="date">Fecha</Label>
          <Input 
            id="date" 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)} 
            disabled={loading}
            className="h-10 sm:h-11 w-full"
          />
        </div>
        <div>
          <Label htmlFor="transaction-type">Tipo de Transacción</Label>
          <Select value={transactionType} onValueChange={handleTransactionTypeChange} disabled={loading}>
            <SelectTrigger id="transaction-type" className="h-10 sm:h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="payment">Pago</SelectItem>
              <SelectItem value="expense">Gasto</SelectItem>
              <SelectItem value="ingreso">Ingreso</SelectItem>
              <SelectItem value="sale">Venta</SelectItem>
              <SelectItem value="purchase">Compra</SelectItem>
              <SelectItem value="balance-change">Cambio de Saldo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Flujos Interactivos Condicionales */}
      {showCashFlow ? (
        <div className="mt-4 p-4 border border-blue-200 rounded-lg bg-blue-50">
          <h3 className="text-lg font-semibold mb-4 text-blue-800">Operación de Efectivo</h3>
          <CashOperationFlow onOperationSelect={handleCashOperationSelect} />
        </div>
      ) : showSaleFlow ? (
        <div className="mt-4 p-4 border border-green-200 rounded-lg bg-green-50">
          <h3 className="text-lg font-semibold mb-4 text-green-800">Operación de Venta</h3>
          <SaleOperationFlow onOperationSelect={handleSaleOperationSelect} />
        </div>
      ) : showPurchaseFlow ? (
        <div className="mt-4 p-4 border border-orange-200 rounded-lg bg-orange-50">
          <h3 className="text-lg font-semibold mb-4 text-orange-800">Operación de Compra</h3>
          <PurchaseOperationFlow onOperationSelect={handlePurchaseOperationSelect} />
        </div>
      ) : showExpenseFlow ? (
        <div className="mt-4 p-4 border border-red-200 rounded-lg bg-red-50">
          <h3 className="text-lg font-semibold mb-4 text-red-800">Operación de Gasto</h3>
          <ExpenseOperationFlow onOperationSelect={handleExpenseOperationSelect} />
        </div>
      ) : showPaymentFlow ? (
        <div className="mt-4 p-4 border border-purple-200 rounded-lg bg-purple-50">
          <h3 className="text-lg font-semibold mb-4 text-purple-800">Operación de Pago</h3>
          <PaymentOperationFlow onOperationSelect={handlePaymentOperationSelect} />
        </div>
      ) : showIngresoFlow ? (
        <div className="mt-4 p-4 border border-emerald-200 rounded-lg bg-emerald-50">
          <h3 className="text-lg font-semibold mb-4 text-emerald-800">💰 Operación de Ingreso</h3>
          <IngresoOperationFlow onOperationSelect={handleIngresoOperationSelect} />
        </div>
      ) : showPagoFlow ? (
        <div className="mt-4 p-4 border border-rose-200 rounded-lg bg-rose-50">
          <h3 className="text-lg font-semibold mb-4 text-rose-800">💸 Operación de Pago</h3>
          <PagoOperationFlow onOperationSelect={handlePagoOperationSelect} />
        </div>
      ) : (
        <>
          {/* Mostrar información de la operación seleccionada */}
          {operationData && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-green-800">
                    Operación seleccionada: {operationData.description}
                  </p>
                  {operationData.relatedType && (
                    <p className="text-sm text-green-600">
                      Relacionado con {operationData.relatedType === 'debt' ? 'deuda' : 'cuenta por cobrar'}
                    </p>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    if (transactionType === 'cash') setShowCashFlow(true);
                    else if (transactionType === 'sale') setShowSaleFlow(true);
                    else if (transactionType === 'purchase') setShowPurchaseFlow(true);
                    else if (transactionType === 'expense') setShowExpenseFlow(true);
                    else if (transactionType === 'payment') setShowPagoFlow(true);
                    else if (transactionType === 'ingreso') setShowIngresoFlow(true);
                  }}
                  className="text-blue-600"
                >
                  Cambiar
                </Button>
              </div>
            </div>
          )}

          {/* Método de Pago */}
      <div className="grid grid-cols-1 gap-4">
        <div>
          <Label htmlFor="method">Método de Pago</Label>
          <Select value={method} onValueChange={setMethod} disabled={loading}>
            <SelectTrigger id="method" className="h-10 sm:h-11 w-full">
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
      {transactionType !== 'balance-change' && (
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
        <div className="mt-4 border-t pt-4 w-full">
          <div className="flex flex-col space-y-2 sm:flex-row sm:justify-between sm:items-center sm:space-y-0 mb-2">
            <div>
              <Label>Desglose de Billetes - {currency}</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Especifica qué billetes {operationData ? (operationData.type === 'sale' || operationData.type === 'payment' && operationData.relatedType === 'receivable' ? 'recibiste' : 'entregaste') : 'manejaste'}
              </p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={handleAddDenomination} disabled={loading} className="w-full sm:w-auto">
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
                  className="w-full"
                />
                <Input 
                  type="number" 
                  placeholder="Cantidad" 
                  value={den.count || ''} 
                  onChange={(e) => handleDenominationChange(den.id, 'count', parseInt(e.target.value) || 0)} 
                  disabled={loading}
                  className="w-full"
                />
                <Button 
                  type="button" 
                  size="icon" 
                  variant="destructive" 
                  onClick={() => handleRemoveDenomination(den.id)} 
                  disabled={loading}
                  className="flex-shrink-0"
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
        <div className="mt-4 border-t pt-4 w-full">
          <div className="mb-4">
            <Label className="text-base font-medium">Información de Cambio de Saldo</Label>
            <p className="text-sm text-muted-foreground">Detalles específicos para operaciones bancarias</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bank-commission">Comisión del Banco (%)</Label>
              <div className="relative">
                <Input
                  id="bank-commission"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={bankCommission}
                  onChange={(e) => setBankCommission(e.target.value)}
                  placeholder="1.25"
                  disabled={loading}
                  className="h-10 sm:h-11 w-full pr-8"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">
                  %
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Porcentaje de comisión que se añade al monto base (ej: 1.25% = 1.25)
              </p>
              {bankCommission && parseFloat(bankCommission) > 0 && amount && parseFloat(amount) > 0 && (
                <div className="text-xs text-blue-600 mt-1 font-medium">
                  {(() => {
                    const baseAmt = parseFloat(amount);
                    const transfers = parseInt(transferCount) || 1;
                    const totalBeforeCommission = baseAmt * transfers;
                    const commissionAmt = (totalBeforeCommission * parseFloat(bankCommission)) / 100;
                    const finalTotal = totalBeforeCommission + commissionAmt;
                    
                    return transfers > 1 
                      ? `Previsualización: (${currency} ${baseAmt.toFixed(2)} × ${transfers}) + ${parseFloat(bankCommission)}% = ${currency} ${totalBeforeCommission.toFixed(2)} + ${currency} ${commissionAmt.toFixed(2)} = ${currency} ${finalTotal.toFixed(2)}`
                      : `Previsualización: ${currency} ${baseAmt.toFixed(2)} + ${parseFloat(bankCommission)}% = ${currency} ${totalBeforeCommission.toFixed(2)} + ${currency} ${commissionAmt.toFixed(2)} = ${currency} ${finalTotal.toFixed(2)}`;
                  })()}
                </div>
              )}
            </div>
            
            <div>
              <Label htmlFor="transfer-count">Número de Transferencias</Label>
              <Input
                id="transfer-count"
                type="number"
                min="1"
                value={transferCount}
                onChange={(e) => setTransferCount(e.target.value)}
                placeholder="1"
                disabled={loading}
                className="h-10 sm:h-11 w-full"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Cantidad de transferencias realizadas. El monto se multiplicará por este número.
              </p>
              {transferCount && parseInt(transferCount) > 1 && amount && parseFloat(amount) > 0 && (
                <div className="text-xs text-orange-600 mt-1 font-medium">
                  {parseInt(transferCount)} transferencias × {currency} {parseFloat(amount).toFixed(2)} = {currency} {(parseFloat(amount) * parseInt(transferCount)).toFixed(2)}
                </div>
              )}
            </div>
          </div>
          
          {/* Resumen del cálculo total */}
          {amount && parseFloat(amount) > 0 && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm font-medium text-blue-800 mb-1">Resumen del Monto Total:</div>
              {(() => {
                const baseAmt = parseFloat(amount);
                const transfers = parseInt(transferCount) || 1;
                const totalBeforeCommission = baseAmt * transfers;
                const commissionPercent = parseFloat(bankCommission) || 0;
                const commissionAmt = (totalBeforeCommission * commissionPercent) / 100;
                const finalTotal = totalBeforeCommission + commissionAmt;
                
                return (
                  <div className="text-sm text-blue-700">
                    <div>Monto base: {currency} {baseAmt.toFixed(2)}</div>
                    {transfers > 1 && <div>× {transfers} transferencias = {currency} {totalBeforeCommission.toFixed(2)}</div>}
                    {commissionPercent > 0 && <div>+ Comisión {commissionPercent}% = {currency} {commissionAmt.toFixed(2)}</div>}
                    <div className="font-semibold border-t border-blue-300 pt-1 mt-1">
                      <strong>Total final: {currency} {finalTotal.toFixed(2)}</strong>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Selección de cuenta bancaria */}
      <div className="grid gap-2 w-full">
        <Label htmlFor="bank-account">
          {transactionType === 'balance-change' ? 'Cuenta Origen' : 'Cuenta Bancaria'}
        </Label>
        <Select value={selectedBankAccount} onValueChange={setSelectedBankAccount} disabled={loading}>
          <SelectTrigger id="bank-account" className="h-10 sm:h-11 w-full">
            <SelectValue placeholder="Seleccionar cuenta..." />
          </SelectTrigger>
          <SelectContent>
            {bankAccounts.map(account => (
              <SelectItem key={account.id} value={account.id.toString()}>
                <div className="flex flex-col">
                  <span className="font-medium">{account.bank}</span>
                  <span className="text-xs text-muted-foreground">
                    {account.account_number} - {account.currency}
                  </span>
                  <span className="text-xs font-medium text-blue-600">
                    Saldo: {account.currency} {account.amount.toLocaleString()}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Campo específico para balance-change: Banco Destinatario */}
      {transactionType === 'balance-change' ? (
        <div className="grid gap-2 w-full">
          <Label htmlFor="destination-bank">Banco Destinatario</Label>
          <Select value={destinationBankAccount} onValueChange={setDestinationBankAccount} disabled={loading}>
            <SelectTrigger id="destination-bank" className="h-10 sm:h-11 w-full">
              <SelectValue placeholder="Seleccionar cuenta destino..." />
            </SelectTrigger>
            <SelectContent>
              {bankAccounts.map(account => (
                <SelectItem key={account.id} value={account.id.toString()}>
                  <div className="flex flex-col">
                    <span className="font-medium">{account.bank}</span>
                    <span className="text-xs text-muted-foreground">
                      {account.account_number} - {account.currency}
                    </span>
                    <span className="text-xs font-medium text-green-600">
                      Saldo: {account.currency} {account.amount.toLocaleString()}
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
      <div className="w-full">
        <Label htmlFor="reference">Referencia *</Label>
        <Input 
          id="reference" 
          value={reference} 
          onChange={(e) => setReference(e.target.value)} 
          placeholder="Referencia de la transacción" 
          disabled={loading}
          className="h-10 sm:h-11 w-full"
          required
        />
      </div>

      {/* Comprobante */}
      <div className="w-full">
        <Label htmlFor="receipt">Comprobante</Label>
        <Input 
          id="receipt" 
          type="file"
          accept="image/*,.pdf,.doc,.docx"
          onChange={(e) => setReceipt(e.target.files?.[0] || null)} 
          disabled={loading}
          className="h-10 sm:h-11 cursor-pointer w-full"
        />
        {receipt && (
          <p className="text-xs text-muted-foreground mt-1 break-words">
            Archivo seleccionado: {receipt.name}
          </p>
        )}
      </div>
      
      {/* Notas */}
      <div className="w-full">
        <Label htmlFor="notes">Notas</Label>
        <Textarea 
          id="notes" 
          value={notes} 
          onChange={(e) => setNotes(e.target.value)} 
          placeholder="Notas adicionales sobre la transacción" 
          disabled={loading}
          className="min-h-[60px] w-full"
        />
      </div>

          {/* Botones */}
          <div className="flex flex-col space-y-2 sm:flex-row sm:justify-end sm:space-y-0 sm:space-x-2 pt-4 w-full">
            {showCancelButton && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onSuccess ? onSuccess() : navigate("/operations")}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
            )}
            <Button 
              onClick={handleSubmit}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              {loading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Guardando..." : "Guardar Transacción"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}; 