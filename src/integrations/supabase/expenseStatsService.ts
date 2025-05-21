import { supabase } from "./client";
import type { Database, Tables } from "./types";

export type ExpenseStat = Tables<"expense_stats">;

export const getExpenseStats = async (): Promise<ExpenseStat[]> => {
  const { data, error } = await supabase.from("expense_stats").select("*");
  if (error) throw error;
  return data || [];
};
