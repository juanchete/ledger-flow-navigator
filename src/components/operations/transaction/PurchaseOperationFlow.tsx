import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface PurchaseOperationFlowProps {
  onOperationSelect: (operation: {
    type: 'purchase';
    description: string;
    category?: string;
  }) => void;
}

export const PurchaseOperationFlow: React.FC<PurchaseOperationFlowProps> = ({ onOperationSelect }) => {
  const [purchaseCategory, setPurchaseCategory] = useState<string>('');

  const purchaseCategories = [
    { value: 'inventory', label: 'Compra de Inventario', icon: '📦', description: 'Mercancía para reventa' },
    { value: 'supplies', label: 'Insumos y Materiales', icon: '🔧', description: 'Materiales para producción o servicios' },
    { value: 'equipment', label: 'Equipo y Herramientas', icon: '🛠️', description: 'Activos fijos para el negocio' },
    { value: 'services', label: 'Compra de Servicios', icon: '💼', description: 'Servicios profesionales contratados' },
    { value: 'other', label: 'Otras Compras', icon: '🛍️', description: 'Otros tipos de compras' }
  ];

  const handleCategorySelect = (category: string) => {
    setPurchaseCategory(category);
  };

  const handleConfirm = () => {
    if (!purchaseCategory) return;

    const selectedCategory = purchaseCategories.find(c => c.value === purchaseCategory);
    const description = selectedCategory?.label || 'Compra';

    onOperationSelect({
      type: 'purchase',
      description,
      category: purchaseCategory
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Label className="text-base font-semibold">¿Qué tipo de compra realizaste?</Label>
        <div className="grid grid-cols-1 gap-3">
          {purchaseCategories.map((category) => (
            <Button
              key={category.value}
              variant={purchaseCategory === category.value ? 'default' : 'outline'}
              onClick={() => handleCategorySelect(category.value)}
              className="h-16 text-sm justify-start p-3"
            >
              <div className="flex items-start gap-3 w-full">
                <span className="text-lg">{category.icon}</span>
                <div className="flex flex-col items-start text-left">
                  <span className="font-medium">{category.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {category.description}
                  </span>
                </div>
              </div>
            </Button>
          ))}
        </div>
      </div>

      {/* Botón de confirmación */}
      {purchaseCategory && (
        <div className="flex justify-end">
          <Button onClick={handleConfirm} className="w-full sm:w-auto">
            Continuar con Compra
          </Button>
        </div>
      )}
    </div>
  );
};