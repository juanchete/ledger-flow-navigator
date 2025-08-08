import {
  InvoiceItemGenerationParams,
  InvoiceLineItem,
  InvoiceCompanyType,
} from "@/types/invoice";

// Gemini API configuration
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

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
  language?: "es" | "en";
}

// Company type descriptions for context
const COMPANY_TYPE_CONTEXT = {
  construction: {
    es: "empresa de construcción venezolana que ofrece servicios de construcción, remodelación, materiales de construcción nacionales e importados, mano de obra calificada, y equipos",
    en: "Venezuelan construction company offering construction services, remodeling, domestic and imported construction materials, skilled labor, and equipment",
  },
  electronics: {
    es: "empresa de electrónica venezolana que vende componentes electrónicos, servicios de instalación eléctrica, iluminación LED, y equipos de seguridad electrónica",
    en: "Venezuelan electronics company selling electronic components, electrical installation services, LED lighting, and electronic security equipment",
  },
  papers: {
    es: "empresa venezolana de papelería y suministros de oficina que vende papel bond nacional, artículos escolares, material de oficina, y servicios de impresión",
    en: "Venezuelan stationery and office supplies company selling domestic bond paper, school supplies, office materials, and printing services",
  },
  electricity: {
    es: "empresa venezolana de servicios eléctricos que ofrece instalaciones eléctricas residenciales e industriales, mantenimiento preventivo, y diagnósticos especializados",
    en: "Venezuelan electrical services company offering residential and industrial electrical installations, preventive maintenance, and specialized diagnostics",
  },
};

// Generate prompt for Gemini based on context
function generatePrompt(context: AIInvoiceContext): string {
  const lang = context.language || "es";
  const companyContext = COMPANY_TYPE_CONTEXT[context.companyType][lang];
  const itemCount = context.itemCount || Math.floor(Math.random() * 6) + 3;

  const prompt =
    lang === "es"
      ? `Eres un experto en generar facturas profesionales para una ${companyContext}.

IMPORTANTE: Estás generando una factura para el mercado VENEZOLANO. TODOS los precios deben estar en BOLÍVARES (Bs.) y reflejar los precios actuales del mercado venezolano.

Genera exactamente ${itemCount} partidas para una factura con las siguientes características:
- Monto total objetivo: Bs. ${context.targetAmount.toFixed(2)} (${context.currency === 'VES' ? 'Bolívares' : 'ya convertido a bolívares'})
${context.clientName ? `- Cliente: ${context.clientName}` : ""}

Requisitos CRÍTICOS para el mercado venezolano:
1. TODOS los precios deben estar en BOLÍVARES (Bs.) - NO uses dólares
2. Los precios deben reflejar la realidad del mercado venezolano actual según el tipo de empresa:
   
   Para CONSTRUCCIÓN:
   - Proyectos pequeños: Bs. 2,000,000 - Bs. 5,000,000
   - Proyectos medianos: Bs. 5,000,000 - Bs. 15,000,000
   - Proyectos grandes: Bs. 15,000,000 - Bs. 50,000,000
   - Estructuras metálicas: Bs. 2,000-3,000 por kg
   - Trabajos por área: Bs. 1,500-6,000 por m²
   
   Para ELECTRÓNICA:
   - Instalaciones pequeñas: Bs. 1,500,000 - Bs. 4,000,000
   - Instalaciones medianas: Bs. 4,000,000 - Bs. 10,000,000
   - Proyectos grandes: Bs. 10,000,000 - Bs. 30,000,000
   - Cable por metro: Bs. 50-200 según calibre
   - Puntos eléctricos: Bs. 300,000-800,000 por punto
   
   Para PAPELERÍA:
   - Pedidos pequeños: Bs. 500,000 - Bs. 2,000,000
   - Pedidos medianos: Bs. 2,000,000 - Bs. 8,000,000
   - Contratos corporativos: Bs. 8,000,000 - Bs. 20,000,000
   - Resma de papel: Bs. 180-300
   - Servicios de impresión: Bs. 1,000-5,000 por página según volumen
   
   Para SERVICIOS ELÉCTRICOS:
   - Servicios residenciales: Bs. 2,000,000 - Bs. 6,000,000
   - Servicios comerciales: Bs. 6,000,000 - Bs. 15,000,000
   - Servicios industriales: Bs. 15,000,000 - Bs. 40,000,000
   - Mantenimiento mensual: Bs. 3,000,000-10,000,000
   - Certificaciones: Bs. 5,000,000-15,000,000

3. NUNCA factures por hora. Usa estas unidades según el tipo de trabajo:
   - Proyectos completos: cantidad = 1
   - Trabajos de área: por m² (construcción, instalaciones)
   - Materiales lineales: por metros (cables, tuberías)
   - Suministros: por lote, proyecto, unidad
   - Servicios: por proyecto, contrato mensual
   - Materiales específicos: por unidad, saco, galón, resma

4. Las descripciones deben ser MUY detalladas como en facturas reales:
   - Incluir todos los componentes del servicio
   - Especificar si incluye materiales
   - Detallar marcas cuando sea relevante
   - Incluir transporte si aplica
   - Mencionar certificaciones o garantías

Ejemplos específicos para cada tipo de empresa:

Para CONSTRUCCIÓN en Venezuela (basado en facturas reales):
- RESTAURACIÓN EN FACHADA DE EDIFICACIÓN (por proyecto o m²), incluye demolición, reparación, fondo antialcalino, pintura impermeabilizante, trabajo en altura con guindola
- TRABAJOS DE ACONDICIONAMIENTO DE PISOS DE GALPÓN (por m²), incluye demolición, mortero de cemento, pintura epóxica industrial
- SUMINISTRO, CONFECCIÓN Y COLOCACIÓN DE ESTRUCTURAS METÁLICAS (por kg), incluye transporte hasta 50km
- CONSTRUCCIÓN DE TENSOESTRUCTURAS (por unidad), con lona y tubo redondo mecánico, incluye guayas, anclajes, transporte y montaje
- TRABAJOS DE REEMPLAZO DE ESTRUCTURAS METÁLICAS/REJAS (por proyecto), incluye remoción, fabricación, fondo antialcalino, esmalte industrial
- SUMINISTRO DE MATERIALES PARA RESTAURACIÓN (por proyecto), puede incluir fondo de herrería, pintura esmalte, lija, etc.
- SUMINISTRO DE POLICARBONATO ALVEOLAR (por metros lineales), incluye perfiles, kit de instalación, transporte
- CONFECCIÓN DE ESCALERAS (por kg de material), en cabilla y pletina
- LIMPIEZA CON CHORRO DE ARENA (por m²)

Para ELECTRÓNICA en Venezuela (basado en prácticas del mercado):
- SUMINISTRO E INSTALACIÓN DE SISTEMA DE ILUMINACIÓN LED (por proyecto), incluye luminarias, cableado, breakers, mano de obra
- SUMINISTRO DE CABLE THW CALIBRE 12 AWG MARCA CABEL (por metros), incluye transporte
- INSTALACIÓN DE PUNTOS ELÉCTRICOS 110V RESIDENCIALES (por proyecto o punto), incluye materiales y mano de obra
- SUMINISTRO E INSTALACIÓN DE TABLERO ELÉCTRICO TRIFÁSICO (por proyecto), incluye breakers, borneras, mano de obra
- SISTEMA DE RESPALDO UPS 3KVA CON INSTALACIÓN (por proyecto), incluye baterías, cableado, puesta en marcha
- MODERNIZACIÓN DE INSTALACIONES ELÉCTRICAS (por proyecto o área m²), incluye diagnóstico, materiales, certificación
- SUMINISTRO DE MATERIALES ELÉCTRICOS VARIOS (por proyecto), puede incluir tomacorrientes, switches, breakers

Para PAPELERÍA en Venezuela (basado en prácticas del mercado):
- SUMINISTRO DE PAPELERÍA PARA OFICINA (por proyecto o lote), incluye resmas, carpetas, grapadoras, bolígrafos
- SERVICIO DE IMPRESIÓN Y ENCUADERNACIÓN DE DOCUMENTOS (por proyecto), incluye papel, tinta, espirales
- SUMINISTRO DE MATERIAL ESCOLAR (por lote o proyecto), incluye cuadernos, lápices, marcadores, carpetas
- SERVICIO DE FOTOCOPIADO DE ALTO VOLUMEN (por proyecto o miles de páginas), incluye papel y tóner
- SUMINISTRO DE CARTUCHOS Y TÓNERS PARA IMPRESORAS (por lote), varias marcas y modelos
- SERVICIO DE DISEÑO E IMPRESIÓN DE MATERIAL CORPORATIVO (por proyecto), incluye diseño, impresión, acabados
- ORGANIZACIÓN Y ARCHIVO DE DOCUMENTACIÓN (por proyecto), incluye carpetas, cajas archivo, etiquetado

Para SERVICIOS ELÉCTRICOS en Venezuela (basado en prácticas del mercado):
- INSTALACIÓN ELÉCTRICA RESIDENCIAL COMPLETA (por proyecto o m²), incluye diseño, materiales, certificación
- MANTENIMIENTO PREVENTIVO DE SISTEMAS ELÉCTRICOS (por proyecto o contrato mensual), incluye revisión, ajustes, informe
- INSTALACIÓN DE SISTEMA DE PUESTA A TIERRA (por proyecto), incluye materiales, excavación, medición de resistencia
- ACONDICIONAMIENTO ELÉCTRICO PARA AIRES ACONDICIONADOS (por proyecto), líneas 220V, breakers, cableado
- DIAGNÓSTICO Y CORRECCIÓN DE FALLAS ELÉCTRICAS (por proyecto), incluye localización, reparación, pruebas
- CERTIFICACIÓN DE INSTALACIONES ELÉCTRICAS SIDOR/CORPOELEC (por proyecto), incluye mediciones, informe técnico
- INSTALACIÓN DE BANCO DE CAPACITORES (por proyecto), corrección factor de potencia, incluye equipos

IMPORTANTE para facturación en Venezuela:
- Los precios deben ser coherentes: si el total es Bs. 100,000, no puede haber items de Bs. 10
- Considera la inflación: los precios venezolanos son altos en números
- Diferencia entre productos nacionales (más baratos) e importados (más caros)
- Las cantidades deben ser lógicas para el contexto
- NUNCA uses centavos, redondea a bolívares enteros

Formato de descripciones para Venezuela:
- Especifica si es producto nacional o importado
- Menciona marcas conocidas en el mercado venezolano
- Incluye ubicación de origen cuando sea relevante (ej: "Arena del Guárico")
- Para servicios, especifica si incluye materiales
- Adapta las especificaciones técnicas a normas venezolanas (COVENIN cuando aplique)

Responde ÚNICAMENTE con un array JSON en este formato exacto:
[
  {
    "description": "DESCRIPCIÓN TÉCNICA DETALLADA DE CONSTRUCCIÓN INCLUYENDO MATERIALES, ESPECIFICACIONES, MÉTODO DE INSTALACIÓN Y COMPONENTES INCLUIDOS",
    "quantity": number,
    "unit": "unidad de medida",
    "unitPrice": number
  }
]

No incluyas texto adicional, solo el array JSON.`
      : `You are an expert in generating professional invoices for a ${companyContext}.

IMPORTANT: You are generating an invoice for the VENEZUELAN market. ALL prices must be in BOLIVARES (Bs.) and reflect current Venezuelan market prices.

Generate exactly ${itemCount} items for an invoice with the following characteristics:
- Target total amount: Bs. ${context.targetAmount.toFixed(2)} (Bolivares)
${context.clientName ? `- Client: ${context.clientName}` : ""}

CRITICAL Requirements for Venezuelan market:
1. ALL prices must be in BOLIVARES (Bs.) - DO NOT use dollars
2. Prices must reflect Venezuelan market reality based on business type
3. NEVER bill by hours. Use these units based on work type:
   - Complete projects: quantity = 1
   - Area work: per m² (construction, installations)
   - Linear materials: per meters (cables, pipes)
   - Supplies: per lot, project, unit
   - Services: per project, monthly contract
4. Use typical Venezuelan market products and services
5. Quantities must be realistic for Venezuelan context
6. Round to whole bolivares - no cents

Respond ONLY with a JSON array in this exact format:
[
  {
    "description": "DETAILED DESCRIPTION INCLUDING IF NATIONAL OR IMPORTED",
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
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 1,
          topP: 1,
          maxOutputTokens: 2048,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_NONE",
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_NONE",
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_NONE",
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_NONE",
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data: GeminiResponse = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error("No response from Gemini API");
    }

    const text = data.candidates[0].content.parts[0].text;

    // Extract JSON from the response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("Invalid response format from Gemini API");
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Error calling Gemini API:", error);
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
      targetAmount: params.includeTax
        ? params.targetAmount / (1 + params.taxRate / 100)
        : params.targetAmount,
      currency: context.currency === 'VES' ? 'VES' : 'VES', // Siempre trabajar en bolívares para facturas venezolanas
      itemCount: params.itemCount,
      language: "es",
      ...context,
    };

    // Generate prompt and call API
    const prompt = generatePrompt(fullContext);
    const aiItems = await callGeminiAPI(prompt);

    // Convert AI response to invoice line items
    const items: Partial<InvoiceLineItem>[] = aiItems.map((item, index) => {
      const quantity = parseFloat(item.quantity.toString());
      const unitPrice = parseFloat(item.unitPrice.toString());
      const subtotal = quantity * unitPrice;
      const taxAmount = params.includeTax
        ? (subtotal * params.taxRate) / 100
        : 0;
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
        sortOrder: index,
      };
    });

    // Adjust last item to match target amount exactly if needed
    const currentTotal = items.reduce(
      (sum, item) => sum + (item.subtotal || 0),
      0
    );
    const targetSubtotal = fullContext.targetAmount;
    const difference = targetSubtotal - currentTotal;

    if (Math.abs(difference) > 0.01 && items.length > 0) {
      const lastItem = items[items.length - 1];
      lastItem.subtotal = parseFloat(
        (lastItem.subtotal! + difference).toFixed(2)
      );
      lastItem.quantity = parseFloat(
        (lastItem.subtotal / lastItem.unitPrice!).toFixed(2)
      );

      if (params.includeTax) {
        lastItem.taxAmount = parseFloat(
          ((lastItem.subtotal * params.taxRate) / 100).toFixed(2)
        );
        lastItem.total = parseFloat(
          (lastItem.subtotal + lastItem.taxAmount).toFixed(2)
        );
      } else {
        lastItem.total = lastItem.subtotal;
      }
    }

    return items;
  } catch (error) {
    console.error("Error generating AI invoice items:", error);
    // Rethrow to allow fallback to catalog-based generation
    throw error;
  }
}

// Validate AI-generated items
export function validateAIItems(items: Partial<InvoiceLineItem>[]): boolean {
  return items.every(
    (item) =>
      item.description &&
      item.description.length > 0 &&
      typeof item.quantity === "number" &&
      item.quantity > 0 &&
      item.unit &&
      item.unit.length > 0 &&
      typeof item.unitPrice === "number" &&
      item.unitPrice > 0 &&
      typeof item.subtotal === "number" &&
      typeof item.total === "number"
  );
}
