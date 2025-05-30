import { supabase } from "./client";
// import type { Transaction } from "@/types"; // Remove old local type import
import type { Database, Tables, TablesInsert, TablesUpdate } from "./types"; // Supabase types
import { v4 as uuidv4 } from "uuid";

// Export Supabase-based types
export type Transaction = Tables<"transactions">;
export type NewTransaction = TablesInsert<"transactions">;
export type UpdatedTransaction = TablesUpdate<"transactions">;

// Define filter interface for transactions
export interface TransactionFilter {
  type?: Transaction["type"];
  status?: Transaction["status"];
  client_id?: string;
  indirect_for_client_id?: string;
  debt_id?: string;
  receivable_id?: string;
  bank_account_id?: string;
  category?: string;
  start_date?: string;
  end_date?: string;
  min_amount?: number;
  max_amount?: number;
}

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
 * Bank account balance is automatically updated by database trigger.
 * @param transactionData Data for the new transaction (must match NewTransaction).
 * @returns A promise that resolves to the created transaction object.
 */
export const createTransaction = async (
  transactionData: NewTransaction
): Promise<Transaction> => {
  const transactionWithId = { id: uuidv4(), ...transactionData };

  const { data, error } = await supabase
    .from(TRANSACTIONS_TABLE)
    .insert(transactionWithId)
    .select()
    .single();

  if (error) {
    console.error("Error creating transaction:", error);
    throw error;
  }

  // Bank account balance is automatically updated by the database trigger
  return data;
};

/**
 * Updates an existing transaction in the database.
 * Bank account balance is automatically updated by database trigger.
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

  // Bank account balance is automatically updated by the database trigger
  return data;
};

/**
 * Deletes a transaction from the database.
 * Bank account balance is automatically updated by database trigger.
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

  // Bank account balance is automatically updated by the database trigger
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

/**
 * Obtiene las transacciones asociadas a una cuenta bancaria específica.
 */
export const getTransactionsByBankAccountId = async (
  bankAccountId: string
): Promise<Transaction[]> => {
  const { data, error } = await supabase
    .from(TRANSACTIONS_TABLE)
    .select("*")
    .eq("bank_account_id", bankAccountId)
    .order("date", { ascending: false });
  if (error) throw error;
  return data || [];
};

/**
 * Obtiene las transacciones asociadas a un cliente específico.
 * Incluye transacciones directas e indirectas.
 */
export const getTransactionsByClientId = async (
  clientId: string
): Promise<Transaction[]> => {
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

/**
 * Busca transacciones por término de búsqueda en descripción, notas y categoría.
 */
export const searchTransactions = async (
  searchTerm: string
): Promise<Transaction[]> => {
  if (!searchTerm.trim()) {
    return getTransactions();
  }

  const { data, error } = await supabase
    .from(TRANSACTIONS_TABLE)
    .select("*")
    .or(
      `description.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`
    )
    .order("date", { ascending: false });

  if (error) {
    console.error("Error searching transactions:", error);
    throw error;
  }
  return data || [];
};

/**
 * Filtra transacciones según los criterios especificados.
 */
export const filterTransactions = async (
  filters: TransactionFilter
): Promise<Transaction[]> => {
  let query = supabase.from(TRANSACTIONS_TABLE).select("*");

  // Aplicar filtros
  if (filters.type) {
    query = query.eq("type", filters.type);
  }
  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.client_id) {
    query = query.eq("client_id", filters.client_id);
  }
  if (filters.indirect_for_client_id) {
    query = query.eq("indirect_for_client_id", filters.indirect_for_client_id);
  }
  if (filters.debt_id) {
    query = query.eq("debt_id", filters.debt_id);
  }
  if (filters.receivable_id) {
    query = query.eq("receivable_id", filters.receivable_id);
  }
  if (filters.bank_account_id) {
    query = query.eq("bank_account_id", filters.bank_account_id);
  }
  if (filters.category) {
    query = query.eq("category", filters.category);
  }
  if (filters.start_date) {
    query = query.gte("date", filters.start_date);
  }
  if (filters.end_date) {
    query = query.lte("date", filters.end_date);
  }
  if (filters.min_amount !== undefined) {
    query = query.gte("amount", filters.min_amount);
  }
  if (filters.max_amount !== undefined) {
    query = query.lte("amount", filters.max_amount);
  }

  query = query.order("date", { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error("Error filtering transactions:", error);
    throw error;
  }
  return data || [];
};

// All transaction service functions are now implemented as individual exports.
