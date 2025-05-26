import { supabase } from "./client";

export interface ExchangeRateDB {
  id: number;
  from_currency: string;
  to_currency: string;
  rate: number;
  date: string;
}

export interface ExchangeRateInsert {
  from_currency: string;
  to_currency: string;
  rate: number;
  date: string;
}

/**
 * Guarda una nueva tasa de cambio en la base de datos
 */
export async function saveExchangeRate(
  exchangeRate: ExchangeRateInsert
): Promise<ExchangeRateDB> {
  const { data, error } = await supabase
    .from("exchange_rates")
    .insert(exchangeRate)
    .select()
    .single();

  if (error) {
    console.error("Error saving exchange rate:", error);
    throw error;
  }

  return data;
}

/**
 * Obtiene la tasa de cambio más reciente para una moneda específica
 */
export async function getLatestExchangeRate(
  fromCurrency: string,
  toCurrency: string
): Promise<ExchangeRateDB | null> {
  const { data, error } = await supabase
    .from("exchange_rates")
    .select("*")
    .eq("from_currency", fromCurrency)
    .eq("to_currency", toCurrency)
    .order("date", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No data found
      return null;
    }
    console.error("Error getting latest exchange rate:", error);
    throw error;
  }

  return data;
}

/**
 * Obtiene las tasas de cambio más recientes para USD a VES (tanto BCV como paralelo)
 */
export async function getLatestUSDToVESRates(): Promise<{
  bcv: ExchangeRateDB | null;
  parallel: ExchangeRateDB | null;
}> {
  try {
    const [bcvRate, parallelRate] = await Promise.all([
      getLatestExchangeRate("USD", "VES_BCV"),
      getLatestExchangeRate("USD", "VES_PARALLEL"),
    ]);

    return {
      bcv: bcvRate,
      parallel: parallelRate,
    };
  } catch (error) {
    console.error("Error getting latest USD to VES rates:", error);
    return {
      bcv: null,
      parallel: null,
    };
  }
}

/**
 * Guarda las tasas de cambio BCV y paralelo
 */
export async function saveUSDToVESRates(
  bcvRate: number,
  parallelRate: number
): Promise<{
  bcv: ExchangeRateDB;
  parallel: ExchangeRateDB;
}> {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format

  try {
    const [bcvResult, parallelResult] = await Promise.all([
      saveExchangeRate({
        from_currency: "USD",
        to_currency: "VES_BCV",
        rate: bcvRate,
        date: today,
      }),
      saveExchangeRate({
        from_currency: "USD",
        to_currency: "VES_PARALLEL",
        rate: parallelRate,
        date: today,
      }),
    ]);

    return {
      bcv: bcvResult,
      parallel: parallelResult,
    };
  } catch (error) {
    console.error("Error saving USD to VES rates:", error);
    throw error;
  }
}

/**
 * Obtiene el historial de tasas de cambio para un período específico
 */
export async function getExchangeRateHistory(
  fromCurrency: string,
  toCurrency: string,
  days: number = 30
): Promise<ExchangeRateDB[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("exchange_rates")
    .select("*")
    .eq("from_currency", fromCurrency)
    .eq("to_currency", toCurrency)
    .gte("date", startDateStr)
    .order("date", { ascending: true });

  if (error) {
    console.error("Error getting exchange rate history:", error);
    throw error;
  }

  return data || [];
}

/**
 * Verifica si ya existe una tasa para hoy
 */
export async function hasRateForToday(
  fromCurrency: string,
  toCurrency: string
): Promise<boolean> {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("exchange_rates")
    .select("id")
    .eq("from_currency", fromCurrency)
    .eq("to_currency", toCurrency)
    .eq("date", today)
    .limit(1);

  if (error) {
    console.error("Error checking if rate exists for today:", error);
    return false;
  }

  return (data && data.length > 0) || false;
}
