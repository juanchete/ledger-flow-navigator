import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Layers, TrendingDown, Calendar, DollarSign } from "lucide-react";
import { getVESLayersByAccount, type IVESLayer } from "@/integrations/supabase/vesLayerService";

interface IVESLayersBreakdownProps {
  bankAccountId: string;
  accountName: string;
  className?: string;
}

const formatCurrency = (amount: number, currency: 'USD' | 'VES') => {
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  } else {
    return `Bs. ${new Intl.NumberFormat('es-VE').format(amount)}`;
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('es-VE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

export const VESLayersBreakdown = ({
  bankAccountId,
  accountName,
  className = ""
}: IVESLayersBreakdownProps) => {
  const [layers, setLayers] = useState<IVESLayer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLayers = async () => {
      setLoading(true);
      try {
        const activeLayers = await getVESLayersByAccount(bankAccountId, true);
        setLayers(activeLayers);
      } catch (error) {
        console.error('Error fetching VES layers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLayers();
  }, [bankAccountId]);

  // Agrupar capas por tasa de cambio
  const groupedLayers = layers.reduce((groups, layer) => {
    const rate = layer.exchange_rate.toFixed(2); // Agrupar por tasa con 2 decimales
    if (!groups[rate]) {
      groups[rate] = {
        exchange_rate: layer.exchange_rate,
        amount_ves: 0,
        remaining_ves: 0,
        layers_count: 0,
        oldest_date: layer.created_at,
        newest_date: layer.created_at
      };
    }
    groups[rate].amount_ves += layer.amount_ves;
    groups[rate].remaining_ves += layer.remaining_ves;
    groups[rate].layers_count += 1;

    // Actualizar fechas más antigua y más reciente
    if (new Date(layer.created_at) < new Date(groups[rate].oldest_date)) {
      groups[rate].oldest_date = layer.created_at;
    }
    if (new Date(layer.created_at) > new Date(groups[rate].newest_date)) {
      groups[rate].newest_date = layer.created_at;
    }

    return groups;
  }, {} as Record<string, {
    exchange_rate: number;
    amount_ves: number;
    remaining_ves: number;
    layers_count: number;
    oldest_date: string;
    newest_date: string;
  }>);

  // Convertir a array y ordenar por tasa (menor a mayor = más antiguo primero en FIFO)
  const consolidatedLayers = Object.values(groupedLayers).sort((a, b) => a.exchange_rate - b.exchange_rate);

  const totalVES = layers.reduce((sum, layer) => sum + layer.remaining_ves, 0);
  const totalUSD = layers.reduce((sum, layer) => sum + (layer.remaining_ves / layer.exchange_rate), 0);
  const avgRate = totalVES > 0 ? totalVES / totalUSD : 0;

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (layers.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Capas VES FIFO</CardTitle>
          </div>
          <CardDescription>{accountName}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Layers className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No hay capas VES activas en esta cuenta</p>
            <p className="text-xs mt-1">Las capas se crean automáticamente cuando ingresan VES</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">Capas VES FIFO</CardTitle>
            <Badge variant="outline" className="text-xs">
              {consolidatedLayers.length} {consolidatedLayers.length === 1 ? 'tasa' : 'tasas'}
            </Badge>
            {layers.length !== consolidatedLayers.length && (
              <Badge variant="secondary" className="text-xs">
                {layers.length} capas consolidadas
              </Badge>
            )}
          </div>
        </div>
        <CardDescription>
          {accountName} - Desglose de saldos VES por costo histórico (agrupados por tasa de cambio)
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Resumen Total */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <div className="text-center md:text-left">
            <div className="text-xs text-muted-foreground mb-1">VES Disponible</div>
            <div className="text-lg font-bold text-blue-700">
              {formatCurrency(totalVES, 'VES')}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Costo Histórico USD</div>
            <div className="text-lg font-bold text-green-700">
              {formatCurrency(totalUSD, 'USD')}
            </div>
          </div>
          <div className="text-center md:text-right">
            <div className="text-xs text-muted-foreground mb-1">Tasa Promedio Ponderada</div>
            <div className="text-lg font-bold text-primary">
              Bs. {avgRate.toFixed(2)}/USD
            </div>
          </div>
        </div>

        {/* Lista de Capas Consolidadas */}
        <div className="space-y-3">
          <div className="text-sm font-medium text-muted-foreground mb-2">
            Capas Consolidadas por Tasa (FIFO - Primero en entrar, primero en salir)
          </div>
          {consolidatedLayers.map((consolidatedLayer, index) => {
            const consumedPercent = ((consolidatedLayer.amount_ves - consolidatedLayer.remaining_ves) / consolidatedLayer.amount_ves) * 100;
            const costUSD = consolidatedLayer.remaining_ves / consolidatedLayer.exchange_rate;
            const isMultipleLayers = consolidatedLayer.layers_count > 1;
            const isSameDate = consolidatedLayer.oldest_date === consolidatedLayer.newest_date;

            return (
              <div
                key={`rate-${consolidatedLayer.exchange_rate}`}
                className="p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      Tasa #{index + 1}
                    </Badge>
                    {isMultipleLayers && (
                      <Badge variant="secondary" className="text-xs flex items-center gap-1">
                        <Layers className="h-3 w-3" />
                        {consolidatedLayer.layers_count} capas consolidadas
                      </Badge>
                    )}
                    {consumedPercent > 0 && (
                      <Badge variant="secondary" className="text-xs flex items-center gap-1">
                        <TrendingDown className="h-3 w-3" />
                        {consumedPercent.toFixed(0)}% consumido
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {isMultipleLayers && !isSameDate ? (
                      <span>
                        {formatDate(consolidatedLayer.oldest_date)} - {formatDate(consolidatedLayer.newest_date)}
                      </span>
                    ) : (
                      formatDate(consolidatedLayer.oldest_date)
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">VES Original</div>
                    <div className="font-medium">{formatCurrency(consolidatedLayer.amount_ves, 'VES')}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">VES Restante</div>
                    <div className="font-medium text-blue-600">
                      {formatCurrency(consolidatedLayer.remaining_ves, 'VES')}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Tasa</div>
                    <div className="font-medium">Bs. {consolidatedLayer.exchange_rate.toFixed(2)}/USD</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Costo USD
                    </div>
                    <div className="font-bold text-green-600">
                      {formatCurrency(costUSD, 'USD')}
                    </div>
                  </div>
                </div>

                {/* Barra de progreso */}
                {consumedPercent > 0 && (
                  <div className="mt-3">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${100 - consumedPercent}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 text-right">
                      {(100 - consumedPercent).toFixed(0)}% disponible
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Nota Explicativa */}
        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md border border-dashed">
          <p className="font-medium mb-1">ℹ️ ¿Cómo funciona FIFO?</p>
          <p>
            Cuando se realizan egresos en VES (compras, gastos), se consumen las capas más antiguas primero.
            Esto permite calcular con precisión el costo histórico y las ganancias/pérdidas por tipo de cambio.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
