// Componente principal del wizard
export { TransactionWizard } from "./TransactionWizard";

// Context y hooks
export {
  TransactionWizardProvider,
  useTransactionWizard,
  useCurrentWizardStep,
} from "@/contexts/TransactionWizardContext";

// Pasos individuales (por si se necesitan por separado)
export { TransactionTypeStep } from "./steps/TransactionTypeStep";
export { OperationDetailsStep } from "./steps/OperationDetailsStep";
export { AmountCurrencyStep } from "./steps/AmountCurrencyStep";
export { PaymentMethodStep } from "./steps/PaymentMethodStep";
export { AdditionalInfoStep } from "./steps/AdditionalInfoStep";
export { ConfirmationStep } from "./steps/ConfirmationStep";

// Tipos
export type {
  TransactionType,
  WizardStep,
  WizardStepConfig,
  TransactionWizardData,
  WizardContextType,
} from "@/types/wizard";
