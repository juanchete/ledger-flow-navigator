import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface SaleOperationFlowProps {
  onOperationSelect: (operation: {
    type: 'sale';
    description: string;
  }) => void;
}

export const SaleOperationFlow: React.FC<SaleOperationFlowProps> = ({ onOperationSelect }) => {
  const [saleType, setSaleType] = useState<string>('');

  const saleTypes = [
    { value: 'product', label: 'Venta de Producto', icon: '📦', description: 'Venta de mercancía o productos' },
    { value: 'service', label: 'Venta de Servicio', icon: '💼', description: 'Servicios profesionales prestados' },
    { value: 'other', label: 'Otra Venta', icon: '💰', description: 'Otros tipos de ingresos por ventas' }
  ];

  const handleSaleTypeSelect = (type: string) => {
    setSaleType(type);
  };

  const handleConfirm = () => {
    if (!saleType) return;

    const selectedType = saleTypes.find(t => t.value === saleType);
    const description = selectedType?.label || 'Venta';

    onOperationSelect({
      type: 'sale',
      description
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Label className="text-base font-semibold">¿Qué tipo de venta realizaste?</Label>
        <div className="grid grid-cols-1 gap-3">
          {saleTypes.map((type) => (
            <Button
              key={type.value}
              variant={saleType === type.value ? 'default' : 'outline'}
              onClick={() => handleSaleTypeSelect(type.value)}
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

      {/* Botón de confirmación */}
      {saleType && (
        <div className="flex justify-end">
          <Button onClick={handleConfirm} className="w-full sm:w-auto">
            Continuar con Venta
          </Button>
        </div>
      )}
    </div>
  );
}; 