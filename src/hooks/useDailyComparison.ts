import { useState, useEffect, useCallback } from "react";
import {
  getDailyComparison,
  getAccountComparison,
  saveDailySnapshot,
  hasSnapshotToday,
  getLastSnapshotDate,
  IDailyComparison,
} from "@/integrations/supabase/dailySnapshotService";

interface IUseDailyComparisonReturn {
  comparisons: IDailyComparison[];
  isLoading: boolean;
  error: string | null;
  lastSnapshotDate: string | null;
  hasSnapshotForToday: boolean;
  refreshComparison: () => Promise<void>;
  saveSnapshot: () => Promise<void>;
  getComparisonForAccount: (accountId: string) => IDailyComparison | undefined;
}

interface IUseDailyComparisonOptions {
  autoSaveSnapshot?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

/**
 * Hook for managing daily account comparisons
 *
 * Provides comparison data between current account states and previous snapshots,
 * with automatic snapshot creation on first load if needed.
 *
 * @param options - Configuration options
 * @param options.autoSaveSnapshot - Automatically save snapshot if none exists for today (default: true)
 * @param options.autoRefresh - Enable auto-refresh of comparison data (default: false)
 * @param options.refreshInterval - Refresh interval in milliseconds (default: 5 minutes)
 *
 * @returns Object with comparison data and utility functions
 *
 * @example
 * const { comparisons, isLoading, saveSnapshot } = useDailyComparison({
 *   autoSaveSnapshot: true,
 *   autoRefresh: false
 * });
 */
export const useDailyComparison = (
  options: IUseDailyComparisonOptions = {}
): IUseDailyComparisonReturn => {
  const {
    autoSaveSnapshot = true,
    autoRefresh = false,
    refreshInterval = 5 * 60 * 1000,
  } = options;

  const [comparisons, setComparisons] = useState<IDailyComparison[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSnapshotDate, setLastSnapshotDate] = useState<string | null>(null);
  const [hasSnapshotForToday, setHasSnapshotForToday] = useState<boolean>(false);

  /**
   * Fetches comparison data from the database
   */
  const fetchComparison = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getDailyComparison();
      setComparisons(data);
      setError(null);
    } catch (err) {
      setError("Error al obtener comparación diaria");
      console.error("Error fetching daily comparison:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Checks snapshot status (whether one exists for today and last snapshot date)
   */
  const checkSnapshotStatus = useCallback(async () => {
    try {
      const [hasToday, lastDate] = await Promise.all([
        hasSnapshotToday(),
        getLastSnapshotDate(),
      ]);

      setHasSnapshotForToday(hasToday);
      setLastSnapshotDate(lastDate);

      return { hasToday, lastDate };
    } catch (err) {
      console.error("Error checking snapshot status:", err);
      return { hasToday: false, lastDate: null };
    }
  }, []);

  /**
   * Saves a snapshot for all accounts
   */
  const saveSnapshot = useCallback(async () => {
    try {
      const result = await saveDailySnapshot();
      console.log(`Snapshot guardado: ${result.snapshots_saved} cuentas para ${result.snapshot_date}`);

      await checkSnapshotStatus();
      await fetchComparison();
    } catch (err) {
      console.error("Error saving snapshot:", err);
      throw err;
    }
  }, [checkSnapshotStatus, fetchComparison]);

  /**
   * Refreshes comparison data and snapshot status
   */
  const refreshComparison = useCallback(async () => {
    await Promise.all([fetchComparison(), checkSnapshotStatus()]);
  }, [fetchComparison, checkSnapshotStatus]);

  /**
   * Gets comparison data for a specific account
   */
  const getComparisonForAccount = useCallback(
    (accountId: string): IDailyComparison | undefined => {
      return comparisons.find((comp) => comp.bank_account_id === accountId);
    },
    [comparisons]
  );

  /**
   * Initial data load and auto-snapshot logic
   */
  useEffect(() => {
    const initializeData = async () => {
      const status = await checkSnapshotStatus();

      if (autoSaveSnapshot && !status.hasToday) {
        console.log("No hay snapshot para hoy, creando uno automáticamente...");
        try {
          await saveSnapshot();
        } catch (err) {
          console.error("Error al crear snapshot automático:", err);
        }
      }

      await fetchComparison();
    };

    initializeData();
  }, [autoSaveSnapshot, checkSnapshotStatus, fetchComparison, saveSnapshot]);

  /**
   * Auto-refresh logic
   */
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(refreshComparison, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, refreshComparison]);

  return {
    comparisons,
    isLoading,
    error,
    lastSnapshotDate,
    hasSnapshotForToday,
    refreshComparison,
    saveSnapshot,
    getComparisonForAccount,
  };
};
