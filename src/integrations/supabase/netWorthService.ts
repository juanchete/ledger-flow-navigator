import { supabase } from "./client";

export interface INetWorthData {
  total_net_worth: number;
  bank_balances_usd: number;
  pending_receivables_usd: number;
  pending_debts_usd: number;
  total_expenses_usd: number;
  investment_expenses_usd: number;
}

export interface IFinancialSnapshot {
  id: number;
  date: string;
  net_worth: number;
  bank_balances_usd: number;
  pending_receivables_usd: number;
  pending_debts_usd: number;
  total_expenses_usd: number;
  investment_expenses_usd: number;
  created_at: string;
}

/**
 * Gets the current net worth and all financial components
 * Uses the optimized SQL function for instant calculation
 */
export const getCurrentNetWorth = async (): Promise<INetWorthData> => {
  const { data, error } = await supabase.rpc("get_current_net_worth");

  if (error) {
    console.error("Error fetching current net worth:", error);
    throw error;
  }

  if (!data || data.length === 0) {
    throw new Error("No net worth data returned");
  }

  return data[0] as INetWorthData;
};

/**
 * Saves a financial snapshot for the current day
 * Automatically updates if a snapshot already exists for today
 */
export const saveFinancialSnapshot = async (): Promise<void> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { error } = await supabase.rpc("save_financial_snapshot", {
    p_user_id: user.id,
  });

  if (error) {
    console.error("Error saving financial snapshot:", error);
    throw error;
  }
};

/**
 * Gets historical financial snapshots
 * @param limit Number of snapshots to retrieve (default: 30 days)
 */
export const getFinancialSnapshots = async (
  limit: number = 30
): Promise<IFinancialSnapshot[]> => {
  const { data, error } = await supabase
    .from("financial_stats")
    .select("*")
    .order("date", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching financial snapshots:", error);
    throw error;
  }

  return (data || []) as IFinancialSnapshot[];
};

/**
 * Gets financial snapshots for a date range
 * @param startDate Start date (YYYY-MM-DD)
 * @param endDate End date (YYYY-MM-DD)
 */
export const getFinancialSnapshotsByDateRange = async (
  startDate: string,
  endDate: string
): Promise<IFinancialSnapshot[]> => {
  const { data, error } = await supabase
    .from("financial_stats")
    .select("*")
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true });

  if (error) {
    console.error("Error fetching financial snapshots by date range:", error);
    throw error;
  }

  return (data || []) as IFinancialSnapshot[];
};

/**
 * Gets the net worth trend data (last N days)
 * Returns simplified data for charts
 * @param days Number of days to retrieve (default: 30)
 */
export const getNetWorthTrend = async (
  days: number = 30
): Promise<Array<{ date: string; net_worth: number }>> => {
  const { data, error } = await supabase
    .from("financial_stats")
    .select("date, net_worth")
    .order("date", { ascending: false })
    .limit(days);

  if (error) {
    console.error("Error fetching net worth trend:", error);
    throw error;
  }

  return (data || []).reverse();
};

/**
 * Gets the latest snapshot date
 * Useful for determining if a new snapshot is needed
 */
export const getLatestSnapshotDate = async (): Promise<string | null> => {
  const { data, error } = await supabase
    .from("financial_stats")
    .select("date")
    .order("date", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("Error fetching latest snapshot date:", error);
    throw error;
  }

  return data?.date || null;
};

/**
 * Checks if a snapshot exists for today and creates one if not
 * This should be called when the dashboard loads
 */
export const ensureTodaySnapshot = async (): Promise<void> => {
  const latestDate = await getLatestSnapshotDate();
  const today = new Date().toISOString().split("T")[0];

  if (latestDate !== today) {
    await saveFinancialSnapshot();
  }
};
