import { InvoiceItemGenerationParams, InvoiceLineItem, InvoiceCompanyType } from '@/types/invoice';

// Gemini API configuration
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-002:generateContent';

interface GeminiResponse {
  candidates: {
    content: {
      parts: {
        text: string;
      }[];
    };
  }[];
}

interface AIInvoiceContext {
  companyType: InvoiceCompanyType;
  targetAmount: number;
  currency: string;
  clientName?: string;
  itemCount?: number;
  language?: 'es' | 'en';
}

// Company type descriptions for context
const COMPANY_TYPE_CONTEXT = {
  construction: {
    es: 'empresa de construcción que ofrece servicios de construcción, remodelación, materiales de construcción, mano de obra, y equipos',
    en: 'construction company offering construction services, remodeling, construction materials, labor, and equipment'
  },
  electronics: {
    es: 'empresa de electrónica que vende componentes electrónicos, servicios de instalación eléctrica, iluminación, y equipos',
    en: 'electronics company selling electronic components, electrical installation services, lighting, and equipment'
  },
  papers: {
    es: 'empresa de papelería y suministros de oficina que vende papel, artículos de oficina, y servicios de impresión',
    en: 'stationery and office supplies company selling paper, office supplies, and printing services'
  },
  electricity: {
    es: 'empresa de servicios eléctricos que ofrece instalaciones eléctricas, mantenimiento, y diagnósticos',
    en: 'electrical services company offering electrical installations, maintenance, and diagnostics'
  }
};

// Generate prompt for Gemini based on context
function generatePrompt(context: AIInvoiceContext): string {
  const lang = context.language || 'es';
  const companyContext = COMPANY_TYPE_CONTEXT[context.companyType][lang];
  const itemCount = context.itemCount || Math.floor(Math.random() * 6) + 3;

  const prompt = lang === 'es' 
    ? `Eres un experto en generar facturas profesionales para una ${companyContext}.
    
Genera exactamente ${itemCount} items para una factura con las siguientes características:
- Monto total objetivo: ${context.currency} ${context.targetAmount.toFixed(2)}
${context.clientName ? `- Cliente: ${context.clientName}` : ''}

Requisitos:
1. Los items deben ser realistas y relevantes para el tipo de empresa
2. Cada item debe incluir: descripción detallada, cantidad, unidad de medida, y precio unitario
3. Las cantidades y precios deben ser realistas para el mercado venezolano/latinoamericano
4. La suma de todos los items debe aproximarse al monto objetivo
5. Usa unidades apropiadas (unidad, hora, día, m², m³, kg, etc.)
6. Las descripciones deben ser profesionales y detalladas

Responde ÚNICAMENTE con un JSON array en este formato exacto:
[
  {
    "description": "descripción detallada del item",
    "quantity": número,
    "unit": "unidad de medida",
    "unitPrice": número
  }
]

No incluyas ningún texto adicional, solo el JSON array.`
    : `You are an expert in generating professional invoices for a ${companyContext}.
    
Generate exactly ${itemCount} items for an invoice with the following characteristics:
- Target total amount: ${context.currency} ${context.targetAmount.toFixed(2)}
${context.clientName ? `- Client: ${context.clientName}` : ''}

Requirements:
1. Items must be realistic and relevant to the company type
2. Each item must include: detailed description, quantity, unit of measure, and unit price
3. Quantities and prices must be realistic for the Latin American market
4. The sum of all items should approximate the target amount
5. Use appropriate units (unit, hour, day, m², m³, kg, etc.)
6. Descriptions must be professional and detailed

Respond ONLY with a JSON array in this exact format:
[
  {
    "description": "detailed item description",
    "quantity": number,
    "unit": "unit of measure",
    "unitPrice": number
  }
]

Do not include any additional text, only the JSON array.`;

  return prompt;
}

// Call Gemini API
async function callGeminiAPI(prompt: string): Promise<any[]> {
  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 1,
          topP: 1,
          maxOutputTokens: 2048,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_NONE"
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data: GeminiResponse = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response from Gemini API');
    }

    const text = data.candidates[0].content.parts[0].text;
    
    // Extract JSON from the response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Invalid response format from Gemini API');
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw error;
  }
}

// Generate AI-powered invoice items
export async function generateAIInvoiceItems(
  params: InvoiceItemGenerationParams,
  context?: Partial<AIInvoiceContext>
): Promise<Partial<InvoiceLineItem>[]> {
  try {
    // Prepare context
    const fullContext: AIInvoiceContext = {
      companyType: params.companyType,
      targetAmount: params.includeTax ? params.targetAmount / (1 + params.taxRate / 100) : params.targetAmount,
      currency: 'USD',
      itemCount: params.itemCount,
      language: 'es',
      ...context
    };

    // Generate prompt and call API
    const prompt = generatePrompt(fullContext);
    const aiItems = await callGeminiAPI(prompt);

    // Convert AI response to invoice line items
    const items: Partial<InvoiceLineItem>[] = aiItems.map((item, index) => {
      const quantity = parseFloat(item.quantity.toString());
      const unitPrice = parseFloat(item.unitPrice.toString());
      const subtotal = quantity * unitPrice;
      const taxAmount = params.includeTax ? (subtotal * params.taxRate / 100) : 0;
      const total = subtotal + taxAmount;

      return {
        description: item.description,
        quantity: quantity,
        unit: item.unit,
        unitPrice: unitPrice,
        subtotal: parseFloat(subtotal.toFixed(2)),
        taxRate: params.taxRate,
        taxAmount: parseFloat(taxAmount.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
        sortOrder: index
      };
    });

    // Adjust last item to match target amount exactly if needed
    const currentTotal = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    const targetSubtotal = fullContext.targetAmount;
    const difference = targetSubtotal - currentTotal;

    if (Math.abs(difference) > 0.01 && items.length > 0) {
      const lastItem = items[items.length - 1];
      lastItem.subtotal = parseFloat((lastItem.subtotal! + difference).toFixed(2));
      lastItem.quantity = parseFloat((lastItem.subtotal / lastItem.unitPrice!).toFixed(2));
      
      if (params.includeTax) {
        lastItem.taxAmount = parseFloat((lastItem.subtotal * params.taxRate / 100).toFixed(2));
        lastItem.total = parseFloat((lastItem.subtotal + lastItem.taxAmount).toFixed(2));
      } else {
        lastItem.total = lastItem.subtotal;
      }
    }

    return items;
  } catch (error) {
    console.error('Error generating AI invoice items:', error);
    // Rethrow to allow fallback to catalog-based generation
    throw error;
  }
}

// Validate AI-generated items
export function validateAIItems(items: Partial<InvoiceLineItem>[]): boolean {
  return items.every(item => 
    item.description && 
    item.description.length > 0 &&
    typeof item.quantity === 'number' && 
    item.quantity > 0 &&
    item.unit && 
    item.unit.length > 0 &&
    typeof item.unitPrice === 'number' && 
    item.unitPrice > 0 &&
    typeof item.subtotal === 'number' &&
    typeof item.total === 'number'
  );
}