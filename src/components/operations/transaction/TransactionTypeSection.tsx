
import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TransactionTypeSectionProps {
  selectedType: string;
  onTypeChange: (type: string) => void;
}

export const TransactionTypeSection: React.FC<TransactionTypeSectionProps> = ({
  selectedType,
  onTypeChange
}) => {
  return (
    <div className="grid gap-2">
      <Label htmlFor="transaction-type">Transaction Type</Label>
      <Select value={selectedType} onValueChange={onTypeChange}>
        <SelectTrigger id="transaction-type">
          <SelectValue placeholder="Select type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="purchase">Purchase</SelectItem>
          <SelectItem value="sale">Sale</SelectItem>
          <SelectItem value="banking">Banking</SelectItem>
          <SelectItem value="balance-change">Balance Change</SelectItem>
          <SelectItem value="expense">Expense</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
