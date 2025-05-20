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
 * @param debt The debt object to create.
 * @returns A promise that resolves to the created debt object.
 */
export const createDebt = async (debt: NewDebt): Promise<Debt> => {
  const { data, error } = await supabase
    .from(DEBTS_TABLE)
    .insert(debt)
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
