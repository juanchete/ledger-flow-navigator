import { supabase } from "./client";
// import type { Transaction } from "@/types"; // Remove old local type import
import type { Database, Tables, TablesInsert, TablesUpdate } from "./types"; // Supabase types
import { v4 as uuidv4 } from "uuid";

// Export Supabase-based types
export type Transaction = Tables<"transactions">;
export type NewTransaction = TablesInsert<"transactions">;
export type UpdatedTransaction = TablesUpdate<"transactions">;

const TRANSACTIONS_TABLE = "transactions";

/**
 * Fetches all transactions from the database.
 * @returns A promise that resolves to an array of transactions.
 */
export const getTransactions = async (): Promise<Transaction[]> => {
  const { data, error } = await supabase
    .from(TRANSACTIONS_TABLE)
    .select("*")
    .order("date", { ascending: false });

  if (error) {
    console.error("Error fetching transactions:", error);
    throw error;
  }
  // Note: Supabase returns date as string. Consuming code needs to handle new Date(transaction.date)
  return data || [];
};

/**
 * Fetches a single transaction by its ID.
 * @param id The ID of the transaction to fetch.
 * @returns A promise that resolves to the transaction object or null if not found.
 */
export const getTransactionById = async (
  id: string
): Promise<Transaction | null> => {
  const { data, error } = await supabase
    .from(TRANSACTIONS_TABLE)
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error(`Error fetching transaction with id ${id}:`, error);
    if (error.code === "PGRST116") {
      // Not found
      return null;
    }
    throw error;
  }
  return data;
};

/**
 * Creates a new transaction in the database.
 * @param transactionData Data for the new transaction (must match NewTransaction).
 *                      Ensure date is in ISO string format if NewTransaction expects string.
 * @returns A promise that resolves to the created transaction object.
 */
export const createTransaction = async (
  transactionData: NewTransaction
): Promise<Transaction> => {
  // If NewTransaction expects date as string, ensure it is formatted, e.g.:
  // const dataToInsert = {
  //   ...transactionData,
  //   date: typeof transactionData.date === 'string' ? transactionData.date : new Date(transactionData.date).toISOString(),
  // };
  // However, NewTransaction (TablesInsert<'transactions'>) should already expect string for date based on Supabase schema.

  const transactionWithId = { id: uuidv4(), ...transactionData };

  const { data, error } = await supabase
    .from(TRANSACTIONS_TABLE)
    .insert(transactionWithId) // Use transactionWithId which includes the generated id
    .select()
    .single();

  if (error) {
    console.error("Error creating transaction:", error);
    // Supabase might return more detailed error in error.details or error.message
    throw error;
  }
  return data;
};

/**
 * Updates an existing transaction in the database.
 * @param id The ID of the transaction to update.
 * @param updates The partial transaction object with updates (must match UpdatedTransaction).
 * @returns A promise that resolves to the updated transaction object.
 */
export const updateTransaction = async (
  id: string,
  updates: UpdatedTransaction
): Promise<Transaction> => {
  const { data, error } = await supabase
    .from(TRANSACTIONS_TABLE)
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error(`Error updating transaction with id ${id}:`, error);
    throw error;
  }
  return data;
};

/**
 * Deletes a transaction from the database.
 * @param id The ID of the transaction to delete.
 * @returns A promise that resolves when the transaction is deleted.
 */
export const deleteTransaction = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from(TRANSACTIONS_TABLE)
    .delete()
    .eq("id", id);

  if (error) {
    console.error(`Error deleting transaction with id ${id}:`, error);
    throw error;
  }
};

/**
 * Obtiene los pagos asociados a una deuda específica.
 */
export const getPaymentsByDebtId = async (
  debtId: string
): Promise<Transaction[]> => {
  const { data, error } = await supabase
    .from(TRANSACTIONS_TABLE)
    .select("*")
    .eq("debt_id", debtId)
    .eq("type", "payment")
    .eq("status", "completed");
  if (error) throw error;
  return data || [];
};

/**
 * Obtiene los pagos asociados a una cuenta por cobrar específica.
 */
export const getPaymentsByReceivableId = async (
  receivableId: string
): Promise<Transaction[]> => {
  const { data, error } = await supabase
    .from(TRANSACTIONS_TABLE)
    .select("*")
    .eq("receivable_id", receivableId)
    .eq("type", "payment")
    .eq("status", "completed");
  if (error) throw error;
  return data || [];
};

// TODO: Complex functions like getTransactionsByClientId, searchTransactions, filterTransactions
// from the original transactionService object need to be refactored here
// to work with Supabase types directly and be exported as individual functions if needed.
// For example, getTransactionsByClientId:
/*
export const getTransactionsByClientId = async (clientId: string): Promise<Transaction[]> => {
  const { data, error } = await supabase
    .from(TRANSACTIONS_TABLE)
    .select("*")
    .or(`client_id.eq.${clientId},indirect_for_client_id.eq.${clientId}`)
    .order("date", { ascending: false });

  if (error) {
    console.error(`Error fetching transactions for client ${clientId}:`, error);
    throw error;
  }
  return data || [];
};
*/

// The original exported object transactionService is removed.
// If specific complex queries are needed, they should be added as separate exported functions.
