import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  RefreshCw, 
  Settings, 
  TrendingUp, 
  Building2, 
  Calculator,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { ExchangeRateDisplay } from '@/components/ExchangeRateDisplay';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const ExchangeRates = () => {
  const { rates, isLoading, error, refreshRates, convertUSDToVES, convertVESToUSD } = useExchangeRates();
  const [usdAmount, setUsdAmount] = useState<string>('100');
  const [vesAmount, setVesAmount] = useState<string>('3800');
  const [selectedRate, setSelectedRate] = useState<'bcv' | 'parallel'>('parallel');

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

  const handleUSDConversion = () => {
    const amount = parseFloat(usdAmount);
    if (!isNaN(amount) && convertUSDToVES) {
      const converted = convertUSDToVES(amount, selectedRate);
      if (converted) {
        setVesAmount(converted.toFixed(2));
      }
    }
  };

  const handleVESConversion = () => {
    const amount = parseFloat(vesAmount);
    if (!isNaN(amount) && convertVESToUSD) {
      const converted = convertVESToUSD(amount, selectedRate);
      if (converted) {
        setUsdAmount(converted.toFixed(2));
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasas de Cambio</h1>
          <p className="text-muted-foreground">
            Monitorea las tasas de cambio del dólar estadounidense en Venezuela
          </p>
        </div>
        <Button onClick={refreshRates} disabled={isLoading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Actualizar Tasas
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}. Las tasas mostradas pueden no estar actualizadas.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel principal de tasas */}
        <div className="space-y-6">
          <ExchangeRateDisplay compact={false} showRefreshButton={false} />

          {/* Información adicional */}
          {rates && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Análisis de Tasas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-sm text-blue-600 font-medium">Tasa BCV</div>
                    <div className="text-lg font-bold text-blue-900">
                      {formatCurrency(rates.usd_to_ves_bcv, 'VES')}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-sm text-green-600 font-medium">Tasa Paralelo</div>
                    <div className="text-lg font-bold text-green-900">
                      {formatCurrency(rates.usd_to_ves_parallel, 'VES')}
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Diferencia absoluta:</span>
                    <span className="font-medium">
                      {formatCurrency(rates.usd_to_ves_parallel - rates.usd_to_ves_bcv, 'VES')}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Diferencia porcentual:</span>
                    <span className="font-medium">
                      {((rates.usd_to_ves_parallel - rates.usd_to_ves_bcv) / rates.usd_to_ves_bcv * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Última actualización:</span>
                    <span className="font-medium">
                      {format(new Date(rates.last_updated), "dd/MM/yyyy HH:mm", { locale: es })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Calculadora de conversión */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Calculadora de Conversión
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Selector de tasa */}
              <div className="space-y-2">
                <Label>Tasa a utilizar:</Label>
                <div className="flex gap-2">
                  <Button
                    variant={selectedRate === 'bcv' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedRate('bcv')}
                    className="flex-1"
                  >
                    <Building2 className="h-4 w-4 mr-2" />
                    BCV
                  </Button>
                  <Button
                    variant={selectedRate === 'parallel' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedRate('parallel')}
                    className="flex-1"
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Paralelo
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Conversión USD a VES */}
              <div className="space-y-3">
                <Label htmlFor="usd-input">Dólares (USD)</Label>
                <div className="flex gap-2">
                  <Input
                    id="usd-input"
                    type="number"
                    value={usdAmount}
                    onChange={(e) => setUsdAmount(e.target.value)}
                    placeholder="Cantidad en USD"
                    step="0.01"
                  />
                  <Button onClick={handleUSDConversion} size="sm">
                    Convertir
                  </Button>
                </div>
              </div>

              <div className="text-center text-muted-foreground">
                ⇅
              </div>

              {/* Conversión VES a USD */}
              <div className="space-y-3">
                <Label htmlFor="ves-input">Bolívares (VES)</Label>
                <div className="flex gap-2">
                  <Input
                    id="ves-input"
                    type="number"
                    value={vesAmount}
                    onChange={(e) => setVesAmount(e.target.value)}
                    placeholder="Cantidad en VES"
                    step="0.01"
                  />
                  <Button onClick={handleVESConversion} size="sm">
                    Convertir
                  </Button>
                </div>
              </div>

              {rates && (
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground text-center">
                    Tasa utilizada: {formatCurrency(
                      selectedRate === 'bcv' ? rates.usd_to_ves_bcv : rates.usd_to_ves_parallel, 
                      'VES'
                    )} por USD
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Estado de las fuentes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Estado de las Fuentes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {rates ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">BCV:</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={rates.source_bcv !== 'fallback' ? 'default' : 'secondary'}>
                        {rates.source_bcv}
                      </Badge>
                      {rates.source_bcv !== 'fallback' ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Paralelo:</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={rates.source_parallel !== 'fallback' ? 'default' : 'secondary'}>
                        {rates.source_parallel}
                      </Badge>
                      {rates.source_parallel !== 'fallback' ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center text-muted-foreground">
                  No hay información de fuentes disponible
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ExchangeRates; 