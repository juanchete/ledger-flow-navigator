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
      getLatestExchangeRate("USD", "VES_PAR"),
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
        to_currency: "VES_PAR",
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

/**
 * Obtiene la tasa de cambio histórica utilizada en una transacción específica
 */
export async function getTransactionExchangeRate(
  transactionId: string
): Promise<ExchangeRateDB | null> {
  try {
    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .select("exchange_rate_id")
      .eq("id", transactionId)
      .single();

    if (txError || !transaction?.exchange_rate_id) {
      return null;
    }

    const { data: exchangeRate, error: rateError } = await supabase
      .from("exchange_rates")
      .select("*")
      .eq("id", transaction.exchange_rate_id)
      .single();

    if (rateError) {
      console.error("Error getting exchange rate:", rateError);
      return null;
    }

    return exchangeRate;
  } catch (error) {
    console.error("Error getting transaction exchange rate:", error);
    return null;
  }
}

/**
 * Obtiene la tasa de cambio utilizada en una transacción o null si no tiene
 */
export async function getTransactionExchangeRateValue(
  transactionId: string
): Promise<number | null> {
  try {
    const exchangeRate = await getTransactionExchangeRate(transactionId);
    return exchangeRate?.rate || null;
  } catch (error) {
    console.error("Error getting transaction exchange rate value:", error);
    return null;
  }
}

/**
 * Convierte un monto de VES a USD usando la tasa histórica de una transacción
 */
export async function convertVESToUSDWithHistoricalRate(
  vesAmount: number,
  transactionId: string
): Promise<number | null> {
  try {
    const rate = await getTransactionExchangeRateValue(transactionId);
    if (!rate) return null;

    return vesAmount / rate;
  } catch (error) {
    console.error("Error converting VES to USD with historical rate:", error);
    return null;
  }
}
