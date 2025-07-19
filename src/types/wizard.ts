export type TransactionType =
  | "purchase"
  | "sale"
  | "cash"
  | "balance-change"
  | "expense"
  | "payment"
  | "ingreso";

export type WizardStep =
  | "transaction-type"
  | "operation-details"
  | "amount-currency"
  | "payment-method"
  | "additional-info"
  | "confirmation";

export interface WizardStepConfig {
  id: WizardStep;
  title: string;
  description: string;
  isRequired: boolean;
  isApplicable: (transactionType: TransactionType) => boolean;
}

export interface TransactionWizardData {
  // Paso 1: Tipo de transacción
  transactionType?: TransactionType;

  // Paso 2: Detalles de operación (dinámico según tipo)
  operationType?: string;
  relatedId?: string;
  relatedType?: "debt" | "receivable";
  clientId?: string;
  description?: string;
  category?: string;

  // Paso 3: Monto y moneda
  amount?: string;
  currency?: "USD" | "EUR" | "VES" | "COP";
  exchangeRate?: number;
  useCustomRate?: boolean;
  customRate?: string;
  denominations?: Array<{ id: string; value: number; count: number }>;

  // Paso 4: Método de pago
  paymentMethod?: "cash" | "transfer" | "credit_card" | "other";
  bankAccountId?: string;
  destinationBankAccountId?: string; // Para balance-change

  // Paso 5: Información adicional
  date?: string;
  reference?: string;
  receipt?: File | null;
  notes?: string;
  bankCommission?: string;
  transferCount?: string;

  // Auto crear deuda/cuenta por cobrar
  autoCreateDebtReceivable?: boolean;
  debtReceivableDueDate?: string;
  debtReceivableInterestRate?: string;
  debtReceivableNotes?: string;
}

export interface WizardContextType {
  currentStep: number;
  steps: WizardStepConfig[];
  data: TransactionWizardData;
  isValid: boolean;

  // Acciones
  goToStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateData: (updates: Partial<TransactionWizardData>) => void;
  resetWizard: () => void;
  canProceed: () => boolean;
  canGoBack: () => boolean;

  // Estado del wizard
  isLoading: boolean;
  errors: Record<string, string>;
  setError: (field: string, error: string) => void;
  clearError: (field: string) => void;
  hasInteracted: boolean;
}

export const TRANSACTION_TYPE_CONFIGS: Record<
  TransactionType,
  {
    label: string;
    icon: string;
    description: string;
    color: string;
    steps: WizardStep[];
  }
> = {
  purchase: {
    label: "Compra",
    icon: "🛒",
    description: "Registrar una compra o adquisición",
    color: "bg-red-100 text-red-800 border-red-200",
    steps: [
      "transaction-type",
      "operation-details",
      "amount-currency",
      "payment-method",
      "additional-info",
      "confirmation",
    ],
  },
  sale: {
    label: "Venta",
    icon: "💰",
    description: "Registrar una venta o ingreso",
    color: "bg-green-100 text-green-800 border-green-200",
    steps: [
      "transaction-type",
      "operation-details",
      "amount-currency",
      "payment-method",
      "additional-info",
      "confirmation",
    ],
  },
  cash: {
    label: "Efectivo",
    icon: "💵",
    description: "Operación en efectivo (entrada o salida)",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    steps: [
      "transaction-type",
      "operation-details",
      "amount-currency",
      "additional-info",
      "confirmation",
    ],
  },
  "balance-change": {
    label: "Transferencia",
    icon: "🔄",
    description: "Transferencia entre cuentas propias",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    steps: [
      "transaction-type",
      "amount-currency",
      "payment-method",
      "additional-info",
      "confirmation",
    ],
  },
  expense: {
    label: "Gasto",
    icon: "💸",
    description: "Registrar un gasto operativo",
    color: "bg-orange-100 text-orange-800 border-orange-200",
    steps: [
      "transaction-type",
      "operation-details",
      "amount-currency",
      "payment-method",
      "additional-info",
      "confirmation",
    ],
  },
  payment: {
    label: "Pago",
    icon: "💳",
    description: "Pago de deuda o cuenta por pagar",
    color: "bg-purple-100 text-purple-800 border-purple-200",
    steps: [
      "transaction-type",
      "operation-details",
      "amount-currency",
      "payment-method",
      "additional-info",
      "confirmation",
    ],
  },
  ingreso: {
    label: "Ingreso",
    icon: "📈",
    description: "Ingreso directo en efectivo",
    color: "bg-emerald-100 text-emerald-800 border-emerald-200",
    steps: [
      "transaction-type",
      "operation-details",
      "amount-currency",
      "additional-info",
      "confirmation",
    ],
  },
};

export const WIZARD_STEPS: WizardStepConfig[] = [
  {
    id: "transaction-type",
    title: "Tipo de Transacción",
    description: "Selecciona el tipo de operación que deseas registrar",
    isRequired: true,
    isApplicable: () => true,
  },
  {
    id: "operation-details",
    title: "Detalles de la Operación",
    description: "Especifica los detalles específicos de tu operación",
    isRequired: true,
    isApplicable: (type) => type !== "balance-change",
  },
  {
    id: "amount-currency",
    title: "Monto y Moneda",
    description: "Ingresa el monto y selecciona la moneda",
    isRequired: true,
    isApplicable: () => true,
  },
  {
    id: "payment-method",
    title: "Método de Pago",
    description: "Selecciona cómo se realizó el pago",
    isRequired: true,
    isApplicable: (type) => !["cash", "ingreso"].includes(type),
  },
  {
    id: "additional-info",
    title: "Información Adicional",
    description: "Agrega detalles extra como comprobantes y notas",
    isRequired: false,
    isApplicable: () => true,
  },
  {
    id: "confirmation",
    title: "Confirmación",
    description: "Revisa y confirma todos los datos de tu transacción",
    isRequired: true,
    isApplicable: () => true,
  },
];
