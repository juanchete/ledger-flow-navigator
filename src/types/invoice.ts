export type InvoiceCompanyType = 'construction' | 'electronics' | 'papers' | 'electricity';

export interface InvoiceCompany {
  id: string;
  userId: string;
  name: string;
  type: InvoiceCompanyType;
  legalName: string;
  taxId: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceTemplate {
  id: string;
  companyId: string;
  name: string;
  templateData: {
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
    logoPosition?: 'left' | 'center' | 'right';
    showBankDetails?: boolean;
    bankDetails?: {
      bankName?: string;
      accountNumber?: string;
      accountType?: string;
      routingNumber?: string;
    };
    footerText?: string;
    termsAndConditions?: string;
  };
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceItemCatalog {
  id: string;
  companyType: InvoiceCompanyType;
  category: string;
  name: string;
  description?: string;
  unit: string;
  minPrice: number;
  maxPrice: number;
  taxRate: number;
  isActive: boolean;
  createdAt: Date;
}

export interface GeneratedInvoice {
  id: string;
  userId: string;
  transactionId?: string;
  companyId: string;
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  clientId?: string;
  clientName: string;
  clientTaxId?: string;
  clientAddress?: string;
  clientPhone?: string;
  clientEmail?: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  currency: 'USD' | 'EUR' | 'VES' | 'COP';
  exchangeRate?: number;
  status: 'draft' | 'sent' | 'paid' | 'cancelled';
  notes?: string;
  pdfUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  // Virtual fields
  company?: InvoiceCompany;
  lineItems?: InvoiceLineItem[];
}

export interface InvoiceLineItem {
  id: string;
  invoiceId: string;
  itemCatalogId?: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  sortOrder: number;
  createdAt: Date;
  // Virtual field
  catalogItem?: InvoiceItemCatalog;
}

export interface InvoiceSequence {
  id: number;
  companyId: string;
  prefix: string;
  currentNumber: number;
  year: number;
  createdAt: Date;
  updatedAt: Date;
}

// Helper types for invoice generation
export interface InvoiceGenerationRequest {
  companyId: string;
  transactionId?: string;
  clientId?: string;
  clientName: string;
  clientTaxId?: string;
  clientAddress?: string;
  clientPhone?: string;
  clientEmail?: string;
  amount: number;
  currency: 'USD' | 'EUR' | 'VES' | 'COP';
  exchangeRate?: number;
  dueInDays?: number;
  notes?: string;
  // Auto-generation settings
  autoGenerateItems?: boolean;
  useAIGeneration?: boolean; // Use AI for item generation
  itemCount?: number; // Number of items to generate (3-8 by default)
  includeTax?: boolean;
  taxRate?: number;
}

export interface InvoiceItemGenerationParams {
  companyType: InvoiceCompanyType;
  targetAmount: number;
  itemCount: number;
  includeTax: boolean;
  taxRate: number;
}

// Category mappings for different company types
export const INVOICE_ITEM_CATEGORIES: Record<InvoiceCompanyType, string[]> = {
  construction: ['Materials', 'Equipment', 'Labor', 'Finishing'],
  electronics: ['Cables', 'Switches', 'Outlets', 'Protection', 'Components', 'Lighting'],
  papers: ['Paper', 'Office'],
  electricity: ['Services']
};

// Common invoice prefixes by company type
export const INVOICE_PREFIXES: Record<InvoiceCompanyType, string> = {
  construction: 'CONST',
  electronics: 'ELEC',
  papers: 'PAPER',
  electricity: 'SERV'
};