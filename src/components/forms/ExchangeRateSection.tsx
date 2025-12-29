import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw } from "lucide-react";

interface ExchangeRateSectionProps {
  exchangeRate: number;
  customRate: string;
  isLoadingRate: boolean;
  isRefreshing: boolean;
  lastUpdated: string;
  onCustomRateChange: (value: string) => void;
  onRefreshRate: () => void;
  className?: string;
}

export const ExchangeRateSection: React.FC<ExchangeRateSectionProps> = ({
  exchangeRate,
  customRate,
  isLoadingRate,
  isRefreshing,
  lastUpdated,
  onCustomRateChange,
  onRefreshRate,
  className = "",
}) => {
  return (
    <div className={`grid gap-3 p-4 border rounded-lg bg-muted/10 ${className}`}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Tasa de Cambio (USD/VES)</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRefreshRate}
          disabled={isLoadingRate || isRefreshing}
          className="h-8 gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Actualizando...' : 'Actualizar'}
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Input
            type="number"
            step="0.01"
            min="0"
            value={customRate}
            onChange={(e) => onCustomRateChange(e.target.value)}
            placeholder="Ingresa la tasa"
            className="text-lg font-medium"
          />
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <div>Bs. por USD</div>
          {lastUpdated && (
            <div className="text-xs">
              {lastUpdated === "Sin datos recientes" || lastUpdated === "Error al cargar"
                ? lastUpdated
                : `Actualizada: ${new Date(lastUpdated).toLocaleString('es-VE', {
                    dateStyle: 'short',
                    timeStyle: 'short'
                  })}`
              }
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
