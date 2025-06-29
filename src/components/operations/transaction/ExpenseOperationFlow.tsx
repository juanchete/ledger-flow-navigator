import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

interface ExpenseOperationFlowProps {
  onOperationSelect: (operation: {
    type: 'expense';
    category?: string;
    description: string;
  }) => void;
}

const expenseCategories = [
  { value: 'office', label: 'Oficina', icon: '🏢', description: 'Gastos de oficina y administración' },
  { value: 'transport', label: 'Transporte', icon: '🚗', description: 'Gasolina, transporte público, etc.' },
  { value: 'meals', label: 'Alimentación', icon: '🍽️', description: 'Comidas de trabajo y entretenimiento' },
  { value: 'supplies', label: 'Suministros', icon: '📦', description: 'Materiales y herramientas' },
  { value: 'services', label: 'Servicios', icon: '⚡', description: 'Luz, agua, internet, etc.' },
  { value: 'maintenance', label: 'Mantenimiento', icon: '🔧', description: 'Reparaciones y mantenimiento' },
  { value: 'marketing', label: 'Marketing', icon: '📢', description: 'Publicidad y promoción' },
  { value: 'professional', label: 'Servicios Profesionales', icon: '👨‍💼', description: 'Contabilidad, legal, consultorías' },
  { value: 'other', label: 'Otros', icon: '📝', description: 'Otros gastos operativos' }
];

export const ExpenseOperationFlow: React.FC<ExpenseOperationFlowProps> = ({ onOperationSelect }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
  };

  const handleConfirm = () => {
    if (!selectedCategory) return;

    const categoryInfo = expenseCategories.find(cat => cat.value === selectedCategory);
    
    onOperationSelect({
      type: 'expense',
      category: selectedCategory,
      description: `Gasto de ${categoryInfo?.label.toLowerCase() || 'operativo'}`
    });
  };

  return (
    <div className="space-y-4">
      {/* Paso 1: Categoría del gasto */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">¿Qué tipo de gasto realizaste?</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {expenseCategories.map((category) => (
            <Button
              key={category.value}
              variant={selectedCategory === category.value ? 'default' : 'outline'}
              onClick={() => handleCategorySelect(category.value)}
              className="h-16 text-sm justify-start p-3"
            >
              <div className="flex items-start gap-3 w-full">
                <span className="text-lg">{category.icon}</span>
                <div className="flex flex-col items-start text-left">
                  <span className="font-medium">{category.label}</span>
                  <span className="text-xs text-muted-foreground line-clamp-2">
                    {category.description}
                  </span>
                </div>
              </div>
            </Button>
          ))}
        </div>
      </div>

      {/* Botón de confirmación */}
      {selectedCategory && (
        <>
          <Separator />
          <div className="flex justify-end">
            <Button onClick={handleConfirm} className="w-full sm:w-auto">
              Continuar con Gasto
            </Button>
          </div>
        </>
      )}
    </div>
  );
}; 