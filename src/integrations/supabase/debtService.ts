import { supabase } from "./client";
import type { Database, Tables, TablesInsert, TablesUpdate } from "./types";

export type Debt = Tables<"debts">;
export type NewDebt = TablesInsert<"debts">;
export type UpdatedDebt = TablesUpdate<"debts">;

const DEBTS_TABLE = "debts";

/**
 * Fetches all debts from the database.
 * @returns A promise that resolves to an array of debts.
 */
export const getDebts = async (): Promise<Debt[]> => {
  const { data, error } = await supabase.from(DEBTS_TABLE).select("*");
  if (error) {
    console.error("Error fetching debts:", error);
    throw error;
  }
  return data || [];
};

/**
 * Fetches a single debt by its ID.
 * @param id The ID of the debt to fetch.
 * @returns A promise that resolves to the debt object or null if not found.
 */
export const getDebtById = async (id: string): Promise<Debt | null> => {
  const { data, error } = await supabase
    .from(DEBTS_TABLE)
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error(`Error fetching debt with id ${id}:`, error);
    if (error.code === "PGRST116") {
      // PostgREST error for "Not found"
      return null;
    }
    throw error;
  }
  return data;
};

/**
 * Creates a new debt in the database.
 * Automatically calculates amount_usd based on currency and exchange_rate.
 * @param debt The debt object to create.
 * @returns A promise that resolves to the created debt object.
 */
export const createDebt = async (debt: NewDebt): Promise<Debt> => {
  let debtToInsert = { ...debt };

  const currency = (debt as any).currency || 'USD';
  const amount = debt.amount;
  const exchangeRate = (debt as any).exchange_rate;

  if (currency === 'VES') {
    if (!exchangeRate || exchangeRate <= 0) {
      throw new Error('Exchange rate is required for VES debts');
    }
    debtToInsert = {
      ...debtToInsert,
      amount_usd: amount / exchangeRate
    };
  } else {
    debtToInsert = {
      ...debtToInsert,
      amount_usd: amount
    };
  }

  const { data, error } = await supabase
    .from(DEBTS_TABLE)
    .insert(debtToInsert)
    .select()
    .single();

  if (error) {
    console.error("Error creating debt:", error);
    throw error;
  }
  return data;
};

/**
 * Updates an existing debt in the database.
 * @param id The ID of the debt to update.
 * @param updates The partial debt object with updates.
 * @returns A promise that resolves to the updated debt object.
 */
export const updateDebt = async (
  id: string,
  updates: UpdatedDebt
): Promise<Debt> => {
  const { data, error } = await supabase
    .from(DEBTS_TABLE)
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error(`Error updating debt with id ${id}:`, error);
    throw error;
  }
  return data;
};

/**
 * Updates the exchange rate for a debt and recalculates amount_usd.
 * @param id The ID of the debt to update.
 * @param newRate The new exchange rate.
 * @returns A promise that resolves to the updated debt object.
 */
export const updateDebtExchangeRate = async (
  id: string,
  newRate: number
): Promise<Debt> => {
  // First, get the current debt to access the original amount
  const debt = await getDebtById(id);
  if (!debt) {
    throw new Error(`Debt with id ${id} not found`);
  }

  // Calculate new amount_usd based on the new rate
  let newAmountUSD = debt.amount; // Default for USD debts

  if ((debt as any).currency === 'VES') {
    // For VES debts, recalculate USD amount with new rate
    newAmountUSD = debt.amount / newRate;
  }

  const { data, error } = await supabase
    .from(DEBTS_TABLE)
    .update({
      exchange_rate: newRate,
      amount_usd: newAmountUSD,
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error(`Error updating debt exchange rate with id ${id}:`, error);
    throw error;
  }
  return data;
};

/**
 * Deletes a debt from the database.
 * @param id The ID of the debt to delete.
 * @returns A promise that resolves when the debt is deleted.
 */
export const deleteDebt = async (id: string): Promise<void> => {
  const { error } = await supabase.from(DEBTS_TABLE).delete().eq("id", id);

  if (error) {
    console.error(`Error deleting debt with id ${id}:`, error);
    throw error;
  }
};

/**
 * Obtiene todas las deudas de un cliente por su client_id.
 */
export const getDebtsByClientId = async (clientId: string): Promise<Debt[]> => {
  const { data, error } = await supabase
    .from(DEBTS_TABLE)
    .select("*")
    .eq("client_id", clientId);
  if (error) throw error;
  return data || [];
};

/**
 * Liquida una deuda (la marca como pagada con saldo restante en 0)
 * Útil para cerrar deudas con saldos pequeños por redondeo
 */
export const liquidateDebt = async (debtId: string): Promise<void> => {
  const { error } = await supabase.rpc('liquidate_debt', {
    p_debt_id: debtId
  });

  if (error) {
    console.error(`Error liquidating debt with id ${debtId}:`, error);
    throw error;
  }
};
