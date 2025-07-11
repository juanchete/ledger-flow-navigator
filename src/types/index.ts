export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  category: "individual" | "company" | "non-profit" | "government";
  clientType: "direct" | "indirect";
  identificationDoc?: {
    type: "ID" | "RIF";
    number: string;
    fileUrl?: string;
  };
  active: boolean;
  address: string;
  contactPerson?: string;
  documents: Document[];
  createdAt: Date;
  updatedAt: Date;
  alertStatus?: "none" | "yellow" | "red";
  alertNote?: string;
  relatedToClientId?: string;
}

export interface Document {
  id: string;
  name: string;
  type: string;
  url: string;
  uploadedAt: Date;
  size: number;
}

export interface Transaction {
  id: string;
  type:
    | "purchase"
    | "sale"
    | "cash"
    | "balance-change"
    | "expense"
    | "payment"
    | "ingreso";
  amount: number;
  description: string;
  date: Date;
  clientId?: string;
  status: "pending" | "completed" | "cancelled";
  receipt?: string;
  invoice?: string;
  deliveryNote?: string;
  paymentMethod?: string;
  bankAccountId?: string;
  currency?: "USD" | "EUR" | "VES" | "COP";
  exchangeRateId?: number;
  category?: string;
  notes?: string;
  denominations?: Record<string, number>;
  bankCommission?: number;
  transferCount?: number;
  destinationBankAccountId?: string;
  commission?: number;
  createdAt: Date;
  updatedAt: Date;
  indirectForClientId?: string;
  debtId?: string;
  receivableId?: string;
  obraId?: string;
}

export interface Debt {
  id: string;
  creditor: string;
  amount: number;
  dueDate: Date;
  status: "pending" | "paid" | "overdue";
  category?: string;
  notes?: string;
  clientId?: string;
  interestRate?: number; // Tasa de interés anual en porcentaje
  commission?: number;
  currency?: string;
  installments?: number; // Número de cuotas
  createdAt: Date;
  updatedAt: Date;
}

export interface Obra {
  id: string;
  name: string;
  description?: string;
  location?: string;
  startDate?: Date;
  endDate?: Date;
  status: "planning" | "in-progress" | "completed" | "on-hold";
  budget?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface GastoObra {
  id: string;
  obraId: string;
  description: string;
  amount: number;
  date: Date;
  receiptUrl?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Receivable {
  id: string;
  clientId: string;
  amount: number;
  dueDate: Date;
  status: "pending" | "paid" | "overdue";
  description?: string;
  notes?: string;
  interestRate?: number; // Tasa de interés anual en porcentaje
  commission?: number;
  currency?: string;
  installments?: number; // Número de cuotas
  createdAt: Date;
  updatedAt: Date;
  obraId?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  category:
    | "legal"
    | "banking"
    | "home"
    | "social"
    | "charity"
    | "other"
    | "meeting"
    | "deadline"
    | "reminder";
  clientId?: string;
  clientName?: string;
  isReminder: boolean;
  completed: boolean;
  reminderDays?: number;
  location?: string;
  locationUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Invoice {
  id: string;
  clientId: string;
  amount: number;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  dueDate: Date;
  issueDate: Date;
  items: InvoiceItem[];
  notes?: string;
  pdfUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxRate?: number;
  taxAmount?: number;
}

export interface FinancialStat {
  date: Date;
  netWorth: number;
  receivables: number;
  debts: number;
  expenses: number;
}

export interface ExpenseStat {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

export type BankAccount = {
  id: number;
  bankName: string;
  accountNumber: string;
  currency: "USD" | "EUR" | "VES" | "COP";
  amount: number;
};

interface CommonTransactionFormData {
  amount: number;
  description: string;
  date: Date;
  type:
    | "purchase"
    | "sale"
    | "cash"
    | "balance-change"
    | "expense"
    | "payment"
    | "ingreso";
  // ... existing code ...
}
