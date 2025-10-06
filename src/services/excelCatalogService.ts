import * as XLSX from 'xlsx';

export type InvoiceRubro = 'Ferretería' | 'Construcción' | 'Tecnología';

export interface IExcelProduct {
  codigo?: string;
  descripcion: string;
  precio: number;
  precioUSD?: number;
  categoria?: string;
  unidad?: string;
  marca?: string;
  rubro?: InvoiceRubro;
}

class ExcelCatalogService {
  private products: IExcelProduct[] = [];
  private isLoaded: boolean = false;
  private catalogPath: string = '/Catalogo_Completo_Clasificado.xlsx';

  /**
   * Load and parse the Excel catalog file
   * @param exchangeRate - Optional exchange rate to use for conversion (default: 36)
   */
  async loadCatalog(exchangeRate: number = 36): Promise<void> {
    if (this.isLoaded) {
      return;
    }

    try {
      // Fetch the Excel file from public directory
      const response = await fetch(this.catalogPath);
      const arrayBuffer = await response.arrayBuffer();

      // Parse Excel file
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      // Get the first worksheet
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: ''
      }) as any[][];

      // Parse products from Excel data
      this.products = this.parseExcelData(jsonData, exchangeRate);
      this.isLoaded = true;

      console.log(`Loaded ${this.products.length} products from Excel catalog with exchange rate: ${exchangeRate}`);
    } catch (error) {
      console.error('Error loading Excel catalog:', error);
      // Fallback to empty catalog
      this.products = [];
      this.isLoaded = true;
    }
  }

  /**
   * Parse Excel data into product objects
   */
  private parseExcelData(data: any[][], exchangeRate: number = 36): IExcelProduct[] {
    if (data.length < 2) {
      return [];
    }

    // Try to identify columns by header names
    const headers = data[0].map(h => String(h).toLowerCase().trim());

    // Find column indices
    const findColumn = (possibleNames: string[]): number => {
      for (const name of possibleNames) {
        const index = headers.findIndex(h => h.includes(name));
        if (index !== -1) return index;
      }
      return -1;
    };

    const codigoCol = findColumn(['codigo', 'código', 'cod', 'sku', 'referencia']);
    const descripcionCol = findColumn(['descripcion', 'descripción', 'nombre', 'producto', 'articulo', 'artículo']);
    const precioCol = findColumn(['precio', 'costo', 'valor', 'monto', 'bs', 'bolivares']);
    const precioUSDCol = findColumn(['usd', 'dolar', 'dollar', '$', 'precio (usd)', 'precio usd']);
    const categoriaCol = findColumn(['categoria', 'categoría', 'tipo', 'grupo']);
    const unidadCol = findColumn(['unidad', 'medida', 'presentacion', 'presentación']);
    const marcaCol = findColumn(['marca', 'fabricante']);
    const rubroCol = findColumn(['clasificacion', 'clasificación', 'rubro']);

    // For this specific Excel format: Producto | Precio (USD)
    const descCol = descripcionCol !== -1 ? descripcionCol : 0; // First column is product description
    const priceColUSD = precioUSDCol !== -1 ? precioUSDCol : 1; // Second column is price in USD

    // Use provided exchange rate

    const products: IExcelProduct[] = [];

    // Process data rows (skip header)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];

      // Skip empty rows
      if (!row || row.length === 0) continue;

      // Get description (required field)
      const descripcion = row[descCol]?.toString().trim();
      if (!descripcion) continue;

      // Get price in USD and convert to Bolivares
      const precioUSDStr = row[priceColUSD]?.toString().replace(/[^\d.,]/g, '').replace(',', '.');
      const precioUSD = parseFloat(precioUSDStr);

      // Skip rows without valid price
      if (isNaN(precioUSD) || precioUSD <= 0) {
        continue;
      }

      // Convert USD to Bolivares
      const precio = precioUSD * exchangeRate;

      // Extract unit from description if possible
      let unidad = 'unidad';
      const descripcionLower = descripcion.toLowerCase();

      if (descripcionLower.includes('kg') || descripcionLower.includes('kilo')) {
        unidad = 'kg';
      } else if (descripcionLower.includes(' m ') || descripcionLower.includes('metro')) {
        unidad = 'metro';
      } else if (descripcionLower.includes('litro') || descripcionLower.includes(' lt')) {
        unidad = 'litro';
      } else if (descripcionLower.includes('galon') || descripcionLower.includes('galón')) {
        unidad = 'galón';
      } else if (descripcionLower.includes('caja')) {
        unidad = 'caja';
      } else if (descripcionLower.includes('paquete')) {
        unidad = 'paquete';
      } else if (descripcionLower.includes('rollo')) {
        unidad = 'rollo';
      } else if (descripcionLower.includes('saco')) {
        unidad = 'saco';
      }

      // Try to extract category from description
      let categoria = 'General';
      if (descripcionLower.includes('tubo') || descripcionLower.includes('tuberia') || descripcionLower.includes('tubería')) {
        categoria = 'Tubería';
      } else if (descripcionLower.includes('valvula') || descripcionLower.includes('válvula')) {
        categoria = 'Válvulas';
      } else if (descripcionLower.includes('bomba')) {
        categoria = 'Bombas';
      } else if (descripcionLower.includes('cable') || descripcionLower.includes('electr')) {
        categoria = 'Eléctrico';
      } else if (descripcionLower.includes('pintura')) {
        categoria = 'Pintura';
      } else if (descripcionLower.includes('cemento') || descripcionLower.includes('concreto')) {
        categoria = 'Construcción';
      } else if (descripcionLower.includes('hierro') || descripcionLower.includes('acero') || descripcionLower.includes('metal')) {
        categoria = 'Metales';
      }

      // Get rubro (clasificación) from Excel
      let rubro: InvoiceRubro | undefined;
      if (rubroCol !== -1) {
        const rubroStr = row[rubroCol]?.toString().trim();
        // Normalize rubro values
        if (rubroStr) {
          if (rubroStr.toLowerCase().includes('ferret')) {
            rubro = 'Ferretería';
          } else if (rubroStr.toLowerCase().includes('construc')) {
            rubro = 'Construcción';
          } else if (rubroStr.toLowerCase().includes('tecno') || rubroStr.toLowerCase().includes('electr')) {
            rubro = 'Tecnología';
          }
        }
      }

      const product: IExcelProduct = {
        descripcion,
        precio: parseFloat(precio.toFixed(2)),
        precioUSD,
        categoria,
        unidad,
        rubro
      };

      products.push(product);
    }

    console.log(`Parsed ${products.length} products from Excel`);
    return products;
  }

  /**
   * Get all products
   */
  async getProducts(exchangeRate: number = 36): Promise<IExcelProduct[]> {
    if (!this.isLoaded) {
      await this.loadCatalog(exchangeRate);
    }
    return [...this.products];
  }

  /**
   * Search products by description
   */
  async searchProducts(query: string, exchangeRate: number = 36): Promise<IExcelProduct[]> {
    if (!this.isLoaded) {
      await this.loadCatalog(exchangeRate);
    }

    const searchTerm = query.toLowerCase();
    return this.products.filter(p =>
      p.descripcion.toLowerCase().includes(searchTerm) ||
      p.codigo?.toLowerCase().includes(searchTerm) ||
      p.categoria?.toLowerCase().includes(searchTerm) ||
      p.marca?.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(category: string, exchangeRate: number = 36): Promise<IExcelProduct[]> {
    if (!this.isLoaded) {
      await this.loadCatalog(exchangeRate);
    }

    return this.products.filter(p =>
      p.categoria?.toLowerCase() === category.toLowerCase()
    );
  }

  /**
   * Get products by rubro (clasificación)
   */
  async getProductsByRubro(rubro: InvoiceRubro, exchangeRate: number = 36): Promise<IExcelProduct[]> {
    if (!this.isLoaded) {
      await this.loadCatalog(exchangeRate);
    }

    return this.products.filter(p => p.rubro === rubro);
  }

  /**
   * Get random products for invoice generation
   * Selects products to match a target amount
   */
  async getRandomProductsForAmount(
    targetAmount: number,
    itemCount?: number,
    exchangeRate: number = 36,
    rubro?: InvoiceRubro
  ): Promise<Array<IExcelProduct & { quantity: number; subtotal: number }>> {
    if (!this.isLoaded) {
      await this.loadCatalog(exchangeRate);
    }

    // Filter by rubro if provided
    let availableProducts = this.products;
    if (rubro) {
      availableProducts = this.products.filter(p => p.rubro === rubro);
      if (availableProducts.length === 0) {
        throw new Error(`No products available for rubro: ${rubro}`);
      }
    }

    if (availableProducts.length === 0) {
      throw new Error('No products available in Excel catalog');
    }

    // Determine number of items to generate
    const numItems = itemCount || this.calculateOptimalItemCount(targetAmount);

    // Filter products by price range
    const priceRange = this.getPriceRangeForAmount(targetAmount, numItems);
    const eligibleProducts = availableProducts.filter(p =>
      p.precio >= priceRange.min && p.precio <= priceRange.max
    );

    // If no products in range, use all available products (filtered by rubro if applicable)
    const productsToUse = eligibleProducts.length > 0 ? eligibleProducts : availableProducts;

    // Randomly select products
    const selectedProducts: Array<IExcelProduct & { quantity: number; subtotal: number }> = [];
    const usedIndices = new Set<number>();
    let remainingAmount = targetAmount;

    for (let i = 0; i < numItems && remainingAmount > 0; i++) {
      // Get a random product
      let randomIndex: number;
      let attempts = 0;
      do {
        randomIndex = Math.floor(Math.random() * productsToUse.length);
        attempts++;
      } while (usedIndices.has(randomIndex) && attempts < productsToUse.length);

      usedIndices.add(randomIndex);
      const product = { ...productsToUse[randomIndex] };

      // Calculate quantity
      const isLastItem = i === numItems - 1;
      const itemTargetAmount = isLastItem ? remainingAmount : remainingAmount * (0.2 + Math.random() * 0.3);

      let quantity = Math.max(1, Math.round(itemTargetAmount / product.precio));

      // Adjust quantity based on unit type
      if (product.unidad) {
        const unit = product.unidad.toLowerCase();
        if (unit.includes('kg') || unit.includes('kilo')) {
          quantity = Math.min(quantity, 100);
        } else if (unit.includes('metro') || unit === 'm') {
          quantity = Math.min(quantity, 200);
        } else if (unit.includes('litro') || unit === 'l') {
          quantity = Math.min(quantity, 50);
        } else if (unit.includes('caja') || unit.includes('paquete')) {
          quantity = Math.min(quantity, 20);
        } else {
          quantity = Math.min(quantity, 100);
        }
      }

      const subtotal = quantity * product.precio;
      remainingAmount -= subtotal;

      selectedProducts.push({
        ...product,
        quantity,
        subtotal: parseFloat(subtotal.toFixed(2))
      });
    }

    // Adjust last item if needed
    if (selectedProducts.length > 0 && Math.abs(remainingAmount) > 1) {
      const lastItem = selectedProducts[selectedProducts.length - 1];
      lastItem.subtotal += remainingAmount;
      lastItem.quantity = Math.max(1, Math.round(lastItem.subtotal / lastItem.precio));
      lastItem.subtotal = parseFloat(lastItem.subtotal.toFixed(2));
    }

    return selectedProducts;
  }

  /**
   * Calculate optimal number of items for an invoice amount
   */
  private calculateOptimalItemCount(amount: number): number {
    if (amount < 50000) return 2 + Math.floor(Math.random() * 2); // 2-3 items
    if (amount < 200000) return 3 + Math.floor(Math.random() * 3); // 3-5 items
    if (amount < 1000000) return 4 + Math.floor(Math.random() * 4); // 4-7 items
    if (amount < 5000000) return 5 + Math.floor(Math.random() * 5); // 5-9 items
    return 6 + Math.floor(Math.random() * 6); // 6-11 items
  }

  /**
   * Get appropriate price range based on target amount
   */
  private getPriceRangeForAmount(amount: number, itemCount: number): { min: number; max: number } {
    const averagePerItem = amount / itemCount;

    return {
      min: averagePerItem * 0.3, // 30% of average
      max: averagePerItem * 2.5  // 250% of average
    };
  }

  /**
   * Get categories from loaded products
   */
  async getCategories(exchangeRate: number = 36): Promise<string[]> {
    if (!this.isLoaded) {
      await this.loadCatalog(exchangeRate);
    }

    const categories = new Set<string>();
    this.products.forEach(p => {
      if (p.categoria) {
        categories.add(p.categoria);
      }
    });

    return Array.from(categories).sort();
  }

  /**
   * Get available rubros (clasificaciones) from loaded products
   */
  async getRubros(exchangeRate: number = 36): Promise<InvoiceRubro[]> {
    if (!this.isLoaded) {
      await this.loadCatalog(exchangeRate);
    }

    const rubros = new Set<InvoiceRubro>();
    this.products.forEach(p => {
      if (p.rubro) {
        rubros.add(p.rubro);
      }
    });

    return Array.from(rubros).sort();
  }
}

// Export singleton instance
export const excelCatalogService = new ExcelCatalogService();