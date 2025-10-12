import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { IDailyComparison } from "@/integrations/supabase/dailySnapshotService";

interface IDailyChangeIndicatorProps {
  comparison: IDailyComparison | undefined;
  showPercentage?: boolean;
  showAbsolute?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  useHistoricalCost?: boolean;
}

/**
 * Component that displays daily change indicators for account balances
 *
 * Shows visual indicators (arrows, badges) for increases, decreases, or no change
 * compared to the previous snapshot.
 *
 * @param comparison - Daily comparison data for the account
 * @param showPercentage - Show percentage change (default: true)
 * @param showAbsolute - Show absolute change amount (default: true)
 * @param size - Size variant: sm, md, lg (default: md)
 * @param className - Additional CSS classes
 * @param useHistoricalCost - Use historical cost for VES accounts instead of amount (default: false)
 */
export const DailyChangeIndicator = ({
  comparison,
  showPercentage = true,
  showAbsolute = true,
  size = 'md',
  className = "",
  useHistoricalCost = false
}: IDailyChangeIndicatorProps) => {
  if (!comparison || comparison.previous_amount === null) {
    return null;
  }

  const isVES = comparison.currency === 'VES';
  const change = useHistoricalCost && isVES
    ? comparison.historical_cost_change
    : comparison.amount_change;

  const changePercent = useHistoricalCost && isVES
    ? comparison.historical_cost_change_percent
    : comparison.amount_change_percent;

  const direction = comparison.change_direction;

  const sizeClasses = {
    sm: "text-xs h-3 w-3",
    md: "text-sm h-4 w-4",
    lg: "text-base h-5 w-5"
  };

  const badgeSizes = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-sm px-2 py-1",
    lg: "text-base px-2.5 py-1.5"
  };

  const iconSize = sizeClasses[size];
  const badgeSize = badgeSizes[size];

  const formatChange = (amount: number): string => {
    if (useHistoricalCost && isVES) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
      }).format(Math.abs(amount));
    }

    if (comparison.currency === 'USD') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
      }).format(Math.abs(amount));
    } else {
      return `Bs. ${new Intl.NumberFormat('es-VE').format(Math.abs(amount))}`;
    }
  };

  if (direction === 'no_change') {
    return (
      <Badge variant="secondary" className={cn(badgeSize, "flex items-center gap-1", className)}>
        <Minus className={iconSize} />
        <span>Sin cambios</span>
      </Badge>
    );
  }

  const isIncrease = direction === 'increase';

  return (
    <Badge
      variant={isIncrease ? "default" : "destructive"}
      className={cn(
        badgeSize,
        "flex items-center gap-1",
        isIncrease ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700",
        className
      )}
    >
      {isIncrease ? (
        <TrendingUp className={iconSize} />
      ) : (
        <TrendingDown className={iconSize} />
      )}
      <span className="flex items-center gap-1">
        {showAbsolute && (
          <span>{isIncrease ? '+' : '-'}{formatChange(change)}</span>
        )}
        {showAbsolute && showPercentage && changePercent !== null && (
          <span>•</span>
        )}
        {showPercentage && changePercent !== null && (
          <span>{isIncrease ? '+' : '-'}{Math.abs(changePercent).toFixed(1)}%</span>
        )}
      </span>
    </Badge>
  );
};

interface IDailyChangeTooltipProps {
  comparison: IDailyComparison | undefined;
  useHistoricalCost?: boolean;
}

/**
 * Detailed tooltip content showing full comparison data
 */
export const DailyChangeTooltip = ({
  comparison,
  useHistoricalCost = false
}: IDailyChangeTooltipProps) => {
  if (!comparison || comparison.previous_amount === null) {
    return (
      <div className="text-xs text-muted-foreground">
        No hay comparación disponible
      </div>
    );
  }

  const isVES = comparison.currency === 'VES';

  const formatCurrency = (amount: number, isUSD: boolean = false): string => {
    if (isUSD || comparison.currency === 'USD') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
      }).format(amount);
    } else {
      return `Bs. ${new Intl.NumberFormat('es-VE').format(amount)}`;
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-VE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  return (
    <div className="space-y-2 text-xs">
      <div>
        <div className="font-medium mb-1">Comparación con snapshot anterior</div>
        <div className="text-muted-foreground">
          Fecha: {comparison.comparison_date ? formatDate(comparison.comparison_date) : 'N/A'}
        </div>
        {comparison.days_since_snapshot !== null && (
          <div className="text-muted-foreground">
            Hace {comparison.days_since_snapshot} {comparison.days_since_snapshot === 1 ? 'día' : 'días'}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Anterior:</span>
          <span className="font-medium">
            {formatCurrency(comparison.previous_amount)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Actual:</span>
          <span className="font-medium">
            {formatCurrency(comparison.current_amount)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Cambio:</span>
          <span className={cn(
            "font-medium",
            comparison.change_direction === 'increase' && "text-green-600",
            comparison.change_direction === 'decrease' && "text-red-600"
          )}>
            {comparison.change_direction === 'increase' ? '+' : comparison.change_direction === 'decrease' ? '-' : ''}
            {formatCurrency(Math.abs(comparison.amount_change))}
            {comparison.amount_change_percent !== null && (
              <span className="ml-1">
                ({comparison.change_direction === 'increase' ? '+' : '-'}
                {Math.abs(comparison.amount_change_percent).toFixed(1)}%)
              </span>
            )}
          </span>
        </div>
      </div>

      {isVES && useHistoricalCost && (
        <div className="pt-2 border-t space-y-1">
          <div className="font-medium">Costo Histórico USD</div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Anterior:</span>
            <span className="font-medium">
              {formatCurrency(comparison.previous_historical_cost_usd || 0, true)}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Actual:</span>
            <span className="font-medium">
              {formatCurrency(comparison.current_historical_cost_usd, true)}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Cambio:</span>
            <span className={cn(
              "font-medium",
              comparison.historical_cost_change > 0 && "text-green-600",
              comparison.historical_cost_change < 0 && "text-red-600"
            )}>
              {comparison.historical_cost_change > 0 ? '+' : ''}
              {formatCurrency(comparison.historical_cost_change, true)}
              {comparison.historical_cost_change_percent !== null && (
                <span className="ml-1">
                  ({comparison.historical_cost_change > 0 ? '+' : ''}
                  {comparison.historical_cost_change_percent.toFixed(1)}%)
                </span>
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
