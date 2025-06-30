import React from 'react';
import { useTransactionWizard } from '@/contexts/TransactionWizardContext';
import { TRANSACTION_TYPE_CONFIGS } from '@/types/wizard';

// Importar los flujos existentes
import { CashOperationFlow } from '@/components/operations/transaction/CashOperationFlow';
import { SaleOperationFlow } from '@/components/operations/transaction/SaleOperationFlow';
import { PurchaseOperationFlow } from '@/components/operations/transaction/PurchaseOperationFlow';
import { PaymentOperationFlow } from '@/components/operations/transaction/PaymentOperationFlow';
import { IngresoOperationFlow } from '@/components/operations/transaction/IngresoOperationFlow';
import { PagoOperationFlow } from '@/components/operations/transaction/PagoOperationFlow';

// Componente para gastos (categorías)
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const expenseCategories = [
  { id: 'operacional', name: 'Gasto Operacional', icon: '💼', description: 'Gastos del día a día del negocio' },
  { id: 'transporte', name: 'Transporte', icon: '🚗', description: 'Gastos de movilización y transporte' },
  { id: 'servicios', name: 'Servicios Públicos', icon: '💡', description: 'Electricidad, agua, internet, etc.' },
  { id: 'alimentacion', name: 'Alimentación', icon: '🍽️', description: 'Comidas y gastos alimentarios' },
  { id: 'mantenimiento', name: 'Mantenimiento', icon: '🔧', description: 'Reparaciones y mantenimiento' },
  { id: 'suministros', name: 'Suministros de Oficina', icon: '📎', description: 'Materiales y suministros' },
  { id: 'marketing', name: 'Marketing y Publicidad', icon: '📢', description: 'Promoción y publicidad' },
  { id: 'tecnologia', name: 'Tecnología', icon: '💻', description: 'Software, equipos tecnológicos' },
  { id: 'otros', name: 'Otros Gastos', icon: '📝', description: 'Otros gastos no clasificados' }
];

export const OperationDetailsStep: React.FC = () => {
  const { data, updateData, nextStep } = useTransactionWizard();

  if (!data.transactionType) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Primero debes seleccionar un tipo de transacción</p>
      </div>
    );
  }

  const config = TRANSACTION_TYPE_CONFIGS[data.transactionType];

  const handleOperationSelect = (operation: {
    type: string;
    relatedId?: string;
    relatedType?: 'debt' | 'receivable';
    clientId?: string;
    description: string;
    category?: string;
    paymentType?: string;
  }) => {
    updateData({
      operationType: operation.type,
      relatedId: operation.relatedId,
      relatedType: operation.relatedType,
      clientId: operation.clientId,
      description: operation.description,
      category: operation.category
    });
    
    // Avanzar automáticamente al siguiente paso
    setTimeout(() => {
      nextStep();
    }, 300);
  };

  const handleCategorySelect = (category: string) => {
    const categoryInfo = expenseCategories.find(c => c.id === category);
    updateData({
      category,
      description: `Gasto: ${categoryInfo?.name || 'Gasto operativo'}`
    });
    
    // Avanzar automáticamente al siguiente paso
    setTimeout(() => {
      nextStep();
    }, 300);
  };

  const renderFlowContent = () => {
    switch (data.transactionType) {
      case 'cash':
        return <CashOperationFlow onOperationSelect={handleOperationSelect} />;

      case 'sale':
        return <SaleOperationFlow onOperationSelect={handleOperationSelect} />;

      case 'purchase':
        return <PurchaseOperationFlow onOperationSelect={handleOperationSelect} />;

      case 'payment':
        return <PaymentOperationFlow onOperationSelect={handleOperationSelect} />;

      case 'ingreso':
        return <IngresoOperationFlow onOperationSelect={handleOperationSelect} />;

      case 'expense':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {expenseCategories.map((category) => (
              <Card
                key={category.id}
                className={`cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-105 border-2 ${
                  data.category === category.id
                    ? 'border-orange-500 ring-2 ring-orange-200 shadow-md bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleCategorySelect(category.id)}
              >
                <CardHeader className="text-center pb-2">
                  <div className="text-3xl mb-1">{category.icon}</div>
                  <CardTitle className="text-sm">{category.name}</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <CardDescription className="text-xs">
                    {category.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        );

      default:
        return (
          <div className="text-center py-8">
            <p className="text-gray-500">Flujo no implementado para este tipo de transacción</p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      {renderFlowContent()}

      {/* Mostrar resumen de la operación seleccionada */}
      {(data.operationType || data.category) && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <div className="text-xl">{config.icon}</div>
            <div className="flex-1">
              <p className="font-medium text-green-900 text-sm">
                {data.description}
              </p>
              {data.relatedType && (
                <p className="text-xs text-green-700 mt-1">
                  Relacionado con {data.relatedType === 'debt' ? 'deuda' : 'cuenta por cobrar'}
                </p>
              )}
              {data.category && (
                <p className="text-xs text-green-700 mt-1">
                  Categoría: {expenseCategories.find(c => c.id === data.category)?.name}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 