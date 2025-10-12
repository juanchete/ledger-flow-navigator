import { supabase } from "./client";
import type { Database, Tables, TablesInsert, TablesUpdate } from "./types";
import { getAccountHistoricalCostUSD } from "./vesLayerService";

// Extended types to include user_id and historical_cost_usd
export type BankAccount = Tables<"bank_accounts"> & {
  user_id?: string;
  historical_cost_usd?: number;
};

export type BankAccountInsert = TablesInsert<"bank_accounts"> & {
  user_id?: string;
  historical_cost_usd?: number;
};

export type BankAccountUpdate = TablesUpdate<"bank_accounts"> & {
  user_id?: string;
  historical_cost_usd?: number;
};

export type BankAccountApp = {
  id: string;
  bank: string;
  account_number: string;
  amount: number;
  currency: string;
  user_id?: string;
  historical_cost_usd?: number; // Historical USD cost for VES accounts
};

export const getBankAccounts = async (): Promise<BankAccountApp[]> => {
  const { data, error } = await supabase.from("bank_accounts").select("*");
  if (error) throw error;

  if (!data) return [];

  return data.map((account) => {
    const accountWithUserId = account as BankAccount;
    return {
      id: accountWithUserId.id,
      bank: accountWithUserId.bank,
      account_number: accountWithUserId.account_number,
      amount: accountWithUserId.amount,
      currency: accountWithUserId.currency,
      user_id: accountWithUserId.user_id,
      historical_cost_usd: accountWithUserId.historical_cost_usd || 0,
    };
  });
};

export const getBankAccountById = async (
  id: string
): Promise<BankAccount | null> => {
  const { data, error } = await supabase
    .from("bank_accounts")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
};

export const createBankAccount = async (
  account: BankAccountInsert
): Promise<BankAccount> => {
  const { data, error } = await supabase
    .from("bank_accounts")
    .insert(account)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateBankAccount = async (
  id: string,
  updates: BankAccountUpdate
): Promise<BankAccount> => {
  const { data, error } = await supabase
    .from("bank_accounts")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteBankAccount = async (id: string): Promise<void> => {
  const { error } = await supabase.from("bank_accounts").delete().eq("id", id);
  if (error) throw error;
};

/**
 * Recalcula el saldo de una cuenta bancaria basado en todas sus transacciones
 * @param accountId ID de la cuenta bancaria
 * @param initialBalance Saldo inicial de la cuenta (opcional, por defecto 0)
 * @returns El nuevo saldo calculado
 */
export const recalculateAccountBalance = async (
  accountId: string,
  initialBalance: number = 0
): Promise<number> => {
  try {
    // Obtener todas las transacciones de la cuenta ordenadas por fecha
    const { data: transactions, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("bank_account_id", accountId)
      .order("date", { ascending: true });

    if (error) throw error;

    let calculatedBalance = initialBalance;

    // Procesar cada transacción
    for (const transaction of transactions || []) {
      if (!transaction.type) continue;

      switch (transaction.type) {
        case "sale":
        case "payment":
        case "cash": // Transferencia recibida
          calculatedBalance += transaction.amount;
          break;
        case "purchase":
        case "expense":
          calculatedBalance -= transaction.amount;
          break;
        case "balance-change":
          // Para cambios de balance, el monto puede ser positivo o negativo
          calculatedBalance += transaction.amount;
          break;
        default:
          // Para otros tipos, no modificar el saldo
          break;
      }
    }

    // Actualizar la cuenta con el saldo calculado
    await updateBankAccount(accountId, { amount: calculatedBalance });

    console.log(
      `Saldo recalculado para cuenta ${accountId}: ${calculatedBalance}`
    );
    return calculatedBalance;
  } catch (error) {
    console.error("Error al recalcular saldo de cuenta bancaria:", error);
    throw error;
  }
};

/**
 * Recalcula los saldos de todas las cuentas bancarias
 * @returns Array con los resultados del recálculo
 */
export const recalculateAllAccountBalances = async (): Promise<
  { accountId: string; newBalance: number }[]
> => {
  try {
    const accounts = await getBankAccounts();
    const results = [];

    for (const account of accounts) {
      const newBalance = await recalculateAccountBalance(account.id, 0);
      results.push({ accountId: account.id, newBalance });
    }

    return results;
  } catch (error) {
    console.error("Error al recalcular saldos de todas las cuentas:", error);
    throw error;
  }
};

/**
 * Calculates and updates the historical_cost_usd for a VES account based on its layers
 * This is the USD cost basis of all VES currently in the account.
 *
 * @param accountId - ID of the VES account
 * @returns The updated historical cost in USD
 *
 * @example
 * // Account has layers totaling 11000 VES:
 * // Layer 1: 5000 VES @ rate 50 = $100 USD cost
 * // Layer 2: 6000 VES @ rate 60 = $100 USD cost
 * const cost = await calculateAndUpdateHistoricalCost("account123");
 * // Returns: 200 USD
 */
export const calculateAndUpdateHistoricalCost = async (
  accountId: string
): Promise<number> => {
  try {
    // Get the account to verify it's VES
    const account = await getBankAccountById(accountId);
    if (!account) {
      throw new Error(`Account ${accountId} not found`);
    }

    if (account.currency !== "VES") {
      // For non-VES accounts, historical cost is 0
      return 0;
    }

    // Calculate historical cost from layers
    const historicalCost = await getAccountHistoricalCostUSD(accountId);

    // Update the account
    await updateBankAccount(accountId, {
      historical_cost_usd: historicalCost,
    });

    console.log(
      `Updated historical cost for account ${accountId}: $${historicalCost.toFixed(2)} USD`
    );

    return historicalCost;
  } catch (error) {
    console.error(
      `Error calculating historical cost for account ${accountId}:`,
      error
    );
    throw error;
  }
};

/**
 * Recalculates historical costs for all VES accounts
 * @returns Array with accountId and new historical cost for each VES account
 */
export const recalculateAllHistoricalCosts = async (): Promise<
  { accountId: string; historicalCost: number }[]
> => {
  try {
    const accounts = await getBankAccounts();
    const vesAccounts = accounts.filter((acc) => acc.currency === "VES");
    const results = [];

    for (const account of vesAccounts) {
      const historicalCost = await calculateAndUpdateHistoricalCost(account.id);
      results.push({ accountId: account.id, historicalCost });
    }

    console.log(
      `Recalculated historical costs for ${vesAccounts.length} VES accounts`
    );
    return results;
  } catch (error) {
    console.error("Error recalculating all historical costs:", error);
    throw error;
  }
};
