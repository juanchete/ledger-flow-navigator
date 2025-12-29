import React, { useMemo } from 'react';
import { useTransactionWizard } from '@/contexts/TransactionWizardContext';
import { TRANSACTION_TYPE_CONFIGS } from '@/types/wizard';
import { v4 as uuidv4 } from 'uuid';

// UI Components
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { validateCashDenominations, formatValidationErrors } from "@/utils/validations";

interface Denomination {
  id: string;
  value: number;
  count: number;
}

export const AmountCurrencyStep: React.FC = () => {
  const { data, updateData } = useTransactionWizard();

  // Inicializar denominaciones si no existen
  const denominations = data.denominations || [{ id: uuidv4(), value: 0, count: 0 }];
  
  const denominationBasedAmount = useMemo(() => {
    return denominations.reduce((total, den) => total + den.value * den.count, 0);
  }, [denominations]);

  const showDenominations = ['cash', 'ingreso'].includes(data.transactionType || '') &&
                           ['USD', 'EUR'].includes(data.currency || 'USD');

  if (!data.transactionType) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Primero debes seleccionar un tipo de transacción</p>
      </div>
    );
  }

  const config = TRANSACTION_TYPE_CONFIGS[data.transactionType];

  const handleAmountChange = (amount: string) => {
    updateData({ amount });
  };

  const handleCurrencyChange = (currency: 'USD' | 'EUR' | 'VES' | 'COP') => {
    updateData({ currency });
  };

  const handleAddDenomination = () => {
    const newDenominations = [...denominations, { id: uuidv4(), value: 0, count: 0 }];
    updateData({ denominations: newDenominations });
  };

  const handleRemoveDenomination = (id: string) => {
    const newDenominations = denominations.filter(d => d.id !== id);
    updateData({ denominations: newDenominations });
  };

  const handleDenominationChange = (id: string, field: 'value' | 'count', fieldValue: number) => {
    const newDenominations = denominations.map(d => 
      d.id === id ? { ...d, [field]: fieldValue } : d
    );
    updateData({ denominations: newDenominations });
  };

  return (
    <div className="space-y-4">

      <div className="space-y-4">
        {/* Sección de Monto y Moneda */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">💰 Monto de la Transacción</CardTitle>
            <CardDescription>Ingresa el monto y selecciona la moneda</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Monto *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={data.amount || '0'}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="0.00"
                  disabled={showDenominations && denominationBasedAmount > 0}
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm">Moneda</Label>
                <Select value={data.currency || 'USD'} onValueChange={handleCurrencyChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="VES">VES</SelectItem>
                    <SelectItem value="COP">COP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {showDenominations && denominationBasedAmount > 0 && (
              <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                💡 El monto se calcula automáticamente basado en las denominaciones
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sección de Denominaciones (solo para efectivo en USD/EUR) */}
        {showDenominations && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">💵 Denominaciones *</CardTitle>
              <CardDescription>
                Especifica las denominaciones de billetes y monedas recibidas
              </CardDescription>
              <div className="text-sm text-orange-600 font-medium mt-2">
                ⚠️ Obligatorio para transacciones en efectivo con {data.currency}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {denominations.map((denomination) => (
                <div key={denomination.id} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <Label className="text-sm">Valor</Label>
                    <Input
                      type="number"
                      placeholder="Ej: 100 *"
                      value={denomination.value || ''}
                      onChange={(e) => handleDenominationChange(
                        denomination.id, 
                        'value', 
                        parseFloat(e.target.value) || 0
                      )}
                      className="text-sm border-orange-200 focus:border-orange-400"
                      required
                    />
                  </div>
                  <div className="col-span-5">
                    <Label className="text-sm">Cantidad</Label>
                    <Input
                      type="number"
                      placeholder="Ej: 5 *"
                      value={denomination.count || ''}
                      onChange={(e) => handleDenominationChange(
                        denomination.id, 
                        'count', 
                        parseInt(e.target.value) || 0
                      )}
                      className="text-sm border-orange-200 focus:border-orange-400"
                      required
                    />
                  </div>
                  <div className="col-span-2 flex items-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveDenomination(denomination.id)}
                      disabled={denominations.length === 1}
                      className="h-10 w-10 p-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddDenomination}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Agregar Denominación
                </Button>
                
                {denominationBasedAmount > 0 && (
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Total calculado:</p>
                    <p className="text-lg font-bold text-green-600">
                      {data.currency} {denominationBasedAmount.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
              
              {/* Indicador visual de validación de denominaciones */}
              {denominationBasedAmount > 0 && data.amount && parseFloat(data.amount) > 0 && (
                <div className={`mt-4 p-3 rounded-lg border text-sm ${
                  Math.abs(denominationBasedAmount - parseFloat(data.amount)) < 0.01
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  {Math.abs(denominationBasedAmount - parseFloat(data.amount)) < 0.01 ? (
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">✅</span>
                      <span>Las denominaciones coinciden con el monto de la transacción</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-red-600">❌</span>
                      <span>
                        Discrepancia: Denominaciones = {data.currency} {denominationBasedAmount.toFixed(2)}, 
                        Monto indicado = {data.currency} {parseFloat(data.amount).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Resumen del monto */}
        {data.amount && parseFloat(data.amount) > 0 && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-blue-900">Monto de la transacción:</p>
                <p className="text-2xl font-bold text-blue-700">
                  {data.currency} {parseFloat(data.amount).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 