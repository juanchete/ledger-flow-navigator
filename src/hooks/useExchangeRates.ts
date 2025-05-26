import { useState, useEffect, useCallback } from "react";
import {
  exchangeRateService,
  ExchangeRate,
} from "../services/exchangeRateService";

interface UseExchangeRatesReturn {
  rates: ExchangeRate | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
  refreshRates: () => Promise<void>;
  convertUSDToVES: (
    amount: number,
    rateType?: "bcv" | "parallel"
  ) => number | null;
  convertVESToUSD: (
    amount: number,
    rateType?: "bcv" | "parallel"
  ) => number | null;
}

export const useExchangeRates = (
  autoRefresh: boolean = true
): UseExchangeRatesReturn => {
  const [rates, setRates] = useState<ExchangeRate | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRates = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await exchangeRateService.getExchangeRates();

      if (response.success && response.data) {
        setRates(response.data);
        setError(null);
      } else {
        setError(response.error || "Error desconocido al obtener tasas");
      }
    } catch (err) {
      setError("Error de conexión al obtener tasas de cambio");
      console.error("Error fetching exchange rates:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshRates = useCallback(async () => {
    await exchangeRateService.forceRefresh();
    await fetchRates();
  }, [fetchRates]);

  const convertUSDToVES = useCallback(
    (
      amount: number,
      rateType: "bcv" | "parallel" = "parallel"
    ): number | null => {
      if (!rates) return null;
      try {
        return exchangeRateService.convertUSDToVES(amount, rateType);
      } catch {
        return null;
      }
    },
    [rates]
  );

  const convertVESToUSD = useCallback(
    (
      amount: number,
      rateType: "bcv" | "parallel" = "parallel"
    ): number | null => {
      if (!rates) return null;
      try {
        return exchangeRateService.convertVESToUSD(amount, rateType);
      } catch {
        return null;
      }
    },
    [rates]
  );

  useEffect(() => {
    fetchRates();

    if (autoRefresh) {
      // Actualizar cada 30 minutos
      const interval = setInterval(fetchRates, 30 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [fetchRates, autoRefresh]);

  return {
    rates,
    isLoading,
    error,
    lastUpdated: rates?.last_updated || null,
    refreshRates,
    convertUSDToVES,
    convertVESToUSD,
  };
};
