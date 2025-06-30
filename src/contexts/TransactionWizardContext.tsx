import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { 
  WizardContextType, 
  TransactionWizardData, 
  WizardStepConfig, 
  WIZARD_STEPS,
  TRANSACTION_TYPE_CONFIGS,
  TransactionType,
  WizardStep
} from '@/types/wizard';

const TransactionWizardContext = createContext<WizardContextType | undefined>(undefined);

interface TransactionWizardProviderProps {
  children: React.ReactNode;
  initialData?: Partial<TransactionWizardData>;
  onComplete?: (data: TransactionWizardData) => void;
}

export const TransactionWizardProvider: React.FC<TransactionWizardProviderProps> = ({
  children,
  initialData = {},
  onComplete
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<TransactionWizardData>({
    date: new Date().toISOString().split('T')[0],
    currency: 'USD',
    paymentMethod: 'transfer',
    ...initialData
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasInteracted, setHasInteracted] = useState(false);

  // Calcular los pasos aplicables según el tipo de transacción
  const applicableSteps = useMemo((): WizardStepConfig[] => {
    if (!data.transactionType) {
      return [WIZARD_STEPS[0]]; // Solo mostrar el primer paso
    }

    const config = TRANSACTION_TYPE_CONFIGS[data.transactionType];
    return WIZARD_STEPS.filter(step => 
      config.steps.includes(step.id)
    );
  }, [data.transactionType]);

  // Validaciones por paso
  const validateStep = useCallback((stepIndex: number): boolean => {
    const step = applicableSteps[stepIndex];
    if (!step) return false;

    switch (step.id) {
      case 'transaction-type':
        return !!data.transactionType;
      
      case 'operation-details':
        // Validación específica según el tipo de transacción
        if (data.transactionType === 'expense') {
          return !!data.category;
        }
        if (['payment', 'purchase', 'sale'].includes(data.transactionType || '')) {
          return !!data.operationType;
        }
        return !!data.description;
      
      case 'amount-currency': {
        const amount = parseFloat(data.amount || '0');
        return !isNaN(amount) && amount > 0 && !!data.currency;
      }
      
      case 'payment-method':
        if (data.transactionType === 'balance-change') {
          return !!data.bankAccountId && !!data.destinationBankAccountId;
        }
        return !!data.paymentMethod;
      
      case 'additional-info':
        return true; // Este paso es opcional
      
      case 'confirmation':
        return true; // La confirmación siempre es válida si llegamos aquí
      
      default:
        return true;
    }
  }, [data, applicableSteps]);

  // Validar si el wizard completo es válido
  const isValid = useMemo((): boolean => {
    return applicableSteps.every((_, index) => validateStep(index));
  }, [applicableSteps, validateStep]);

  // Acciones del wizard
  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < applicableSteps.length) {
      setCurrentStep(step);
      // Limpiar errores del paso actual
      const stepId = applicableSteps[step]?.id;
      if (stepId && errors[stepId]) {
        clearError(stepId);
      }
    }
  }, [applicableSteps.length, errors]);

  const nextStep = useCallback(() => {
    setHasInteracted(true);
    const isCurrentStepValid = validateStep(currentStep);
    
    if (!isCurrentStepValid) {
      const step = applicableSteps[currentStep];
      setError(step.id, `Por favor completa todos los campos requeridos en ${step.title}`);
      return;
    }

    // Limpiar cualquier error del paso actual al avanzar
    const currentStepId = applicableSteps[currentStep]?.id;
    if (currentStepId && errors[currentStepId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[currentStepId];
        return newErrors;
      });
    }

    if (currentStep < applicableSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, applicableSteps, validateStep, errors]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const updateData = useCallback((updates: Partial<TransactionWizardData>) => {
    setHasInteracted(true);
    setData(prev => {
      const newData = { ...prev, ...updates };
      
      // Si cambia el tipo de transacción, resetear el paso al primero
      if (updates.transactionType && updates.transactionType !== prev.transactionType) {
        setCurrentStep(0);
        // Limpiar datos específicos del tipo anterior
        const { operationType, relatedId, relatedType, category, ...cleanData } = newData;
        return {
          ...cleanData,
          transactionType: updates.transactionType
        };
      }
      
      return newData;
    });
    
    // Limpiar errores relacionados con los campos actualizados
    if (Object.keys(updates).some(key => errors[key])) {
      setErrors(prev => {
        const newErrors = { ...prev };
        Object.keys(updates).forEach(key => {
          delete newErrors[key];
        });
        return newErrors;
      });
    }
  }, [errors]);

  const resetWizard = useCallback(() => {
    setCurrentStep(0);
    setData({
      date: new Date().toISOString().split('T')[0],
      currency: 'USD',
      paymentMethod: 'transfer',
      ...initialData
    });
    setErrors({});
    setIsLoading(false);
    setHasInteracted(false);
  }, [initialData]);

  const canProceed = useCallback(() => {
    return validateStep(currentStep);
  }, [currentStep, validateStep]);

  const canGoBack = useCallback(() => {
    return currentStep > 0;
  }, [currentStep]);

  const setError = useCallback((field: string, error: string) => {
    setErrors(prev => ({ ...prev, [field]: error }));
  }, []);

  const clearError = useCallback((field: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  // Función para completar el wizard
  const completeWizard = useCallback(async () => {
    if (!isValid) {
      setError('wizard', 'Por favor completa todos los pasos requeridos');
      return;
    }

    setIsLoading(true);
    try {
      if (onComplete) {
        await onComplete(data);
      }
      resetWizard();
    } catch (error) {
      console.error('Error completing wizard:', error);
      setError('wizard', 'Error al completar la transacción');
    } finally {
      setIsLoading(false);
    }
  }, [isValid, data, onComplete, resetWizard]);

  const contextValue: WizardContextType = {
    currentStep,
    steps: applicableSteps,
    data,
    isValid,
    
    // Acciones
    goToStep,
    nextStep,
    prevStep,
    updateData,
    resetWizard,
    canProceed,
    canGoBack,
    
    // Estado del wizard
    isLoading,
    errors,
    setError,
    clearError,
    hasInteracted
  };

  return (
    <TransactionWizardContext.Provider value={contextValue}>
      {children}
    </TransactionWizardContext.Provider>
  );
};

export const useTransactionWizard = (): WizardContextType => {
  const context = useContext(TransactionWizardContext);
  if (context === undefined) {
    throw new Error('useTransactionWizard must be used within a TransactionWizardProvider');
  }
  return context;
};

// Hook para obtener información del paso actual
export const useCurrentWizardStep = () => {
  const { currentStep, steps, data } = useTransactionWizard();
  const currentStepConfig = steps[currentStep];
  
  return {
    stepConfig: currentStepConfig,
    stepNumber: currentStep + 1,
    totalSteps: steps.length,
    isFirstStep: currentStep === 0,
    isLastStep: currentStep === steps.length - 1,
    progress: Math.round(((currentStep + 1) / steps.length) * 100),
    transactionConfig: data.transactionType ? TRANSACTION_TYPE_CONFIGS[data.transactionType] : null
  };
};

// Hook para validación de pasos específicos
export const useWizardStepValidation = (stepId: WizardStep) => {
  const { data, errors, setError, clearError } = useTransactionWizard();
  
  const validateField = useCallback((field: keyof TransactionWizardData, value: string | number | TransactionType | undefined | null) => {
    // Implementar validaciones específicas por campo si es necesario
    let isValid = true;
    let errorMessage = '';
    
    switch (field) {
      case 'amount': {
        const amount = parseFloat(String(value));
        isValid = !isNaN(amount) && amount > 0;
        errorMessage = 'El monto debe ser mayor que cero';
        break;
      }
      case 'transactionType': {
        isValid = !!value;
        errorMessage = 'Selecciona un tipo de transacción';
        break;
      }
      // Agregar más validaciones según sea necesario
    }
    
    if (!isValid) {
      setError(field, errorMessage);
    } else {
      clearError(field);
    }
    
    return isValid;
  }, [setError, clearError]);
  
  return {
    validateField,
    hasError: (field: string) => !!errors[field],
    getError: (field: string) => errors[field]
  };
}; 