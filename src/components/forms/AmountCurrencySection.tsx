import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AmountCurrencySectionProps {
  amount: string | number;
  currency: string;
  exchangeRate?: number;
  onAmountChange: (amount: string) => void;
  onCurrencyChange: (currency: string) => void;
  currencies?: Array<{ value: string; label: string }>;
  showExchangePreview?: boolean;
  required?: boolean;
  className?: string;
}

const DEFAULT_CURRENCIES = [
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
  { value: 'VES', label: 'VES' },
  { value: 'COP', label: 'COP' },
];

export const AmountCurrencySection: React.FC<AmountCurrencySectionProps> = ({
  amount,
  currency,
  exchangeRate,
  onAmountChange,
  onCurrencyChange,
  currencies = DEFAULT_CURRENCIES,
  showExchangePreview = true,
  required = true,
  className = "",
}) => {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) || 0 : amount;
  
  return (
    <div className={`grid gap-4 p-4 border rounded-lg bg-muted/10 ${className}`}>
      <Label className="text-sm font-medium">Monto y Moneda</Label>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm">Monto {required && '*'}</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            placeholder={`0.00 ${currency}`}
            required={required}
          />
          {showExchangePreview && exchangeRate && exchangeRate > 0 && (
            <>
              {currency === 'USD' && (
                <div className="text-xs text-muted-foreground">
                  ≈ Bs. {(numericAmount * exchangeRate).toFixed(2)}
                </div>
              )}
              {currency === 'VES' && (
                <div className="text-xs text-muted-foreground">
                  ≈ ${(numericAmount / exchangeRate).toFixed(2)} USD
                </div>
              )}
            </>
          )}
        </div>
        
        <div className="space-y-2">
          <Label className="text-sm">Moneda</Label>
          <Select value={currency} onValueChange={onCurrencyChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currencies.map((curr) => (
                <SelectItem key={curr.value} value={curr.value}>
                  {curr.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}; 