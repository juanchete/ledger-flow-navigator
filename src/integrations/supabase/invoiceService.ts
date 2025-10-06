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
  INVOICE_ITEM_CATEGORIES,
} from "@/types/invoice";
import {
  generateAIInvoiceItems,
  validateAIItems,
} from "@/services/aiInvoiceService";
import { excelCatalogService } from "@/services/excelCatalogService";

// Helper function to convert snake_case to camelCase
const snakeToCamel = (obj: any): any => {
  if (!obj) return obj;
  if (Array.isArray(obj)) return obj.map(snakeToCamel);
  if (typeof obj !== "object") return obj;

  return Object.keys(obj).reduce((acc, key) => {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) =>
      letter.toUpperCase()
    );
    acc[camelKey] = snakeToCamel(obj[key]);
    return acc;
  }, {} as any);
};

// Company Management
export const getInvoiceCompanies = async (): Promise<InvoiceCompany[]> => {
  const { data, error } = await supabase
    .from("invoice_companies")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return snakeToCamel(data || []);
};

export const getInvoiceCompany = async (
  id: string
): Promise<InvoiceCompany | null> => {
  const { data, error } = await supabase
    .from("invoice_companies")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return snakeToCamel(data);
};

export const createInvoiceCompany = async (
  company: Omit<InvoiceCompany, "id" | "createdAt" | "updatedAt">
): Promise<InvoiceCompany> => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("User not authenticated");

  const { data, error } = await supabase
    .from("invoice_companies")
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
      is_active: company.isActive,
    })
    .select()
    .single();

  if (error) throw error;
  return snakeToCamel(data);
};

export const updateInvoiceCompany = async (
  id: string,
  updates: Partial<InvoiceCompany>
): Promise<InvoiceCompany> => {
  // Convert camelCase to snake_case for update
  const snakeUpdates = Object.keys(updates).reduce((acc, key) => {
    const snakeKey = key.replace(
      /[A-Z]/g,
      (letter) => `_${letter.toLowerCase()}`
    );
    acc[snakeKey] = updates[key as keyof InvoiceCompany];
    return acc;
  }, {} as any);

  const { data, error } = await supabase
    .from("invoice_companies")
    .update(snakeUpdates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return snakeToCamel(data);
};

// Template Management
export const getInvoiceTemplates = async (
  companyId: string
): Promise<InvoiceTemplate[]> => {
  const { data, error } = await supabase
    .from("invoice_templates")
    .select("*")
    .eq("company_id", companyId)
    .order("is_default", { ascending: false });

  if (error) throw error;
  return data || [];
};

export const createInvoiceTemplate = async (
  template: Omit<InvoiceTemplate, "id" | "createdAt" | "updatedAt">
): Promise<InvoiceTemplate> => {
  const { data, error } = await supabase
    .from("invoice_templates")
    .insert({
      id: `tmpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...template,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Item Catalog
export const getInvoiceItemsCatalog = async (
  companyType: InvoiceCompanyType
): Promise<InvoiceItemCatalog[]> => {
  const { data, error } = await supabase
    .from("invoice_items_catalog")
    .select("*")
    .eq("company_type", companyType)
    .eq("is_active", true)
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return snakeToCamel(data || []);
};

// Invoice Generation
export const generateInvoiceNumber = async (
  companyId: string
): Promise<string> => {
  const company = await getInvoiceCompany(companyId);
  if (!company) throw new Error("Company not found");

  const prefix = INVOICE_PREFIXES[company.type] || "INV";

  const { data, error } = await supabase.rpc("get_next_invoice_number", {
    p_company_id: companyId,
    p_prefix: prefix,
  });

  if (error) throw error;
  return data;
};

// Generate random items for invoice
export const generateInvoiceItems = async (
  params: InvoiceItemGenerationParams
): Promise<Partial<InvoiceLineItem>[]> => {
  const catalogItems = await getInvoiceItemsCatalog(params.companyType);

  if (catalogItems.length === 0) {
    throw new Error("No items found in catalog for company type");
  }

  // Calculate target amount per item (before tax)
  const targetSubtotal = params.includeTax
    ? params.targetAmount / (1 + params.taxRate / 100)
    : params.targetAmount;

  // Determine realistic price ranges based on total amount
  let priceRange: { min: number; max: number };
  let suggestedItemCount: number;

  if (targetSubtotal < 50) {
    // Very small invoice - basic supplies
    priceRange = { min: 0.5, max: 15 };
    suggestedItemCount = 2 + Math.floor(Math.random() * 2); // 2-3 items
  } else if (targetSubtotal < 200) {
    // Small invoice - mix of supplies and small services
    priceRange = { min: 5, max: 50 };
    suggestedItemCount = 3 + Math.floor(Math.random() * 3); // 3-5 items
  } else if (targetSubtotal < 1000) {
    // Medium invoice - services and materials
    priceRange = { min: 20, max: 200 };
    suggestedItemCount = 4 + Math.floor(Math.random() * 4); // 4-7 items
  } else if (targetSubtotal < 5000) {
    // Large invoice - professional services or bulk materials
    priceRange = { min: 50, max: 500 };
    suggestedItemCount = 5 + Math.floor(Math.random() * 5); // 5-9 items
  } else {
    // Very large invoice - major projects
    priceRange = { min: 100, max: 2000 };
    suggestedItemCount = 6 + Math.floor(Math.random() * 6); // 6-11 items
  }

  // Escalar rangos si parecen estar en USD (muy pequeños) usando tasa de cambio
  const assumedExchangeRate = 36; // usar tasa por defecto cuando no se proporcione contexto
  const looksLikeUSD = priceRange.max <= 2000 && targetSubtotal > 2000;
  if (looksLikeUSD) {
    priceRange = {
      min: priceRange.min * assumedExchangeRate,
      max: priceRange.max * assumedExchangeRate,
    };
  }

  // Use suggested count or parameter count
  const itemCount = params.itemCount || suggestedItemCount;

  // Filter catalog items by price range
  const affordableItems = catalogItems.filter(
    (item) => item.maxPrice >= priceRange.min && item.minPrice <= priceRange.max
  );

  if (affordableItems.length === 0) {
    // Fallback to all items if no affordable ones found
    affordableItems.push(...catalogItems);
  }

  // Group filtered items by category
  const itemsByCategory: Record<string, InvoiceItemCatalog[]> = {};
  affordableItems.forEach((item) => {
    if (!itemsByCategory[item.category]) {
      itemsByCategory[item.category] = [];
    }
    itemsByCategory[item.category].push(item);
  });

  const items: Partial<InvoiceLineItem>[] = [];
  let remainingAmount = targetSubtotal;
  const categories = Object.keys(itemsByCategory);
  const usedItems = new Set<string>(); // Track used items to avoid duplicates

  for (let i = 0; i < itemCount && remainingAmount > 0; i++) {
    // Select random category
    const category = categories[Math.floor(Math.random() * categories.length)];
    const categoryItems = itemsByCategory[category].filter(
      (item) => !usedItems.has(item.id)
    );

    if (categoryItems.length === 0) {
      // If all items in category are used, allow duplicates
      categoryItems.push(...itemsByCategory[category]);
    }

    // Select random item from category
    const catalogItem =
      categoryItems[Math.floor(Math.random() * categoryItems.length)];
    usedItems.add(catalogItem.id);

    // Calculate quantity and price
    const isLastItem = i === itemCount - 1;
    const itemTargetAmount = isLastItem
      ? remainingAmount
      : remainingAmount * (0.15 + Math.random() * 0.35); // 15-50% of remaining

    // Generate price within item's range and price constraints
    const adjustedMinPrice = Math.max(catalogItem.minPrice, priceRange.min);
    const adjustedMaxPrice = Math.min(catalogItem.maxPrice, priceRange.max);
    const unitPrice =
      adjustedMinPrice + Math.random() * (adjustedMaxPrice - adjustedMinPrice);

    // Determine base quantity
    let quantity = Math.max(1, Math.round(itemTargetAmount / unitPrice));

    // Normalize time units: convert hours to days/weeks (avoid hours)
    let unit = catalogItem.unit;
    const unitLower = unit.toLowerCase();
    if (unitLower === "hora" || unitLower === "hour") {
      if (quantity >= 40) {
        unit = unitLower === "hour" ? "week" : "semana";
        quantity = Math.max(1, Math.ceil(quantity / 40));
      } else {
        unit = unitLower === "hour" ? "day" : "día";
        quantity = Math.max(1, Math.ceil(quantity / 8));
      }
    }

    // Adjust quantity for realistic values based on unit type and total amount
    if (unit === "día" || unit === "day") {
      quantity = Math.min(quantity, 20); // 1-20 días
    } else if (unit === "semana" || unit === "week") {
      quantity = Math.min(quantity, 8); // 1-8 semanas
    } else if (unit === "m³" || unit === "m²") {
      // For area/volume units, scale with invoice size
      const maxVolume =
        targetSubtotal < 500 ? 10 : targetSubtotal < 2000 ? 50 : 200;
      quantity = Math.min(quantity, maxVolume);
    } else if (unit === "unidad" || unit === "paquete") {
      // For units/packages, ensure reasonable quantities
      const maxUnits =
        targetSubtotal < 200 ? 20 : targetSubtotal < 1000 ? 100 : 500;
      quantity = Math.min(quantity, maxUnits);
    }

    const subtotal = quantity * unitPrice;
    const taxAmount = params.includeTax ? (subtotal * params.taxRate) / 100 : 0;
    const total = subtotal + taxAmount;

    // Forzar cantidad entera mínima de 1
    quantity = Math.max(1, Math.round(quantity));

    // Normalizar descripciones para evitar "hora"
    let description = catalogItem.description || catalogItem.name;
    const tUnit = unit.toLowerCase();
    const timeSingular =
      tUnit === "semana" || tUnit === "week"
        ? tUnit === "week"
          ? "week"
          : "semana"
        : tUnit === "day"
        ? "day"
        : "día";
    const timePlural =
      tUnit === "semana" || tUnit === "week"
        ? tUnit === "week"
          ? "weeks"
          : "semanas"
        : tUnit === "day"
        ? "days"
        : "días";
    description = description.replace(/\bpor hora\b/gi, `por ${timeSingular}`);
    description = description.replace(/\bhoras\b/gi, timePlural);
    description = description.replace(/\bhora\b/gi, timeSingular);
    description = description.replace(/\bhour(s)?\b/gi, (_m, p1) =>
      p1 ? timePlural : timeSingular
    );

    items.push({
      itemCatalogId: catalogItem.id,
      description,
      quantity: quantity,
      unit: unit,
      unitPrice: parseFloat(unitPrice.toFixed(2)),
      subtotal: parseFloat(subtotal.toFixed(2)),
      taxRate: params.taxRate,
      taxAmount: parseFloat(taxAmount.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      sortOrder: i,
    });

    remainingAmount -= subtotal;
  }

  // Adjust last item if needed to match target amount
  if (items.length > 0 && Math.abs(remainingAmount) > 0.01) {
    const lastItem = items[items.length - 1];
    lastItem.subtotal! += remainingAmount;

    const lastUnit = (lastItem.unit || "").toLowerCase();
    if (["proyecto", "project"].includes(lastUnit)) {
      // Para proyectos, fijar cantidad en 1 y ajustar precio unitario
      lastItem.quantity = 1;
      lastItem.unitPrice = parseFloat(lastItem.subtotal!.toFixed(2));
    } else {
      lastItem.quantity = parseFloat(
        (lastItem.subtotal! / lastItem.unitPrice!).toFixed(2)
      );
      if (lastItem.quantity < 1) lastItem.quantity = 1;
    }

    if (params.includeTax) {
      lastItem.taxAmount = parseFloat(
        ((lastItem.subtotal! * params.taxRate) / 100).toFixed(2)
      );
      lastItem.total = parseFloat(
        (lastItem.subtotal! + lastItem.taxAmount).toFixed(2)
      );
    } else {
      lastItem.total = lastItem.subtotal!;
    }
  }

  return items;
};

// Create invoice with line items
export const createInvoice = async (
  request: InvoiceGenerationRequest
): Promise<GeneratedInvoice> => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("User not authenticated");

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
    if (!company) throw new Error("Company not found");

    const generationParams = {
      companyType: company.type,
      targetAmount: request.amount,
      itemCount: request.itemCount,
      includeTax: request.includeTax ?? true,
      taxRate: request.taxRate ?? 16,
    };

    // Try Excel catalog generation first (replacing AI generation)
    try {
      // Get products from Excel catalog (with rubro filter if provided)
      const excelProducts = await excelCatalogService.getRandomProductsForAmount(
        generationParams.targetAmount,
        generationParams.itemCount,
        request.exchangeRate || 36,
        request.rubro
      );

      // Convert Excel products to invoice line items
      lineItems = excelProducts.map((product, index) => {
        const subtotal = product.subtotal;
        const taxAmount = generationParams.includeTax
          ? (subtotal * generationParams.taxRate) / 100
          : 0;
        const total = subtotal + taxAmount;

        return {
          description: product.descripcion,
          quantity: product.quantity,
          unit: product.unidad || "unidad",
          unitPrice: product.precio,
          subtotal: parseFloat(subtotal.toFixed(2)),
          taxRate: generationParams.taxRate,
          taxAmount: parseFloat(taxAmount.toFixed(2)),
          total: parseFloat(total.toFixed(2)),
          sortOrder: index,
        };
      });

      console.log("Generated invoice items from Excel catalog:", lineItems.length);
    } catch (error) {
      console.error("Excel catalog generation failed, falling back to database catalog:", error);
      // Fallback to database catalog-based generation
      lineItems = await generateInvoiceItems(generationParams);
    }

    // Calculate totals from generated items
    lineItems.forEach((item) => {
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
    .from("generated_invoices")
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
      status: "draft",
      notes: request.notes,
    })
    .select()
    .single();

  if (invoiceError) throw invoiceError;

  // Create line items
  if (lineItems.length > 0) {
    console.log("Line items before insert:", lineItems);

    const lineItemsToInsert = lineItems.map((item, index) => {
      const lineItem = {
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        invoice_id: invoice.id,
        item_catalog_id: item.itemCatalogId || null,
        description: item.description || "",
        quantity: item.quantity || 0,
        unit: item.unit || "unidad",
        unit_price: item.unitPrice || 0,
        subtotal: item.subtotal || 0,
        tax_rate: item.taxRate || 0,
        tax_amount: item.taxAmount || 0,
        total: item.total || 0,
        sort_order: item.sortOrder !== undefined ? item.sortOrder : index,
      };

      console.log(`Line item ${index}:`, lineItem);
      return lineItem;
    });

    const { error: itemsError } = await supabase
      .from("invoice_line_items")
      .insert(lineItemsToInsert);

    if (itemsError) throw itemsError;
  }

  return invoice;
};

// Get invoices
export const getInvoices = async (): Promise<GeneratedInvoice[]> => {
  const { data, error } = await supabase
    .from("generated_invoices")
    .select(
      `
      *,
      company:invoice_companies(*),
      lineItems:invoice_line_items(
        *,
        catalogItem:invoice_items_catalog(*)
      )
    `
    )
    .order("invoice_date", { ascending: false });

  if (error) throw error;
  return snakeToCamel(data || []);
};

export const getInvoice = async (
  id: string
): Promise<GeneratedInvoice | null> => {
  const { data, error } = await supabase
    .from("generated_invoices")
    .select(
      `
      *,
      company:invoice_companies(*),
      lineItems:invoice_line_items(
        *,
        catalogItem:invoice_items_catalog(*)
      )
    `
    )
    .eq("id", id)
    .single();

  if (error) throw error;
  return snakeToCamel(data);
};

// Update invoice status
export const updateInvoiceStatus = async (
  id: string,
  status: GeneratedInvoice["status"]
): Promise<void> => {
  const { error } = await supabase
    .from("generated_invoices")
    .update({ status })
    .eq("id", id);

  if (error) throw error;
};

// Delete invoice
export const deleteInvoice = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("generated_invoices")
    .delete()
    .eq("id", id);

  if (error) throw error;
};
