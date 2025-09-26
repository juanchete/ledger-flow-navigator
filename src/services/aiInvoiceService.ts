import {
  InvoiceItemGenerationParams,
  InvoiceLineItem,
  InvoiceCompanyType,
} from "@/types/invoice";
import { excelCatalogService } from "@/services/excelCatalogService";

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
  exchangeRate?: number;
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
  const exchangeRate = context.exchangeRate || 36; // Usar tasa dinámica o valor por defecto

  const prompt =
    lang === "es"
      ? `Eres un experto en generar facturas profesionales para una ${companyContext}, con un profundo conocimiento de los precios, materiales y prácticas del mercado local.

Tu tarea es generar exactamente ${itemCount} partidas para una factura con las siguientes características:

- **Monto total objetivo:** Bs. ${context.targetAmount.toFixed(2)}
- **Cliente:** ${context.clientName || "Cliente Genérico"}

### Requisitos Esenciales para el Mercado Venezolano:

1.  **ESTRATEGIA SEGÚN EL MONTO TOTAL:**
    -   **Facturas pequeñas (< Bs. ${Math.round(
      5000000
    )}):** Genera ${itemCount} items de materiales y servicios individuales
    -   **Facturas medianas (Bs. ${Math.round(5000000)} - Bs. ${Math.round(
          20000000
        )}):** Combina 2-3 proyectos pequeños con algunos materiales
    -   **Facturas grandes (> Bs. ${Math.round(
      20000000
    )}):** Genera 1-3 PROYECTOS GRANDES con cantidad = 1

2.  **Moneda y Precios:**
    -   Todos los precios deben estar en **BOLÍVARES (Bs.)**.
    -   Tasa de cambio actual: **${exchangeRate} Bs. por dólar**.
    -   **PRECIOS DE REFERENCIA (UNITARIOS MÁS ALTOS):**
        -   **Proyectos completos:** Bs. ${Math.round(
          500000 * exchangeRate
        )} - Bs. ${Math.round(5000000 * exchangeRate)}
        -   **Trabajos por m²:** Bs. ${Math.round(
          100 * exchangeRate
        )} - Bs. ${Math.round(500 * exchangeRate)}
        -   **Estructuras metálicas (kg):** Bs. ${Math.round(
          5 * exchangeRate
        )} - Bs. ${Math.round(10 * exchangeRate)}
        -   **Pintura (galón):** Bs. ${Math.round(
          50 * exchangeRate
        )} - Bs. ${Math.round(100 * exchangeRate)}
        -   **Cemento (saco):** Bs. ${Math.round(
          15 * exchangeRate
        )} - Bs. ${Math.round(25 * exchangeRate)}

3.  **UNIDADES PERMITIDAS (sin horas):**
    -   **Proyectos grandes:** "proyecto" (cantidad = 1)
    -   **Áreas:** "m²" (NO "m²/día")
    -   **Materiales:** "kg", "galón", "saco", "unidad", "metro"
    -   **Tiempo (si aplica):** "día", "semana" (NO horas)
    -   **PROHIBIDO:** hora, día, hora/día, m²/día

4.  **Cantidades ESTRICTAMENTE Realistas (REDUCIDAS):**
    -   **Proyectos completos:** SIEMPRE cantidad = 1
    -   **Tiempo:** 1-20 días, 1-8 semanas
    -   **Materiales líquidos:** 5-30 galones máximo
    -   **Sacos de cemento:** 10-100 sacos máximo
    -   **Bloques/unidades:** 100-2000 unidades máximo
    -   **Kilos de metal:** 50-2000 kg máximo
    -   **Metros lineales:** 10-500 metros máximo
    -   **Áreas en m²:** según el proyecto, normalmente 50-1500 m²

5.  **Descripciones para PROYECTOS GRANDES (obligatorio para montos altos):**
    -   Deben ser LARGAS y DETALLADAS como estos ejemplos reales:
    
    Ejemplo 1: "RESTAURACION EN FACHADA DE EDIFICACION CON EXTENSION DE 1285,60MTS2. INCLUYE: -DEMOLICION DE FRISO Y PINTURA LEVANTADA EN FACHADA (CON USO DE GUINDOLA/TRABAJO DE RIESGO) -REPARACION DE FRISO (CON USO DE GUINDOLA/TRABAJO DE RIESGO) -SUMINISTRO Y APLICACION DE FONDO ANTIALCALINO (CON USO DE GUINDOLA/TRABAJO DE RIESGO) -SUMINISTRO Y APLICACION DE PINTURA IMPERMEABILIZANTE HIDROFUGA PARA EXTERIORES (CON USO DE GUINDOLA/TRABAJO DE RIESGO)"
    
    Ejemplo 2: "TRABAJOS DE ACONDICIONAMIENTO EN ZONA DE PISO DE GALPON 637MTS2. INCLUYE: -DEMOLICION DE SOBREPISO AFECTADO -SUMINISTRO Y APLICACION DE MORTERO DE CEMENTO DE PISO PARA NIVELACION CON ADHITIVO DE FRAGUADO, ACABADO LISO -SUMINISTRO Y APLICACION DE DOS CAPAS DE PINTURA EPOXICA INDUSTRIAL COLOR GRIS EN PISO"
    
    Ejemplo 3: "SUMINISTRO, CONFECCIÓN Y COLOCACIÓN DE ESTRUCTURA METALICA PARA GALPÓN DE 850M2. INCLUYE: -DISEÑO Y CÁLCULO ESTRUCTURAL -FABRICACIÓN DE ESTRUCTURA EN TALLER CON PERFILES IPE Y TUBULARES -TRANSPORTE HASTA OBRA (50KM) -MONTAJE CON GRÚA Y EQUIPOS ESPECIALIZADOS -APLICACIÓN DE FONDO ANTICORROSIVO Y ESMALTE INDUSTRIAL -ANCLAJES Y PERNOS DE FIJACIÓN"

    -   DEBE incluir: área/cantidad total, TODOS los pasos del proceso, materiales específicos, marcas cuando aplique, si incluye trabajo de alto riesgo
    -   Para materiales sueltos: descripciones más cortas pero específicas (marca, tipo, especificaciones)

6.  **INSTRUCCIONES CRÍTICAS PARA PRECIOS UNITARIOS:**
    -   **TODOS los unitPrice deben estar en BOLÍVARES y ser números enteros**
    -   **NUNCA generes un unitPrice menor a Bs. ${Math.round(
      100 * exchangeRate
    )}**
    -   **USA ESTOS RANGOS OBLIGATORIOS para unitPrice:**
        -   Proyectos: Bs. ${Math.round(
          500000 * exchangeRate
        )} - Bs. ${Math.round(5000000 * exchangeRate)}
        -   Trabajo por m²: Bs. ${Math.round(
          100 * exchangeRate
        )} - Bs. ${Math.round(500 * exchangeRate)}
        -   Pintura/galón: Bs. ${Math.round(
          50 * exchangeRate
        )} - Bs. ${Math.round(100 * exchangeRate)}
        -   Cemento/saco: Bs. ${Math.round(
          15 * exchangeRate
        )} - Bs. ${Math.round(25 * exchangeRate)}
        -   Metal/kg: Bs. ${Math.round(5 * exchangeRate)} - Bs. ${Math.round(
          10 * exchangeRate
        )}
    -   **EJEMPLOS DE unitPrice CORRECTOS (con tasa ${exchangeRate}):**
        -   Proyecto restauración: unitPrice = ${Math.round(
          2000000 * exchangeRate
        )}
        -   Pintura galón: unitPrice = ${Math.round(75 * exchangeRate)}
        -   Cemento saco: unitPrice = ${Math.round(20 * exchangeRate)}
    -   **SI PIENSAS EN DÓLARES, MULTIPLICA POR ${exchangeRate}**

7.  **Formato y Coherencia:**
    -   Para facturas grandes, NO generes muchos items pequeños
    -   El total debe cuadrar con el monto objetivo


Responde ÚNICAMENTE con un array JSON en este formato exacto:
[
  {
    "description": "DESCRIPCIÓN TÉCNICA DETALLADA INCLUYENDO MATERIALES, ESPECIFICACIONES, MÉTODO Y COMPONENTES",
    "quantity": number,
    "unit": "unidad de medida", 
    "unitPrice": number
  }
]

No incluyas texto adicional, solo el array JSON.`
      : `You are an expert in generating professional invoices for a ${companyContext}, with deep knowledge of prices, materials, and local market practices.

Your task is to generate exactly ${itemCount} items for an invoice with the following characteristics:

- **Target total amount:** Bs. ${context.targetAmount.toFixed(2)}
- **Client:** ${context.clientName || "Generic Client"}

### Essential Requirements for the Venezuelan Market:

1. **STRATEGY BASED ON TOTAL AMOUNT:**
   - **Small invoices (< Bs. ${Math.round(
     5000000
   )}):** Generate ${itemCount} individual material and service items
   - **Medium invoices (Bs. ${Math.round(5000000)} - Bs. ${Math.round(
          20000000
        )}):** Combine 2-3 small projects with some materials
   - **Large invoices (> Bs. ${Math.round(
     20000000
   )}):** Generate 1-3 LARGE PROJECTS with quantity = 1

2. **Currency and Prices:**
   - All prices must be in **BOLIVARES (Bs.)**.
   - Current exchange rate: **${exchangeRate} Bs. per dollar**.
   - **REFERENCE PRICES (HIGHER UNIT PRICES):**
     - **Complete projects:** Bs. ${Math.round(
       500000 * exchangeRate
     )} - Bs. ${Math.round(5000000 * exchangeRate)}
     - **Area work (m²):** Bs. ${Math.round(
       100 * exchangeRate
     )} - Bs. ${Math.round(500 * exchangeRate)}
     - **Metal structures (kg):** Bs. ${Math.round(
       5 * exchangeRate
     )} - Bs. ${Math.round(10 * exchangeRate)}
     - **Paint (gallon):** Bs. ${Math.round(
       50 * exchangeRate
     )} - Bs. ${Math.round(100 * exchangeRate)}
     - **Cement (bag):** Bs. ${Math.round(
       15 * exchangeRate
     )} - Bs. ${Math.round(25 * exchangeRate)}

3. **ALLOWED UNITS (no hours):**
   - **Large projects:** "project" (quantity = 1)
   - **Areas:** "m²" (NOT "m²/day")
   - **Materials:** "kg", "gallon", "bag", "unit", "meter"
   - **Time (if applicable):** "day", "week" (NO hours)
   - **PROHIBITED:** hour, hour/day, m²/day

4. **STRICTLY Realistic Quantities (REDUCED):**
   - **Complete projects:** ALWAYS quantity = 1
   - **Time:** 1-20 days, 1-8 weeks
   - **Liquid materials:** 5-30 gallons maximum
   - **Cement bags:** 10-100 bags maximum
   - **Blocks/units:** 100-2000 units maximum
   - **Metal kilos:** 50-2000 kg maximum
   - **Linear meters:** 10-500 meters maximum
   - **Areas in m²:** depending on project, normally 50-1500 m²

5. **Descriptions for LARGE PROJECTS (mandatory for high amounts):**
   - Must be LONG and DETAILED like these real examples:
   
   Example 1: "FACADE RESTORATION OF BUILDING WITH 1285.60M2 EXTENSION. INCLUDES: -DEMOLITION OF PLASTER AND LOOSE PAINT ON FACADE (USING GONDOLA/HIGH RISK WORK) -PLASTER REPAIR (USING GONDOLA/HIGH RISK WORK) -SUPPLY AND APPLICATION OF ANTI-ALKALINE PRIMER (USING GONDOLA/HIGH RISK WORK) -SUPPLY AND APPLICATION OF WATERPROOF EXTERIOR PAINT (USING GONDOLA/HIGH RISK WORK)"
   
   - MUST include: total area/quantity, ALL process steps, specific materials, brands when applicable, if it includes high-risk work

6. **CRITICAL INSTRUCTIONS FOR UNIT PRICES:**
   - **ALL unitPrice must be in BOLIVARES and be whole numbers**
   - **NEVER generate a unitPrice less than Bs. ${Math.round(
     100 * exchangeRate
   )}**
   - **USE THESE MANDATORY RANGES for unitPrice:**
     - Projects: Bs. ${Math.round(500000 * exchangeRate)} - Bs. ${Math.round(
          5000000 * exchangeRate
        )}
     - Work per m²: Bs. ${Math.round(100 * exchangeRate)} - Bs. ${Math.round(
          500 * exchangeRate
        )}
     - Paint/gallon: Bs. ${Math.round(50 * exchangeRate)} - Bs. ${Math.round(
          100 * exchangeRate
        )}
     - Cement/bag: Bs. ${Math.round(15 * exchangeRate)} - Bs. ${Math.round(
          25 * exchangeRate
        )}
     - Metal/kg: Bs. ${Math.round(5 * exchangeRate)} - Bs. ${Math.round(
          10 * exchangeRate
        )}
   - **EXAMPLES OF CORRECT unitPrice (with rate ${exchangeRate}):**
     - Restoration project: unitPrice = ${Math.round(2000000 * exchangeRate)}
     - Paint gallon: unitPrice = ${Math.round(75 * exchangeRate)}
     - Cement bag: unitPrice = ${Math.round(20 * exchangeRate)}
   - **IF YOU THINK IN DOLLARS, MULTIPLY BY ${exchangeRate}**

7. **Format and Coherence:**
   - For large invoices, DO NOT generate many small items
   - Total must match target amount

Respond ONLY with a JSON array in this exact format:
[
  {
    "description": "DETAILED TECHNICAL DESCRIPTION INCLUDING MATERIALS, SPECIFICATIONS, METHOD AND COMPONENTS",
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

// Generate AI-powered invoice items (NOW USES EXCEL CATALOG)
export async function generateAIInvoiceItems(
  params: InvoiceItemGenerationParams,
  context?: Partial<AIInvoiceContext>
): Promise<Partial<InvoiceLineItem>[]> {
  try {
    // First try to use Excel catalog instead of AI
    console.log("Using Excel catalog for invoice generation");

    const excelProducts = await excelCatalogService.getRandomProductsForAmount(
      params.includeTax
        ? params.targetAmount / (1 + params.taxRate / 100)
        : params.targetAmount,
      params.itemCount,
      context?.exchangeRate || 36
    );

    // Convert Excel products to invoice line items
    const items: Partial<InvoiceLineItem>[] = excelProducts.map((product, index) => {
      const subtotal = product.subtotal;
      const taxAmount = params.includeTax
        ? (subtotal * params.taxRate) / 100
        : 0;
      const total = subtotal + taxAmount;

      return {
        description: product.descripcion,
        quantity: product.quantity,
        unit: product.unidad || "unidad",
        unitPrice: product.precio,
        subtotal: parseFloat(subtotal.toFixed(2)),
        taxRate: params.taxRate,
        taxAmount: parseFloat(taxAmount.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
        sortOrder: index,
      };
    });

    return items;
  } catch (excelError) {
    console.error("Excel catalog failed, falling back to AI generation:", excelError);

    // If Excel fails, try original AI generation
    try {
    // Prepare context
    const fullContext: AIInvoiceContext = {
      companyType: params.companyType,
      targetAmount: params.includeTax
        ? params.targetAmount / (1 + params.taxRate / 100)
        : params.targetAmount,
      currency: context.currency === "VES" ? "VES" : "VES", // Siempre trabajar en bolívares para facturas venezolanas
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
      let unitPrice = parseFloat(item.unitPrice.toString());
      let unit = (item.unit || "").toString();

      // Corregir precios que parezcan estar en dólares (menos de 1000 Bs.)
      const minPriceInBs = 1000; // Precio mínimo razonable en bolívares
      const exchangeRate = context?.exchangeRate || 36;

      if (unitPrice < minPriceInBs) {
        console.warn(
          `Precio muy bajo detectado: Bs. ${unitPrice}. Multiplicando por tasa de cambio ${exchangeRate}`
        );
        unitPrice = Math.round(unitPrice * exchangeRate);
      }

      // Aplicar pisos por unidad y un piso global mínimo
      const unitName = (item.unit || "").toString().toLowerCase();
      const perUnitMinInUSD: Record<string, number> = {
        galón: 50,
        gallon: 50,
        saco: 15,
        bag: 15,
        kg: 5,
        "m²": 100,
        m2: 100,
        sqm: 100,
        "m³": 150,
        m3: 150,
        unidad: 10,
        unit: 10,
        metro: 10,
        meter: 10,
        proyecto: 500000,
        project: 500000,
        día: 200,
        day: 200,
        semana: 1000,
        week: 1000,
      };
      const floorUSD = perUnitMinInUSD[unitName];
      const globalMinBs = 100 * exchangeRate; // Piso global recomendado en el prompt
      const unitMinBs = floorUSD ? floorUSD * exchangeRate : globalMinBs;
      if (unitPrice < unitMinBs) {
        unitPrice = Math.round(unitMinBs);
      }

      // Asegurar que el precio sea un número entero
      unitPrice = Math.round(unitPrice);

      // Convertir unidades en horas a día/semana con cantidades realistas
      let finalQuantity = quantity;
      const unitLower = unit.toLowerCase();
      if (unitLower === "hora" || unitLower === "hour") {
        if (quantity >= 40) {
          unit = unitLower === "hour" ? "week" : "semana";
          finalQuantity = Math.max(1, Math.ceil(quantity / 40));
        } else {
          unit = unitLower === "hour" ? "day" : "día";
          finalQuantity = Math.max(1, Math.ceil(quantity / 8));
        }
      }

      // Forzar cantidades enteras y mínimas de 1
      finalQuantity = Math.max(1, Math.round(finalQuantity));

      // Normalizar descripciones para evitar "hora"
      let description = (item.description || "").toString();
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
      // Reemplazos con límites de palabra (no afecta "ahora")
      description = description.replace(
        /\bpor hora\b/gi,
        `por ${timeSingular}`
      );
      description = description.replace(/\bhoras\b/gi, timePlural);
      description = description.replace(/\bhora\b/gi, timeSingular);
      description = description.replace(/\bhour(s)?\b/gi, (_m, p1) =>
        p1 ? timePlural : timeSingular
      );

      const subtotal = finalQuantity * unitPrice;
      const taxAmount = params.includeTax
        ? (subtotal * params.taxRate) / 100
        : 0;
      const total = subtotal + taxAmount;

      return {
        description,
        quantity: finalQuantity,
        unit: unit,
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

      // Para proyectos, ajustar el precio unitario y fijar cantidad = 1
      const lastUnit = (lastItem.unit || "").toString().toLowerCase();
      if (["proyecto", "project"].includes(lastUnit)) {
        lastItem.unitPrice = Math.round(lastItem.subtotal!);
        lastItem.quantity = 1;
      } else {
        const recomputedQty = lastItem.subtotal! / (lastItem.unitPrice || 1);
        lastItem.quantity = Math.max(1, Math.round(recomputedQty));
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
  } catch (error) {
    console.error("Error generating AI invoice items:", error);
    // Rethrow to allow fallback to catalog-based generation
    throw error;
  }
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
