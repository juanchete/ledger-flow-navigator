import { EXCHANGE_RATE_CONFIG } from "../config/exchangeRateConfig";
import {
  getLatestUSDToVESRates,
  saveUSDToVESRates,
  hasRateForToday,
} from "../integrations/supabase/exchangeRateService";

export interface ExchangeRate {
  usd_to_ves_bcv: number;
  usd_to_ves_parallel: number;
  last_updated: string;
  source_bcv: string;
  source_parallel: string;
}

export interface ExchangeRateResponse {
  success: boolean;
  data?: ExchangeRate;
  error?: string;
}

class ExchangeRateService {
  // Cache para evitar llamadas excesivas
  private cache: ExchangeRate | null = null;
  private cacheExpiry: number = 0;

  /**
   * Obtiene las tasas de cambio actuales
   */
  async getExchangeRates(): Promise<ExchangeRateResponse> {
    try {
      // Verificar cache
      if (this.cache && Date.now() < this.cacheExpiry) {
        return { success: true, data: this.cache };
      }

      // Intentar obtener de la API principal
      const apiResult = await this.fetchFromAPI();

      if (apiResult.success && apiResult.data) {
        // Guardar en base de datos si es exitoso
        await this.saveToDatabase(
          apiResult.data.usd_to_ves_bcv,
          apiResult.data.usd_to_ves_parallel
        );

        // Actualizar cache
        this.cache = apiResult.data;
        this.cacheExpiry = Date.now() + EXCHANGE_RATE_CONFIG.CACHE_DURATION;

        return apiResult;
      }

      // Si la API falla, intentar obtener de la base de datos
      console.warn("API failed, trying database fallback");
      const dbResult = await this.fetchFromDatabase();

      if (dbResult.success && dbResult.data) {
        this.cache = dbResult.data;
        this.cacheExpiry = Date.now() + EXCHANGE_RATE_CONFIG.CACHE_DURATION;
        return dbResult;
      }

      // Si todo falla, usar valores de fallback
      console.warn("Database fallback failed, using hardcoded fallback");
      const fallbackData: ExchangeRate = {
        usd_to_ves_bcv: EXCHANGE_RATE_CONFIG.FALLBACK_RATES.bcv,
        usd_to_ves_parallel: EXCHANGE_RATE_CONFIG.FALLBACK_RATES.parallel,
        last_updated: new Date().toISOString(),
        source_bcv: "fallback",
        source_parallel: "fallback",
      };

      this.cache = fallbackData;
      this.cacheExpiry = Date.now() + EXCHANGE_RATE_CONFIG.CACHE_DURATION;

      return { success: true, data: fallbackData };
    } catch (error) {
      console.error("Error fetching exchange rates:", error);
      return {
        success: false,
        error: "No se pudieron obtener las tasas de cambio",
      };
    }
  }

  /**
   * Obtiene las tasas desde la API principal
   */
  private async fetchFromAPI(): Promise<ExchangeRateResponse> {
    try {
      const response = await fetch(EXCHANGE_RATE_CONFIG.MAIN_API.url, {
        method: "GET",
        headers: EXCHANGE_RATE_CONFIG.DEFAULT_HEADERS,
        signal: AbortSignal.timeout(EXCHANGE_RATE_CONFIG.REQUEST_TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Extraer las tasas usando las rutas configuradas
      const bcvRate = this.extractValueFromPath(
        data,
        EXCHANGE_RATE_CONFIG.MAIN_API.bcvPath
      );
      const parallelRate = this.extractValueFromPath(
        data,
        EXCHANGE_RATE_CONFIG.MAIN_API.parallelPath
      );

      if (
        !bcvRate ||
        !parallelRate ||
        isNaN(parseFloat(String(bcvRate))) ||
        isNaN(parseFloat(String(parallelRate)))
      ) {
        throw new Error("Invalid rate data from API");
      }

      const exchangeRate: ExchangeRate = {
        usd_to_ves_bcv: parseFloat(String(bcvRate)),
        usd_to_ves_parallel: parseFloat(String(parallelRate)),
        last_updated: new Date().toISOString(),
        source_bcv: EXCHANGE_RATE_CONFIG.MAIN_API.name,
        source_parallel: EXCHANGE_RATE_CONFIG.MAIN_API.name,
      };

      return { success: true, data: exchangeRate };
    } catch (error) {
      console.error("Error fetching from API:", error);
      return { success: false, error: "API request failed" };
    }
  }

  /**
   * Obtiene las tasas desde la base de datos
   */
  private async fetchFromDatabase(): Promise<ExchangeRateResponse> {
    try {
      const rates = await getLatestUSDToVESRates();

      if (!rates.bcv || !rates.parallel) {
        return { success: false, error: "No rates found in database" };
      }

      const exchangeRate: ExchangeRate = {
        usd_to_ves_bcv: rates.bcv.rate,
        usd_to_ves_parallel: rates.parallel.rate,
        last_updated: rates.bcv.date + "T00:00:00.000Z", // Convert date to ISO string
        source_bcv: "Database (BCV)",
        source_parallel: "Database (Parallel)",
      };

      return { success: true, data: exchangeRate };
    } catch (error) {
      console.error("Error fetching from database:", error);
      return { success: false, error: "Database request failed" };
    }
  }

  /**
   * Guarda las tasas en la base de datos
   */
  private async saveToDatabase(
    bcvRate: number,
    parallelRate: number
  ): Promise<void> {
    try {
      // Verificar si ya tenemos tasas para hoy
      const [hasBCVRate, hasParallelRate] = await Promise.all([
        hasRateForToday("USD", "VES_BCV"),
        hasRateForToday("USD", "VES_PAR"),
      ]);

      // Solo guardar si no tenemos tasas para hoy
      if (!hasBCVRate || !hasParallelRate) {
        await saveUSDToVESRates(bcvRate, parallelRate);
        console.log("Exchange rates saved to database");
      } else {
        console.log("Exchange rates already exist for today");
      }
    } catch (error) {
      console.error("Error saving to database:", error);
      // No lanzar error aquí para no interrumpir el flujo principal
    }
  }

  /**
   * Extrae un valor de un objeto usando una ruta de propiedades
   * Soporta tanto propiedades de objeto (obj.prop) como índices de array ([0].prop)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractValueFromPath(obj: any, path: string): any {
    try {
      // Manejar paths que incluyen índices de array como [0].promedio
      let current = obj;

      // Dividir el path y procesar cada parte
      const parts = path.split(".");

      for (const part of parts) {
        if (part.startsWith("[") && part.endsWith("]")) {
          // Es un índice de array
          const index = parseInt(part.slice(1, -1));
          if (isNaN(index) || !Array.isArray(current)) {
            return null;
          }
          current = current[index];
        } else {
          // Es una propiedad de objeto
          current = current?.[part];
        }

        if (current === undefined || current === null) {
          return null;
        }
      }

      return current;
    } catch {
      return null;
    }
  }

  /**
   * Convierte USD a VES usando la tasa especificada
   */
  convertUSDToVES(
    usdAmount: number,
    rateType: "bcv" | "parallel" = "parallel"
  ): number {
    if (!this.cache) {
      throw new Error("No hay tasas de cambio disponibles");
    }

    const rate =
      rateType === "bcv"
        ? this.cache.usd_to_ves_bcv
        : this.cache.usd_to_ves_parallel;
    return usdAmount * rate;
  }

  /**
   * Convierte VES a USD usando la tasa especificada
   */
  convertVESToUSD(
    vesAmount: number,
    rateType: "bcv" | "parallel" = "parallel"
  ): number {
    if (!this.cache) {
      throw new Error("No hay tasas de cambio disponibles");
    }

    const rate =
      rateType === "bcv"
        ? this.cache.usd_to_ves_bcv
        : this.cache.usd_to_ves_parallel;
    return vesAmount / rate;
  }

  /**
   * Limpia el cache (útil para forzar actualización)
   */
  clearCache(): void {
    this.cache = null;
    this.cacheExpiry = 0;
  }

  /**
   * Fuerza una actualización desde la API y guarda en base de datos
   */
  async forceRefresh(): Promise<ExchangeRateResponse> {
    this.clearCache();
    return this.getExchangeRates();
  }
}

export const exchangeRateService = new ExchangeRateService();
