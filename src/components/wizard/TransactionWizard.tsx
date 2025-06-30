import React from 'react';
import { TransactionWizardProvider, useTransactionWizard, useCurrentWizardStep } from '@/contexts/TransactionWizardContext';
import { TransactionWizardData } from '@/types/wizard';

// Importar todos los pasos
import { TransactionTypeStep } from './steps/TransactionTypeStep';
import { OperationDetailsStep } from './steps/OperationDetailsStep';
import { AmountCurrencyStep } from './steps/AmountCurrencyStep';
import { PaymentMethodStep } from './steps/PaymentMethodStep';
import { AdditionalInfoStep } from './steps/AdditionalInfoStep';
import { ConfirmationStep } from './steps/ConfirmationStep';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  Check,
  Loader2,
  X,
  ArrowLeft
} from 'lucide-react';

interface TransactionWizardProps {
  isOpen?: boolean;
  onClose?: () => void;
  onComplete?: (data: TransactionWizardData) => Promise<void>;
  initialData?: Partial<TransactionWizardData>;
}

// Componente interno que usa el contexto
const WizardContent: React.FC<{
  onClose?: () => void;
  onComplete?: (data: TransactionWizardData) => Promise<void>;
}> = ({ onClose, onComplete }) => {
  const {
    currentStep,
    steps,
    data,
    nextStep,
    prevStep,
    canProceed,
    canGoBack,
    resetWizard,
    isLoading,
    errors,
    hasInteracted
  } = useTransactionWizard();

  const {
    stepConfig,
    stepNumber,
    totalSteps,
    isFirstStep,
    isLastStep,
    progress,
    transactionConfig
  } = useCurrentWizardStep();

  // Renderizar el paso actual
  const renderCurrentStep = () => {
    if (!stepConfig) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-500">Paso no encontrado</p>
        </div>
      );
    }

    switch (stepConfig.id) {
      case 'transaction-type':
        return <TransactionTypeStep />;
      case 'operation-details':
        return <OperationDetailsStep />;
      case 'amount-currency':
        return <AmountCurrencyStep />;
      case 'payment-method':
        return <PaymentMethodStep />;
      case 'additional-info':
        return <AdditionalInfoStep />;
      case 'confirmation':
        return <ConfirmationStep />;
      default:
        return (
          <div className="text-center py-8">
            <p className="text-gray-500">Paso no implementado: {stepConfig.id}</p>
          </div>
        );
    }
  };

  // Manejar confirmación final
  const handleConfirm = async () => {
    if (!isLastStep || !onComplete) return;

    try {
      await onComplete(data);
      resetWizard();
      if (onClose) onClose();
    } catch (error) {
      console.error('Error completing transaction:', error);
    }
  };

  // Manejar cierre del wizard
  const handleClose = () => {
    if (onClose) {
      resetWizard();
      onClose();
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white min-h-screen">
      {/* Header estilo móvil limpio */}
      <div className="bg-white px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={canGoBack ? prevStep : handleClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 text-sm font-medium tracking-wider"
          >
            SALIR
          </Button>
        </div>
        
        {/* Barra de progreso minimalista */}
        <div className="w-full bg-gray-200 rounded-full h-1 mb-6">
          <div 
            className="bg-blue-500 h-1 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {/* Indicador de paso */}
        <div className="text-center mb-8">
          <span className="text-sm text-blue-500 font-medium tracking-wider">
            PASO {stepNumber}/{totalSteps}
          </span>
        </div>
      </div>

      {/* Contenido del paso actual - Estilo móvil limpio */}
      <div className="px-6 pb-8">
        {/* Mostrar errores globales solo si el usuario ha intentado avanzar */}
        {Object.keys(errors).length > 0 && !isLastStep && hasInteracted && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">
              {Object.values(errors)[0]}
            </p>
          </div>
        )}

        {/* Contenido del paso */}
        <div className="min-h-[500px]">
          {renderCurrentStep()}
        </div>
      </div>

      {/* Footer con botón centrado estilo móvil */}
      <div className="px-6 pb-8">
        <div className="flex justify-center">
          {!isLastStep ? (
            <Button
              onClick={nextStep}
              disabled={!canProceed() || isLoading}
              className={`w-48 h-12 rounded-lg text-base font-medium transition-all duration-200 ${
                canProceed() && !isLoading
                  ? 'bg-blue-500 hover:bg-blue-600 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                'Siguiente'
              )}
            </Button>
          ) : (
            <Button
              onClick={handleConfirm}
              disabled={!canProceed() || isLoading}
              className={`w-64 h-12 rounded-lg text-base font-medium transition-all duration-200 ${
                canProceed() && !isLoading
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                'Confirmar Transacción'
              )}
            </Button>
          )}
        </div>

        {/* Información de ayuda minimalista */}
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-400">
            {isLastStep 
              ? 'Revisa y confirma los datos'
              : 'Completa la información para continuar'
            }
          </p>
        </div>
      </div>
    </div>
  );
};

// Componente principal que provee el contexto
export const TransactionWizard: React.FC<TransactionWizardProps> = ({
  isOpen = true,
  onClose,
  onComplete,
  initialData
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      <TransactionWizardProvider 
        initialData={initialData}
        onComplete={onComplete}
      >
        <WizardContent onClose={onClose} onComplete={onComplete} />
      </TransactionWizardProvider>
    </div>
  );
}; 