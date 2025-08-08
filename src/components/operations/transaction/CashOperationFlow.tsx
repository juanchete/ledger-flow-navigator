import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface CashOperationFlowProps {
  onOperationSelect: (operation: {
    type: 'cash';
    description: string;
    cashFlow: 'in' | 'out';
  }) => void;
}

export const CashOperationFlow: React.FC<CashOperationFlowProps> = ({ onOperationSelect }) => {
  const [cashFlow, setCashFlow] = useState<'in' | 'out' | ''>('');
  const [operationType, setOperationType] = useState<string>('');

  const cashInTypes = [
    { value: 'cash-sale', label: 'Venta en Efectivo', icon: '💵', description: 'Recibí efectivo por una venta' },
    { value: 'cash-withdrawal', label: 'Retiro de Efectivo', icon: '🏧', description: 'Retiré efectivo del banco' },
    { value: 'cash-received', label: 'Efectivo Recibido', icon: '🤝', description: 'Recibí efectivo de alguien' }
  ];

  const cashOutTypes = [
    { value: 'cash-purchase', label: 'Compra en Efectivo', icon: '🛍️', description: 'Pagué con efectivo' },
    { value: 'cash-deposit', label: 'Depósito de Efectivo', icon: '🏦', description: 'Deposité efectivo en el banco' },
    { value: 'cash-given', label: 'Efectivo Entregado', icon: '🤲', description: 'Entregué efectivo a alguien' }
  ];

  const currentTypes = cashFlow === 'in' ? cashInTypes : cashOutTypes;

  const handleCashFlowSelect = (flow: 'in' | 'out') => {
    setCashFlow(flow);
    setOperationType(''); // Reset operation type when flow changes
  };

  const handleOperationTypeSelect = (type: string) => {
    setOperationType(type);
  };

  const handleConfirm = () => {
    if (!cashFlow || !operationType) return;

    const types = cashFlow === 'in' ? cashInTypes : cashOutTypes;
    const selectedType = types.find(t => t.value === operationType);
    const description = selectedType?.label || 'Operación en efectivo';

    onOperationSelect({
      type: 'cash',
      description,
      cashFlow
    });
  };

  return (
    <div className="space-y-4">
      {/* Paso 1: Dirección del efectivo */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">¿Recibiste o entregaste efectivo?</Label>
        <RadioGroup value={cashFlow} onValueChange={(value) => handleCashFlowSelect(value as 'in' | 'out')}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="in" id="cash-in" />
            <Label htmlFor="cash-in" className="cursor-pointer">
              📥 Recibí efectivo
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="out" id="cash-out" />
            <Label htmlFor="cash-out" className="cursor-pointer">
              📤 Entregué efectivo
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Paso 2: Tipo de operación */}
      {cashFlow && (
        <div className="space-y-3">
          <Label className="text-base font-semibold">
            {cashFlow === 'in' ? '¿Por qué recibiste efectivo?' : '¿Por qué entregaste efectivo?'}
          </Label>
          <div className="grid grid-cols-1 gap-3">
            {currentTypes.map((type) => (
              <Button
                key={type.value}
                variant={operationType === type.value ? 'default' : 'outline'}
                onClick={() => handleOperationTypeSelect(type.value)}
                className="h-16 text-sm justify-start p-3"
              >
                <div className="flex items-start gap-3 w-full">
                  <span className="text-lg">{type.icon}</span>
                  <div className="flex flex-col items-start text-left">
                    <span className="font-medium">{type.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {type.description}
                    </span>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Botón de confirmación */}
      {cashFlow && operationType && (
        <div className="flex justify-end">
          <Button onClick={handleConfirm} className="w-full sm:w-auto">
            Continuar con Efectivo
          </Button>
        </div>
      )}
    </div>
  );
};