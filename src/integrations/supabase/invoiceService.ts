import { supabase } from "@/integrations/supabase/client";
import {
  InvoiceCompany,
  InvoiceTemplate,
  InvoiceItemCatalog,
  GeneratedInvoice,
  InvoiceLineItem,
  InvoiceGenerationRequest,
  InvoiceItemGenerationParams,
  InvoiceCompanyType,
  INVOICE_PREFIXES,
  INVOICE_ITEM_CATEGORIES
} from "@/types/invoice";
import { generateAIInvoiceItems, validateAIItems } from "@/services/aiInvoiceService";

// Helper function to convert snake_case to camelCase
const snakeToCamel = (obj: any): any => {
  if (!obj) return obj;
  if (Array.isArray(obj)) return obj.map(snakeToCamel);
  if (typeof obj !== 'object') return obj;

  return Object.keys(obj).reduce((acc, key) => {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    acc[camelKey] = snakeToCamel(obj[key]);
    return acc;
  }, {} as any);
};

// Company Management
export const getInvoiceCompanies = async (): Promise<InvoiceCompany[]> => {
  const { data, error } = await supabase
    .from('invoice_companies')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return snakeToCamel(data || []);
};

export const getInvoiceCompany = async (id: string): Promise<InvoiceCompany | null> => {
  const { data, error } = await supabase
    .from('invoice_companies')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return snakeToCamel(data);
};

export const createInvoiceCompany = async (company: Omit<InvoiceCompany, 'id' | 'createdAt' | 'updatedAt'>): Promise<InvoiceCompany> => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('invoice_companies')
    .insert({
      id: `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: userData.user.id,
      name: company.name,
      type: company.type,
      legal_name: company.legalName,
      tax_id: company.taxId,
      address: company.address,
      city: company.city,
      state: company.state,
      postal_code: company.postalCode,
      country: company.country,
      phone: company.phone,
      email: company.email,
      website: company.website,
      logo_url: company.logoUrl,
      is_active: company.isActive
    })
    .select()
    .single();

  if (error) throw error;
  return snakeToCamel(data);
};

export const updateInvoiceCompany = async (id: string, updates: Partial<InvoiceCompany>): Promise<InvoiceCompany> => {
  // Convert camelCase to snake_case for update
  const snakeUpdates = Object.keys(updates).reduce((acc, key) => {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    acc[snakeKey] = updates[key as keyof InvoiceCompany];
    return acc;
  }, {} as any);

  const { data, error } = await supabase
    .from('invoice_companies')
    .update(snakeUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return snakeToCamel(data);
};

// Template Management
export const getInvoiceTemplates = async (companyId: string): Promise<InvoiceTemplate[]> => {
  const { data, error } = await supabase
    .from('invoice_templates')
    .select('*')
    .eq('company_id', companyId)
    .order('is_default', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const createInvoiceTemplate = async (template: Omit<InvoiceTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<InvoiceTemplate> => {
  const { data, error } = await supabase
    .from('invoice_templates')
    .insert({
      id: `tmpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...template
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Item Catalog
export const getInvoiceItemsCatalog = async (companyType: InvoiceCompanyType): Promise<InvoiceItemCatalog[]> => {
  const { data, error } = await supabase
    .from('invoice_items_catalog')
    .select('*')
    .eq('company_type', companyType)
    .eq('is_active', true)
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw error;
  return snakeToCamel(data || []);
};

// Invoice Generation
export const generateInvoiceNumber = async (companyId: string): Promise<string> => {
  const company = await getInvoiceCompany(companyId);
  if (!company) throw new Error('Company not found');

  const prefix = INVOICE_PREFIXES[company.type] || 'INV';
  
  const { data, error } = await supabase.rpc('get_next_invoice_number', {
    p_company_id: companyId,
    p_prefix: prefix
  });

  if (error) throw error;
  return data;
};

// Generate random items for invoice
export const generateInvoiceItems = async (params: InvoiceItemGenerationParams): Promise<Partial<InvoiceLineItem>[]> => {
  const catalogItems = await getInvoiceItemsCatalog(params.companyType);
  
  if (catalogItems.length === 0) {
    throw new Error('No items found in catalog for company type');
  }

  // Group items by category
  const itemsByCategory: Record<string, InvoiceItemCatalog[]> = {};
  catalogItems.forEach(item => {
    if (!itemsByCategory[item.category]) {
      itemsByCategory[item.category] = [];
    }
    itemsByCategory[item.category].push(item);
  });

  // Determine number of items to generate
  const itemCount = params.itemCount || Math.floor(Math.random() * 6) + 3; // 3-8 items
  const items: Partial<InvoiceLineItem>[] = [];
  
  // Calculate target amount per item (before tax)
  const targetSubtotal = params.includeTax 
    ? params.targetAmount / (1 + params.taxRate / 100)
    : params.targetAmount;
  
  let remainingAmount = targetSubtotal;
  const categories = Object.keys(itemsByCategory);

  for (let i = 0; i < itemCount; i++) {
    // Select random category
    const category = categories[Math.floor(Math.random() * categories.length)];
    const categoryItems = itemsByCategory[category];
    
    // Select random item from category
    const catalogItem = categoryItems[Math.floor(Math.random() * categoryItems.length)];
    
    // Calculate quantity and price
    const isLastItem = i === itemCount - 1;
    const itemTargetAmount = isLastItem 
      ? remainingAmount 
      : remainingAmount * (0.15 + Math.random() * 0.35); // 15-50% of remaining
    
    // Generate price within item's range
    const unitPrice = catalogItem.minPrice + 
      Math.random() * (catalogItem.maxPrice - catalogItem.minPrice);
    
    // Calculate quantity based on target amount and unit price
    let quantity = Math.max(1, Math.round(itemTargetAmount / unitPrice));
    
    // Adjust quantity for realistic values based on unit type
    if (catalogItem.unit === 'hora' || catalogItem.unit === 'día') {
      quantity = Math.min(quantity, 8); // Max 8 hours/days
    } else if (catalogItem.unit === 'm³' || catalogItem.unit === 'm²') {
      quantity = Math.min(quantity, 100); // Max 100 cubic/square meters
    }
    
    const subtotal = quantity * unitPrice;
    const taxAmount = params.includeTax ? (subtotal * params.taxRate / 100) : 0;
    const total = subtotal + taxAmount;
    
    items.push({
      itemCatalogId: catalogItem.id,
      description: catalogItem.description || catalogItem.name,
      quantity: quantity,
      unit: catalogItem.unit,
      unitPrice: parseFloat(unitPrice.toFixed(2)),
      subtotal: parseFloat(subtotal.toFixed(2)),
      taxRate: params.taxRate,
      taxAmount: parseFloat(taxAmount.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      sortOrder: i
    });
    
    remainingAmount -= subtotal;
  }
  
  // Adjust last item if needed to match target amount
  if (items.length > 0 && Math.abs(remainingAmount) > 0.01) {
    const lastItem = items[items.length - 1];
    lastItem.subtotal! += remainingAmount;
    lastItem.quantity = parseFloat((lastItem.subtotal! / lastItem.unitPrice!).toFixed(2));
    
    if (params.includeTax) {
      lastItem.taxAmount = parseFloat((lastItem.subtotal! * params.taxRate / 100).toFixed(2));
      lastItem.total = parseFloat((lastItem.subtotal! + lastItem.taxAmount).toFixed(2));
    } else {
      lastItem.total = lastItem.subtotal!;
    }
  }
  
  return items;
};

// Create invoice with line items
export const createInvoice = async (request: InvoiceGenerationRequest): Promise<GeneratedInvoice> => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('User not authenticated');

  // Generate invoice number
  const invoiceNumber = await generateInvoiceNumber(request.companyId);
  
  // Calculate dates
  const invoiceDate = new Date();
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + (request.dueInDays || 30));
  
  // Prepare line items
  let lineItems: Partial<InvoiceLineItem>[] = [];
  let subtotal = 0;
  let taxAmount = 0;
  
  if (request.autoGenerateItems) {
    const company = await getInvoiceCompany(request.companyId);
    if (!company) throw new Error('Company not found');
    
    const generationParams = {
      companyType: company.type,
      targetAmount: request.amount,
      itemCount: request.itemCount,
      includeTax: request.includeTax ?? true,
      taxRate: request.taxRate ?? 16
    };
    
    // Try AI generation if requested
    if (request.useAIGeneration) {
      try {
        const aiContext = {
          currency: request.currency,
          clientName: request.clientName,
          language: 'es' as const
        };
        
        lineItems = await generateAIInvoiceItems(generationParams, aiContext);
        
        // Validate AI-generated items
        if (!validateAIItems(lineItems)) {
          throw new Error('Invalid AI-generated items');
        }
      } catch (error) {
        console.error('AI generation failed, falling back to catalog:', error);
        // Fallback to catalog-based generation
        lineItems = await generateInvoiceItems(generationParams);
      }
    } else {
      // Use catalog-based generation
      lineItems = await generateInvoiceItems(generationParams);
    }
    
    // Calculate totals from generated items
    lineItems.forEach(item => {
      subtotal += item.subtotal || 0;
      taxAmount += item.taxAmount || 0;
    });
  } else {
    // Manual invoice - single line item
    subtotal = request.amount;
    if (request.includeTax ?? true) {
      const taxRate = request.taxRate ?? 16;
      subtotal = request.amount / (1 + taxRate / 100);
      taxAmount = request.amount - subtotal;
    }
  }
  
  const totalAmount = subtotal + taxAmount;
  
  // Create invoice
  const { data: invoice, error: invoiceError } = await supabase
    .from('generated_invoices')
    .insert({
      id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: userData.user.id,
      transaction_id: request.transactionId,
      company_id: request.companyId,
      invoice_number: invoiceNumber,
      invoice_date: invoiceDate.toISOString(),
      due_date: dueDate.toISOString(),
      client_id: request.clientId,
      client_name: request.clientName,
      client_tax_id: request.clientTaxId,
      client_address: request.clientAddress,
      client_phone: request.clientPhone,
      client_email: request.clientEmail,
      subtotal: parseFloat(subtotal.toFixed(2)),
      tax_amount: parseFloat(taxAmount.toFixed(2)),
      total_amount: parseFloat(totalAmount.toFixed(2)),
      currency: request.currency,
      exchange_rate: request.exchangeRate,
      status: 'draft',
      notes: request.notes
    })
    .select()
    .single();

  if (invoiceError) throw invoiceError;
  
  // Create line items
  if (lineItems.length > 0) {
    console.log('Line items before insert:', lineItems);
    
    const lineItemsToInsert = lineItems.map((item, index) => {
      const lineItem = {
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        invoice_id: invoice.id,
        item_catalog_id: item.itemCatalogId || null,
        description: item.description || '',
        quantity: item.quantity || 0,
        unit: item.unit || 'unidad',
        unit_price: item.unitPrice || 0,
        subtotal: item.subtotal || 0,
        tax_rate: item.taxRate || 0,
        tax_amount: item.taxAmount || 0,
        total: item.total || 0,
        sort_order: item.sortOrder !== undefined ? item.sortOrder : index
      };
      
      console.log(`Line item ${index}:`, lineItem);
      return lineItem;
    });
    
    const { error: itemsError } = await supabase
      .from('invoice_line_items')
      .insert(lineItemsToInsert);
    
    if (itemsError) throw itemsError;
  }
  
  return invoice;
};

// Get invoices
export const getInvoices = async (): Promise<GeneratedInvoice[]> => {
  const { data, error } = await supabase
    .from('generated_invoices')
    .select(`
      *,
      company:invoice_companies(*),
      lineItems:invoice_line_items(
        *,
        catalogItem:invoice_items_catalog(*)
      )
    `)
    .order('invoice_date', { ascending: false });

  if (error) throw error;
  return snakeToCamel(data || []);
};

export const getInvoice = async (id: string): Promise<GeneratedInvoice | null> => {
  const { data, error } = await supabase
    .from('generated_invoices')
    .select(`
      *,
      company:invoice_companies(*),
      lineItems:invoice_line_items(
        *,
        catalogItem:invoice_items_catalog(*)
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return snakeToCamel(data);
};

// Update invoice status
export const updateInvoiceStatus = async (id: string, status: GeneratedInvoice['status']): Promise<void> => {
  const { error } = await supabase
    .from('generated_invoices')
    .update({ status })
    .eq('id', id);

  if (error) throw error;
};

// Delete invoice
export const deleteInvoice = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('generated_invoices')
    .delete()
    .eq('id', id);

  if (error) throw error;
};