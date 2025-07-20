import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { ArrowUpDown, Percent, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TransactionIndicatorsProps {
  // Exchange rate indicator
  exchangeRate?: number;
  fromCurrency?: string;
  toCurrency?: string;
  isOfficialRate?: boolean;
  
  // Commission indicator
  commission?: number | null;
  
  // Transaction type for color coding
  transactionType?: string;
  amount?: number;
  
  // Display options
  showLabels?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const TransactionIndicators: React.FC<TransactionIndicatorsProps> = ({
  exchangeRate,
  fromCurrency,
  toCurrency,
  isOfficialRate = true,
  commission,
  transactionType,
  amount,
  showLabels = false,
  size = 'sm',
}) => {
  // Calculate commission level for color coding
  const getCommissionLevel = (commissionPercent: number) => {
    if (commissionPercent <= 2) return 'low';
    if (commissionPercent <= 5) return 'medium';
    return 'high';
  };

  // Get commission color classes
  const getCommissionColorClass = (level: string) => {
    switch (level) {
      case 'low':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'medium':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get exchange rate color classes
  const getExchangeRateColorClass = () => {
    if (!exchangeRate) return '';
    return isOfficialRate 
      ? 'bg-green-100 text-green-800 border-green-200' 
      : 'bg-orange-100 text-orange-800 border-orange-200';
  };

  // Get transaction type icon and color
  const getTransactionIcon = () => {
    if (!transactionType || !amount) return null;
    
    const isIncome = ['sale', 'payment', 'cash', 'ingreso'].includes(transactionType);
    const Icon = isIncome ? TrendingUp : TrendingDown;
    const colorClass = isIncome ? 'text-green-600' : 'text-red-600';
    
    return <Icon className={cn('inline-block', size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5', colorClass)} />;
  };

  const iconSize = size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5';
  const fontSize = size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base';

  return (
    <div className="inline-flex items-center gap-1">
      {/* Transaction type indicator */}
      {getTransactionIcon()}

      {/* Exchange rate indicator */}
      {exchangeRate && fromCurrency && toCurrency && (
        <Tooltip>
          <TooltipTrigger>
            <Badge
              variant="outline"
              className={cn(
                'cursor-help',
                fontSize,
                getExchangeRateColorClass(),
                size === 'sm' ? 'px-1 py-0' : size === 'md' ? 'px-1.5 py-0.5' : 'px-2 py-1'
              )}
            >
              <ArrowUpDown className={cn(iconSize, 'mr-0.5')} />
              {showLabels && <span>{exchangeRate.toFixed(2)}</span>}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-sm">
              <p className="font-medium">Tasa de cambio aplicada</p>
              <p>{fromCurrency} → {toCurrency}: {exchangeRate.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {isOfficialRate ? 'Tasa oficial' : 'Tasa paralela/personalizada'}
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      )}

      {/* Commission indicator */}
      {commission !== null && commission !== undefined && commission > 0 && (
        <Tooltip>
          <TooltipTrigger>
            <Badge
              variant="outline"
              className={cn(
                'cursor-help',
                fontSize,
                getCommissionColorClass(getCommissionLevel(commission)),
                size === 'sm' ? 'px-1 py-0' : size === 'md' ? 'px-1.5 py-0.5' : 'px-2 py-1'
              )}
            >
              <Percent className={cn(iconSize, 'mr-0.5')} />
              {showLabels && <span>{commission}%</span>}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-sm">
              <p className="font-medium">Comisión bancaria</p>
              <p>{commission}% del monto total</p>
              {amount && (
                <p className="text-xs text-muted-foreground mt-1">
                  Comisión: {((amount * commission) / 100).toFixed(2)}
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
};

// Export color helper functions for use in other components
export const getAmountColorClass = (transactionType: string) => {
  const incomeTypes = ['sale', 'payment', 'cash', 'ingreso'];
  return incomeTypes.includes(transactionType) ? 'text-green-600' : 'text-red-600';
};

export const getAmountBackgroundClass = (transactionType: string, subtle = true) => {
  const incomeTypes = ['sale', 'payment', 'cash', 'ingreso'];
  if (subtle) {
    return incomeTypes.includes(transactionType) ? 'bg-green-50' : 'bg-red-50';
  }
  return incomeTypes.includes(transactionType) ? 'bg-green-100' : 'bg-red-100';
};