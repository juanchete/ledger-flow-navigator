
import React from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface CurrencySwitchProps {
  isUSD: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export const CurrencySwitch: React.FC<CurrencySwitchProps> = ({ 
  isUSD, 
  onCheckedChange 
}) => {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm">VES</span>
      <Switch
        checked={isUSD}
        onCheckedChange={onCheckedChange}
      />
      <span className="text-sm">USD</span>
    </div>
  );
};
