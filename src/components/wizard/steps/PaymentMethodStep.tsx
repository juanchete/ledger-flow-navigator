import React, { useState, useEffect } from 'react';
import { useTransactionWizard } from '@/contexts/TransactionWizardContext';
import { TRANSACTION_TYPE_CONFIGS } from '@/types/wizard';
import { getBankAccounts, BankAccountApp } from '@/integrations/supabase/bankAccountService';

// UI Components
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

const paymentMethods = [
  { 
    value: 'cash', 
    label: 'Efectivo', 
    icon: '💵', 
    description: 'Pago en efectivo',
    color: 'bg-green-100 text-green-800 border-green-200'
  },
  { 
    value: 'transfer', 
    label: 'Transferencia', 
    icon: '🏦', 
    description: 'Transferencia bancaria',
    color: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  { 
    value: 'credit_card', 
    label: 'Tarjeta de Crédito', 
    icon: '💳', 
    description: 'Pago con tarjeta',
    color: 'bg-purple-100 text-purple-800 border-purple-200'
  },
  { 
    value: 'other', 
    label: 'Otro', 
    icon: '📝', 
    description: 'Otro método de pago',
    color: 'bg-gray-100 text-gray-800 border-gray-200'
  }
];

export const PaymentMethodStep: React.FC = () => {
  const { data, updateData } = useTransactionWizard();
  const [bankAccounts, setBankAccounts] = useState<BankAccountApp[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar cuentas bancarias
  useEffect(() => {
    const loadBankAccounts = async () => {
      try {
        const accounts = await getBankAccounts();
        setBankAccounts(accounts);
      } catch (error) {
        console.error('Error loading bank accounts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadBankAccounts();
  }, []);

  if (!data.transactionType) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Primero debes seleccionar un tipo de transacción</p>
      </div>
    );
  }

  const config = TRANSACTION_TYPE_CONFIGS[data.transactionType];
  const isBalanceChange = data.transactionType === 'balance-change';

  const handlePaymentMethodChange = (method: 'cash' | 'transfer' | 'credit_card' | 'other') => {
    updateData({ paymentMethod: method });
  };

  const handleBankAccountChange = (accountId: string) => {
    updateData({ bankAccountId: accountId });
  };

  const handleDestinationBankAccountChange = (accountId: string) => {
    updateData({ destinationBankAccountId: accountId });
  };

  const getMethodInfo = (method: string) => {
    return paymentMethods.find(m => m.value === method);
  };

  const selectedMethodInfo = getMethodInfo(data.paymentMethod || 'transfer');

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Cargando métodos de pago...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Para transferencias entre cuentas (balance-change) */}
      {isBalanceChange ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🔄 Transferencia entre Cuentas</CardTitle>
              <CardDescription>
                Selecciona la cuenta de origen y destino para la transferencia
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Cuenta de Origen *</Label>
                  <Select 
                    value={data.bankAccountId || ''} 
                    onValueChange={handleBankAccountChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cuenta origen" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id.toString()}>
                          <div className="flex items-center justify-between w-full">
                            <span>{account.bank}</span>
                            <span className="text-xs text-gray-500 ml-2">
                              {account.currency} {account.amount?.toFixed(2)}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Cuenta de Destino *</Label>
                  <Select 
                    value={data.destinationBankAccountId || ''} 
                    onValueChange={handleDestinationBankAccountChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cuenta destino" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts
                        .filter(account => account.id.toString() !== data.bankAccountId)
                        .map((account) => (
                          <SelectItem key={account.id} value={account.id.toString()}>
                            <div className="flex items-center justify-between w-full">
                              <span>{account.bank}</span>
                              <span className="text-xs text-gray-500 ml-2">
                                {account.currency} {account.amount?.toFixed(2)}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Para otros tipos de transacciones */
        <div className="space-y-6">
          {/* Selección de método de pago */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">💳 Método de Pago</CardTitle>
              <CardDescription>Selecciona cómo realizaste el pago</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paymentMethods.map((method) => (
                  <Card
                    key={method.value}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-105 border-2 ${
                      data.paymentMethod === method.value
                        ? 'border-blue-500 ring-2 ring-blue-200 shadow-md bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handlePaymentMethodChange(method.value as 'cash' | 'transfer' | 'credit_card' | 'other')}
                  >
                    <CardHeader className="text-center pb-2">
                      <div className="text-3xl mb-1">{method.icon}</div>
                      <CardTitle className="text-sm">{method.label}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                      <CardDescription className="text-xs">
                        {method.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Selección de cuenta bancaria (para transferencias y tarjetas) */}
          {data.paymentMethod && ['transfer', 'credit_card'].includes(data.paymentMethod) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">🏦 Cuenta Bancaria</CardTitle>
                <CardDescription>
                  Selecciona la cuenta {data.paymentMethod === 'transfer' ? 'desde la que se hizo la transferencia' : 'asociada a la tarjeta'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label className="text-sm">Cuenta Bancaria *</Label>
                  <Select 
                    value={data.bankAccountId || ''} 
                    onValueChange={handleBankAccountChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cuenta" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id.toString()}>
                          <div className="flex items-center justify-between w-full">
                            <span>{account.bank}</span>
                            <span className="text-xs text-gray-500 ml-2">
                              {account.currency} {account.amount?.toFixed(2)}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Resumen del método seleccionado */}
      {(data.paymentMethod || isBalanceChange) && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">
              {isBalanceChange ? '🔄' : selectedMethodInfo?.icon}
            </div>
            <div>
              <p className="font-medium text-green-900">
                {isBalanceChange 
                  ? 'Transferencia entre cuentas'
                  : `Método de pago: ${selectedMethodInfo?.label}`
                }
              </p>
              {data.bankAccountId && (
                <p className="text-sm text-green-700">
                  Cuenta {isBalanceChange ? 'origen' : 'seleccionada'}: {
                    bankAccounts.find(acc => acc.id.toString() === data.bankAccountId)?.bank
                  }
                </p>
              )}
              {isBalanceChange && data.destinationBankAccountId && (
                <p className="text-sm text-green-700">
                  Cuenta destino: {
                    bankAccounts.find(acc => acc.id.toString() === data.destinationBankAccountId)?.bank
                  }
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 