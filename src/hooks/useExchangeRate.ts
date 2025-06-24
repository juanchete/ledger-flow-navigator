import { useState, useEffect } from "react";
import { exchangeRateService } from "@/services/exchangeRateService";
import { toast } from "@/components/ui/use-toast";

interface UseExchangeRateReturn {
  exchangeRate: number;
  customRate: string;
  useCustomRate: boolean;
  isLoadingRate: boolean;
  isRefreshing: boolean;
  lastUpdated: string;
  setCustomRate: (rate: string) => void;
  setUseCustomRate: (use: boolean) => void;
  refreshExchangeRate: () => Promise<void>;
  handleCustomRateChange: (value: string) => void;
  handleUseCustomRateChange: (checked: boolean) => void;
}

export const useExchangeRate = (): UseExchangeRateReturn => {
  const [exchangeRate, setExchangeRate] = useState<number>(36.5);
  const [customRate, setCustomRate] = useState<string>("36.5");
  const [useCustomRate, setUseCustomRate] = useState(false);
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
        if (!useCustomRate) {
          setExchangeRate(parallelRate);
        }
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

  // Actualizar tasa cuando el usuario cambia el valor personalizado
  const handleCustomRateChange = (value: string) => {
    setCustomRate(value);
    if (useCustomRate) {
      const numericValue = parseFloat(value);
      if (!isNaN(numericValue) && numericValue > 0) {
        setExchangeRate(numericValue);
      }
    }
  };

  // Manejar el cambio del checkbox de tasa personalizada
  const handleUseCustomRateChange = (checked: boolean) => {
    setUseCustomRate(checked);
    if (checked) {
      const numericValue = parseFloat(customRate);
      if (!isNaN(numericValue) && numericValue > 0) {
        setExchangeRate(numericValue);
      }
    } else {
      // Recargar la tasa automática
      const reloadAutomaticRate = async () => {
        try {
          const response = await exchangeRateService.getExchangeRates();
          if (response.success && response.data) {
            const parallelRate = response.data.usd_to_ves_parallel;
            setExchangeRate(parallelRate);
            setCustomRate(parallelRate.toString());
            setLastUpdated(response.data.last_updated);
          }
        } catch (error) {
          console.error("Error al recargar tasa automática:", error);
        }
      };
      reloadAutomaticRate();
    }
  };

  return {
    exchangeRate,
    customRate,
    useCustomRate,
    isLoadingRate,
    isRefreshing,
    lastUpdated,
    setCustomRate,
    setUseCustomRate,
    refreshExchangeRate,
    handleCustomRateChange,
    handleUseCustomRateChange,
  };
};
