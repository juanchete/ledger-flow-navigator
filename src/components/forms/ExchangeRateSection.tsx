import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw } from "lucide-react";

interface ExchangeRateSectionProps {
  exchangeRate: number;
  customRate: string;
  useCustomRate: boolean;
  isLoadingRate: boolean;
  isRefreshing: boolean;
  lastUpdated: string;
  onCustomRateChange: (value: string) => void;
  onUseCustomRateChange: (checked: boolean) => void;
  onRefreshRate: () => void;
  className?: string;
}

export const ExchangeRateSection: React.FC<ExchangeRateSectionProps> = ({
  exchangeRate,
  customRate,
  useCustomRate,
  isLoadingRate,
  isRefreshing,
  lastUpdated,
  onCustomRateChange,
  onUseCustomRateChange,
  onRefreshRate,
  className = "",
}) => {
  return (
    <div className={`grid gap-4 p-4 border rounded-lg bg-muted/10 ${className}`}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Tasa de Cambio (USD/VES)</Label>
        <div className="flex items-center gap-2">
          {isLoadingRate && (
            <span className="text-xs text-muted-foreground">Cargando...</span>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRefreshRate}
            disabled={isLoadingRate || isRefreshing}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="useCustomRate"
              checked={useCustomRate}
              onChange={(e) => onUseCustomRateChange(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="useCustomRate" className="text-sm">
              Usar tasa personalizada
            </Label>
          </div>
          
          <Input
            type="number"
            step="0.01"
            min="0"
            value={customRate}
            onChange={(e) => onCustomRateChange(e.target.value)}
            disabled={!useCustomRate}
            placeholder="Ingresa tasa personalizada"
            className={!useCustomRate ? "bg-muted" : ""}
          />
        </div>
        
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">
            {useCustomRate ? "Tasa actual:" : "Tasa paralelo actual:"}
          </Label>
          <div className="text-lg font-medium">
            {isLoadingRate ? "..." : `Bs. ${exchangeRate.toFixed(2)}`}
          </div>
          <div className="text-xs text-muted-foreground">
            {useCustomRate ? "Personalizada" : "Obtenida automáticamente"}
          </div>
          {lastUpdated && !useCustomRate && (
            <div className="text-xs text-muted-foreground">
              Actualizada: {new Date(lastUpdated).toLocaleString('es-VE', {
                dateStyle: 'short',
                timeStyle: 'short'
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 