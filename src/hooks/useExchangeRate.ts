import { useState, useEffect } from "react";
import { exchangeRateService } from "@/services/exchangeRateService";
import { toast } from "@/components/ui/use-toast";

interface IUseExchangeRateReturn {
  exchangeRate: number;
  customRate: string;
  isLoadingRate: boolean;
  isRefreshing: boolean;
  lastUpdated: string;
  setCustomRate: (rate: string) => void;
  refreshExchangeRate: () => Promise<void>;
  handleCustomRateChange: (value: string) => void;
}

export const useExchangeRate = (): IUseExchangeRateReturn => {
  const [exchangeRate, setExchangeRate] = useState<number>(36.5);
  const [customRate, setCustomRate] = useState<string>("36.5");
  const [isLoadingRate, setIsLoadingRate] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("Sin datos recientes");

  // Cargar tasa de cambio al inicializar
  useEffect(() => {
    const loadExchangeRate = async () => {
      setIsLoadingRate(true);
      try {
        const response = await exchangeRateService.getExchangeRates();
        if (response.success && response.data) {
          const parallelRate = response.data.usd_to_ves_parallel;
          setExchangeRate(parallelRate);
          setCustomRate(parallelRate.toString());
          setLastUpdated(response.data.last_updated);
        } else {
          setExchangeRate(36.5);
          setCustomRate("36.5");
          setLastUpdated("Sin datos recientes");
        }
      } catch (error) {
        console.error("Error al cargar tasa de cambio:", error);
        setExchangeRate(36.5);
        setCustomRate("36.5");
        setLastUpdated("Error al cargar");
      } finally {
        setIsLoadingRate(false);
      }
    };

    loadExchangeRate();
  }, []);

  // Función para refrescar la tasa de cambio
  const refreshExchangeRate = async () => {
    setIsRefreshing(true);
    try {
      const response = await exchangeRateService.forceRefresh();
      if (response.success && response.data) {
        const parallelRate = response.data.usd_to_ves_parallel;
        setExchangeRate(parallelRate);
        setCustomRate(parallelRate.toString());
        setLastUpdated(response.data.last_updated);

        toast({
          title: "Tasa actualizada",
          description: `Nueva tasa paralelo: Bs. ${parallelRate.toFixed(2)}`,
        });
      } else {
        throw new Error("No se pudo actualizar la tasa");
      }
    } catch (error) {
      console.error("Error al refrescar tasa:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la tasa de cambio",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Actualizar tasa cuando el usuario cambia el valor
  const handleCustomRateChange = (value: string) => {
    setCustomRate(value);
    const numericValue = parseFloat(value);
    if (!isNaN(numericValue) && numericValue > 0) {
      setExchangeRate(numericValue);
    }
  };

  return {
    exchangeRate,
    customRate,
    isLoadingRate,
    isRefreshing,
    lastUpdated,
    setCustomRate,
    refreshExchangeRate,
    handleCustomRateChange,
  };
};
