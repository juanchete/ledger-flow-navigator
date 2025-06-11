import { supabase } from "./client";
import type { Database, Tables, TablesInsert, TablesUpdate } from "./types";

export type BankAccount = Tables<"bank_accounts">;
export type BankAccountInsert = TablesInsert<"bank_accounts">;
export type BankAccountUpdate = TablesUpdate<"bank_accounts">;
export type BankAccountApp = {
  id: string;
  bankName: string;
  accountNumber: string;
  amount: number;
  currency: string;
};

export const getBankAccounts = async (): Promise<BankAccountApp[]> => {
  const { data, error } = await supabase.from("bank_accounts").select("*");
  if (error) throw error;

  if (!data) return [];

  return data.map((account) => ({
    id: account.id,
    bankName: account.bank,
    accountNumber: account.account_number,
    amount: account.amount,
    currency: account.currency,
  }));
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
        case "payment": // Pago recibido
        case "banking": // Transferencia recibida
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
