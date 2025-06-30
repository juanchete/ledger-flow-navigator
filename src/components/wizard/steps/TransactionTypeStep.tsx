import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTransactionWizard } from '@/contexts/TransactionWizardContext';
import { TRANSACTION_TYPE_CONFIGS, TransactionType } from '@/types/wizard';

export const TransactionTypeStep: React.FC = () => {
  const { data, updateData, nextStep } = useTransactionWizard();

  const handleTypeSelect = (type: TransactionType) => {
    updateData({ transactionType: type });
    
    // Avanzar automáticamente al siguiente paso
    setTimeout(() => {
      nextStep();
    }, 500);
  };

  return (
    <div className="space-y-8">
      {/* Título principal centrado */}
      <div className="text-center">
        <h2 className="text-2xl md:text-3xl font-semibold text-gray-800 leading-tight">
          ¿Qué tipo de transacción<br />deseas realizar?
        </h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Object.entries(TRANSACTION_TYPE_CONFIGS).map(([type, config]) => (
          <Card
            key={type}
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg border-2 ${
              data.transactionType === type
                ? 'border-blue-500 bg-blue-50 shadow-lg'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
            onClick={() => handleTypeSelect(type as TransactionType)}
          >
            <CardContent className="text-center py-6 px-3">
              <div className="text-3xl mb-3">{config.icon}</div>
              <div className="font-medium text-gray-800 text-sm mb-1">
                {config.label}
              </div>
              <div className="text-xs text-gray-500 leading-relaxed">
                {config.description}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {data.transactionType && (
        <div className="text-center mt-8">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-full">
            <span className="text-lg">
              {TRANSACTION_TYPE_CONFIGS[data.transactionType].icon}
            </span>
            <span className="font-medium text-gray-700 text-sm">
              {TRANSACTION_TYPE_CONFIGS[data.transactionType].label} seleccionado
            </span>
          </div>
        </div>
      )}
    </div>
  );
}; 