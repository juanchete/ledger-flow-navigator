import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Transaction } from "@/types";

interface TransactionTypeSectionProps {
  selectedType: Transaction["type"];
  onTypeChange: (type: Transaction["type"]) => void;
}

export const TransactionTypeSection: React.FC<TransactionTypeSectionProps> = ({
  selectedType,
  onTypeChange
}) => {
  return (
    <div className="grid gap-2">
      <Label htmlFor="transaction-type">Tipo de Transacción</Label>
      <Select value={selectedType} onValueChange={onTypeChange as (value: string) => void}>
        <SelectTrigger id="transaction-type">
          <SelectValue placeholder="Seleccionar tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="payment">Pago</SelectItem>
          <SelectItem value="expense">Gasto</SelectItem>
          <SelectItem value="ingreso">Ingreso</SelectItem>
          <SelectItem value="sale">Venta</SelectItem>
          <SelectItem value="purchase">Compra</SelectItem>
          <SelectItem value="balance-change">Cambio de Saldo</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
