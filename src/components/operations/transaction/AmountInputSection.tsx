
import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CurrencySwitch } from "../common/CurrencySwitch";

interface AmountInputSectionProps {
  amount: string;
  isUSD: boolean;
  onAmountChange: (value: string) => void;
  onCurrencyChange: (isUSD: boolean) => void;
  exchangeRate: number;
}

export const AmountInputSection: React.FC<AmountInputSectionProps> = ({
  amount,
  isUSD,
  onAmountChange,
  onCurrencyChange,
  exchangeRate
}) => {
  const getConvertedAmount = () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return "0.00";
    
    if (isUSD) {
      return (numAmount * exchangeRate).toFixed(2);
    }
    return (numAmount / exchangeRate).toFixed(2);
  };

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="amount">Amount</Label>
        <CurrencySwitch isUSD={isUSD} onCheckedChange={onCurrencyChange} />
      </div>
      <Input
        id="amount"
        type="number"
        step="0.01"
        min="0"
        placeholder="0.00"
        value={amount}
        onChange={(e) => onAmountChange(e.target.value)}
      />
      <div className="text-sm text-muted-foreground">
        Equivalent: {isUSD ? "VES " : "USD "}{getConvertedAmount()}
      </div>
    </div>
  );
};
