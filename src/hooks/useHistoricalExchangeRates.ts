import { useState, useEffect, useCallback } from "react";
import { getTransactionExchangeRateValue } from "@/integrations/supabase/exchangeRateService";

interface HistoricalRate {
  transactionId: string;
  rate: number | null;
}

export const useHistoricalExchangeRates = (transactionIds: string[]) => {
  const [historicalRates, setHistoricalRates] = useState<
    Record<string, number | null>
  >({});
  const [loading, setLoading] = useState(false);

  const loadHistoricalRates = useCallback(async (txIds: string[]) => {
    if (txIds.length === 0) return;

    setLoading(true);
    try {
      const ratePromises = txIds.map(async (txId) => {
        const rate = await getTransactionExchangeRateValue(txId);
        return { transactionId: txId, rate };
      });

      const rates = await Promise.all(ratePromises);

      const ratesMap: Record<string, number | null> = {};
      rates.forEach(({ transactionId, rate }) => {
        ratesMap[transactionId] = rate;
      });

      setHistoricalRates((prev) => ({ ...prev, ...ratesMap }));
    } catch (error) {
      console.error("Error loading historical rates:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Filtrar solo las transacciones que no tenemos tasas cargadas
    const missingRates = transactionIds.filter(
      (id) => !(id in historicalRates)
    );
    if (missingRates.length > 0) {
      loadHistoricalRates(missingRates);
    }
  }, [transactionIds, historicalRates, loadHistoricalRates]);

  const getHistoricalRate = useCallback(
    (transactionId: string): number | null => {
      return historicalRates[transactionId] || null;
    },
    [historicalRates]
  );

  const convertVESToUSDWithHistoricalRate = useCallback(
    (
      vesAmount: number,
      transactionId: string,
      fallbackRate?: number
    ): number => {
      const historicalRate = getHistoricalRate(transactionId);

      if (historicalRate && historicalRate > 0) {
        return vesAmount / historicalRate;
      }

      // Usar tasa de fallback si está disponible
      if (fallbackRate && fallbackRate > 0) {
        return vesAmount / fallbackRate;
      }

      // Si no hay tasa disponible, retornar el monto original (asumiendo que ya está en USD)
      return vesAmount;
    },
    [getHistoricalRate]
  );

  return {
    historicalRates,
    loading,
    getHistoricalRate,
    convertVESToUSDWithHistoricalRate,
  };
};
