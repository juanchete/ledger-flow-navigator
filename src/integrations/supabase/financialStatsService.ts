import { supabase } from "./client";
import type { Database, Tables } from "./types";

export type FinancialStat = Tables<"financial_stats">;

export const getFinancialStats = async (): Promise<FinancialStat[]> => {
  const { data, error } = await supabase
    .from("financial_stats")
    .select("*")
    .order("date", { ascending: true });
  if (error) throw error;
  return data || [];
};
