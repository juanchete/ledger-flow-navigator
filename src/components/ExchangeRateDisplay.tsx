import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { RefreshCw, TrendingUp, Building2, Users } from 'lucide-react';
import { useExchangeRates } from '../hooks/useExchangeRates';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ExchangeRateDisplayProps {
  compact?: boolean;
  showRefreshButton?: boolean;
}

export const ExchangeRateDisplay: React.FC<ExchangeRateDisplayProps> = ({ 
  compact = false, 
  showRefreshButton = true 
}) => {
  const { rates, isLoading, error, lastUpdated, refreshRates } = useExchangeRates();

  const formatCurrency = (amount: number, currency: 'USD' | 'VES') => {
    if (currency === 'USD') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    } else {
      return `Bs. ${new Intl.NumberFormat('es-VE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount)}`;
    }
  };

  const formatLastUpdated = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "dd/MM/yyyy 'a las' HH:mm", { locale: es });
    } catch {
      return 'Fecha no disponible';
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-4 text-sm">
        {isLoading ? (
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Cargando tasas...</span>
          </div>
        ) : error ? (
          <Badge variant="destructive">Error en tasas</Badge>
        ) : rates ? (
          <>
            <div className="flex items-center gap-1">
              <Building2 className="h-4 w-4 text-blue-600" />
              <span>BCV: {formatCurrency(rates.usd_to_ves_bcv, 'VES')}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4 text-green-600" />
              <span>Paralelo: {formatCurrency(rates.usd_to_ves_parallel, 'VES')}</span>
            </div>
          </>
        ) : null}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Tasas de Cambio</CardTitle>
          {showRefreshButton && (
            <Button
              variant="outline"
              size="sm"
              onClick={refreshRates}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2 text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Obteniendo tasas de cambio...</span>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <Badge variant="destructive" className="mb-2">
              Error al obtener tasas
            </Badge>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshRates}
              className="mt-3"
            >
              Reintentar
            </Button>
          </div>
        ) : rates ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tasa BCV */}
              <div className="p-4 border rounded-lg bg-blue-50/50 border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-900">BCV (Oficial)</span>
                </div>
                <div className="text-2xl font-bold text-blue-900">
                  {formatCurrency(rates.usd_to_ves_bcv, 'VES')}
                </div>
                <div className="text-xs text-blue-700 mt-1">
                  Fuente: {rates.source_bcv}
                </div>
              </div>

              {/* Tasa Paralelo */}
              <div className="p-4 border rounded-lg bg-green-50/50 border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-900">Paralelo</span>
                </div>
                <div className="text-2xl font-bold text-green-900">
                  {formatCurrency(rates.usd_to_ves_parallel, 'VES')}
                </div>
                <div className="text-xs text-green-700 mt-1">
                  Fuente: {rates.source_parallel}
                </div>
              </div>
            </div>

                          {/* Información adicional */}
              <div className="pt-3 border-t">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Última actualización:</span>
                  <span>{lastUpdated ? formatLastUpdated(lastUpdated) : 'No disponible'}</span>
                </div>
                
                {/* Diferencia entre tasas */}
                <div className="flex items-center justify-between text-sm text-muted-foreground mt-1">
                  <span>Diferencia:</span>
                  <span>
                    {formatCurrency(rates.usd_to_ves_parallel - rates.usd_to_ves_bcv, 'VES')} 
                    ({((rates.usd_to_ves_parallel - rates.usd_to_ves_bcv) / rates.usd_to_ves_bcv * 100).toFixed(1)}%)
                  </span>
                </div>

                {/* Indicador de fuente de datos */}
                <div className="flex items-center justify-between text-sm text-muted-foreground mt-1">
                  <span>Fuente de datos:</span>
                  <span className="flex items-center gap-1">
                    {rates.source_bcv === 'PyDolarVe API' ? (
                      <span className="text-green-600">● API en vivo</span>
                    ) : rates.source_bcv.includes('Database') ? (
                      <span className="text-yellow-600">● Base de datos</span>
                    ) : (
                      <span className="text-red-600">● Fallback</span>
                    )}
                  </span>
                </div>
              </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}; 