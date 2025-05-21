import { supabase } from "./client";
import type { Database, Tables } from "./types";

export type BankAccount = Tables<"bank_accounts">;

export const getBankAccounts = async (): Promise<BankAccount[]> => {
  const { data, error } = await supabase.from("bank_accounts").select("*");
  if (error) throw error;
  return data || [];
};
