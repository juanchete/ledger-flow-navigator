
export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  category: 'individual' | 'company' | 'non-profit' | 'government';
  active: boolean;
  address: string;
  contactPerson?: string;
  documents: Document[];
  createdAt: Date;
  updatedAt: Date;
  alertStatus?: 'none' | 'yellow' | 'red';
  alertNote?: string;
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
  type: 'purchase' | 'sale' | 'banking' | 'balance-change' | 'expense';
  amount: number;
  description: string;
  date: Date;
  clientId?: string;
  status: 'pending' | 'completed' | 'cancelled';
  receipt?: string;
  invoice?: string;
  deliveryNote?: string;
  paymentMethod?: string;
  category?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  category: 'meeting' | 'deadline' | 'reminder' | 'other';
  clientId?: string;
  isReminder: boolean;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Invoice {
  id: string;
  clientId: string;
  amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
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
