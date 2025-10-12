/**
 * Daily Snapshot Service
 *
 * Tracks daily changes in bank account balances by creating point-in-time snapshots
 * and comparing current state with previous snapshots. This allows users to see
 * whether they have more or less money than yesterday.
 *
 * Core Concepts:
 * - Daily snapshots capture account state (amount, historical_cost_usd) at a specific date
 * - Comparison shows changes between current state and most recent snapshot
 * - Supports both absolute changes (dollars/bolivares) and percentage changes
 * - Each snapshot is unique per (date, account) combination
 *
 * Example:
 * Yesterday: Account had 1000 USD
 * Today: Account has 1200 USD
 * Comparison shows: +200 USD (+20% increase)
 */

import { supabase } from "./client";
import { nanoid } from "nanoid";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Daily snapshot of a bank account's state
 */
export interface IDailySnapshot {
  id: string;
  snapshot_date: string;
  user_id: string;
  bank_account_id: string;
  amount: number;
  currency: string;
  historical_cost_usd: number;
  created_at: string;
}

export interface IDailySnapshotInsert {
  id?: string;
  snapshot_date: string;
  user_id: string;
  bank_account_id: string;
  amount: number;
  currency: string;
  historical_cost_usd: number;
}

/**
 * Comparison between current account state and previous snapshot
 */
export interface IDailyComparison {
  user_id: string;
  bank_account_id: string;
  bank: string;
  account_number: string;
  currency: string;

  // Current state
  current_amount: number;
  current_historical_cost_usd: number;

  // Previous state
  previous_amount: number | null;
  previous_historical_cost_usd: number | null;
  comparison_date: string | null;

  // Changes
  amount_change: number;
  historical_cost_change: number;
  amount_change_percent: number | null;
  historical_cost_change_percent: number | null;

  // Direction
  change_direction: 'increase' | 'decrease' | 'no_change';
  days_since_snapshot: number | null;
}

/**
 * Result of saving daily snapshots
 */
export interface ISaveSnapshotResult {
  snapshots_saved: number;
  snapshot_date: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SNAPSHOTS_TABLE = "daily_account_snapshots";
const COMPARISON_VIEW = "v_daily_comparison";

// ============================================================================
// SNAPSHOT OPERATIONS
// ============================================================================

/**
 * Saves daily snapshot for all accounts of a user
 *
 * Calls the PostgreSQL function save_daily_snapshot which creates or updates
 * snapshots for all bank accounts. If a snapshot already exists for today,
 * it will be updated with current values (upsert logic).
 *
 * @param user_id - User ID to save snapshots for (optional, uses current user if not provided)
 * @returns Result with number of snapshots saved and date
 *
 * @example
 * const result = await saveDailySnapshot();
 * // result: { snapshots_saved: 5, snapshot_date: "2025-10-10" }
 */
export const saveDailySnapshot = async (
  user_id?: string
): Promise<ISaveSnapshotResult> => {
  try {
    // If no user_id provided, use current authenticated user
    let userId = user_id;

    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("No authenticated user found");
      }
      userId = user.id;
    }

    // Call PostgreSQL function
    const { data, error } = await supabase.rpc('save_daily_snapshot', {
      p_user_id: userId
    });

    if (error) {
      console.error("Error saving daily snapshot:", error);
      throw error;
    }

    if (!data || data.length === 0) {
      throw new Error("No result returned from save_daily_snapshot function");
    }

    const result = data[0];

    console.log(`Saved ${result.snapshots_saved} snapshots for date ${result.snapshot_date}`);

    return {
      snapshots_saved: result.snapshots_saved,
      snapshot_date: result.snapshot_date
    };
  } catch (error) {
    console.error("Error in saveDailySnapshot:", error);
    throw error;
  }
};

/**
 * Manually creates a snapshot for a specific account
 *
 * This is useful for testing or manual snapshot creation. For normal operations,
 * use saveDailySnapshot() which snapshots all accounts at once.
 *
 * @param snapshot - Snapshot data
 * @returns The created snapshot
 */
export const createSnapshot = async (
  snapshot: IDailySnapshotInsert
): Promise<IDailySnapshot> => {
  try {
    const id = snapshot.id || nanoid();

    const { data, error } = await supabase
      .from(SNAPSHOTS_TABLE)
      .insert({ ...snapshot, id })
      .select()
      .single();

    if (error) {
      console.error("Error creating snapshot:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error in createSnapshot:", error);
    throw error;
  }
};

// ============================================================================
// QUERY OPERATIONS
// ============================================================================

/**
 * Gets daily comparison for all accounts of a user
 *
 * Returns comparison between current state and most recent snapshot for each account.
 * Includes absolute changes, percentage changes, and direction indicators.
 *
 * @param user_id - User ID to get comparison for (optional, uses current user if not provided)
 * @returns Array of comparisons for each account
 *
 * @example
 * const comparisons = await getDailyComparison();
 * // comparisons[0]: { bank_account_id: "...", current_amount: 1200, previous_amount: 1000, amount_change: 200, ... }
 */
export const getDailyComparison = async (
  user_id?: string
): Promise<IDailyComparison[]> => {
  try {
    // If no user_id provided, use current authenticated user
    let userId = user_id;

    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("No authenticated user found");
      }
      userId = user.id;
    }

    const { data, error } = await supabase
      .from(COMPARISON_VIEW)
      .select("*")
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching daily comparison:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Error in getDailyComparison:", error);
    throw error;
  }
};

/**
 * Gets comparison for a specific account
 *
 * @param bank_account_id - Account ID to get comparison for
 * @returns Comparison data or null if not found
 */
export const getAccountComparison = async (
  bank_account_id: string
): Promise<IDailyComparison | null> => {
  try {
    const { data, error } = await supabase
      .from(COMPARISON_VIEW)
      .select("*")
      .eq("bank_account_id", bank_account_id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      console.error("Error fetching account comparison:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error in getAccountComparison:", error);
    throw error;
  }
};

/**
 * Gets historical snapshots for a specific account
 *
 * @param bank_account_id - Account to get history for
 * @param days - Number of days to retrieve (default: 30)
 * @returns Array of snapshots ordered by date descending
 *
 * @example
 * const history = await getSnapshotHistory("account123", 7);
 * // Returns last 7 days of snapshots
 */
export const getSnapshotHistory = async (
  bank_account_id: string,
  days: number = 30
): Promise<IDailySnapshot[]> => {
  try {
    const cutoff_date = new Date();
    cutoff_date.setDate(cutoff_date.getDate() - days);

    const { data, error } = await supabase
      .from(SNAPSHOTS_TABLE)
      .select("*")
      .eq("bank_account_id", bank_account_id)
      .gte("snapshot_date", cutoff_date.toISOString().split('T')[0])
      .order("snapshot_date", { ascending: false });

    if (error) {
      console.error("Error fetching snapshot history:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Error in getSnapshotHistory:", error);
    throw error;
  }
};

/**
 * Gets all snapshots for a user on a specific date
 *
 * @param user_id - User ID to get snapshots for
 * @param date - Date to get snapshots for (YYYY-MM-DD format)
 * @returns Array of snapshots for that date
 */
export const getSnapshotsByDate = async (
  user_id: string,
  date: string
): Promise<IDailySnapshot[]> => {
  try {
    const { data, error } = await supabase
      .from(SNAPSHOTS_TABLE)
      .select("*")
      .eq("user_id", user_id)
      .eq("snapshot_date", date);

    if (error) {
      console.error("Error fetching snapshots by date:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Error in getSnapshotsByDate:", error);
    throw error;
  }
};

// ============================================================================
// UTILITY OPERATIONS
// ============================================================================

/**
 * Checks if a snapshot already exists for today
 *
 * @param user_id - User ID to check (optional, uses current user if not provided)
 * @returns True if snapshot exists for today, false otherwise
 */
export const hasSnapshotToday = async (user_id?: string): Promise<boolean> => {
  try {
    // If no user_id provided, use current authenticated user
    let userId = user_id;

    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("No authenticated user found");
      }
      userId = user.id;
    }

    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from(SNAPSHOTS_TABLE)
      .select("id")
      .eq("user_id", userId)
      .eq("snapshot_date", today)
      .limit(1);

    if (error) {
      console.error("Error checking for today's snapshot:", error);
      throw error;
    }

    return data !== null && data.length > 0;
  } catch (error) {
    console.error("Error in hasSnapshotToday:", error);
    throw error;
  }
};

/**
 * Gets the date of the most recent snapshot for a user
 *
 * @param user_id - User ID to check (optional, uses current user if not provided)
 * @returns Date string (YYYY-MM-DD) or null if no snapshots exist
 */
export const getLastSnapshotDate = async (user_id?: string): Promise<string | null> => {
  try {
    // If no user_id provided, use current authenticated user
    let userId = user_id;

    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("No authenticated user found");
      }
      userId = user.id;
    }

    const { data, error } = await supabase
      .from(SNAPSHOTS_TABLE)
      .select("snapshot_date")
      .eq("user_id", userId)
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      console.error("Error fetching last snapshot date:", error);
      throw error;
    }

    return data?.snapshot_date || null;
  } catch (error) {
    console.error("Error in getLastSnapshotDate:", error);
    throw error;
  }
};

/**
 * Deletes old snapshots beyond a certain retention period
 *
 * @param retention_days - Number of days to keep (default: 90)
 * @param user_id - User ID to clean snapshots for (optional, cleans for all users if not provided)
 * @returns Number of snapshots deleted
 */
export const cleanOldSnapshots = async (
  retention_days: number = 90,
  user_id?: string
): Promise<number> => {
  try {
    const cutoff_date = new Date();
    cutoff_date.setDate(cutoff_date.getDate() - retention_days);
    const cutoff_string = cutoff_date.toISOString().split('T')[0];

    let query = supabase
      .from(SNAPSHOTS_TABLE)
      .delete()
      .lt("snapshot_date", cutoff_string);

    if (user_id) {
      query = query.eq("user_id", user_id);
    }

    const { data, error } = await query.select();

    if (error) {
      console.error("Error cleaning old snapshots:", error);
      throw error;
    }

    const deleted_count = data?.length || 0;
    console.log(`Deleted ${deleted_count} snapshots older than ${cutoff_string}`);

    return deleted_count;
  } catch (error) {
    console.error("Error in cleanOldSnapshots:", error);
    throw error;
  }
};

// ============================================================================
// EXPORT ALL
// ============================================================================

export default {
  saveDailySnapshot,
  createSnapshot,
  getDailyComparison,
  getAccountComparison,
  getSnapshotHistory,
  getSnapshotsByDate,
  hasSnapshotToday,
  getLastSnapshotDate,
  cleanOldSnapshots,
};
