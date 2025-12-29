import React, { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Upload, X, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { v4 as uuidv4 } from "uuid";

interface IBankAccount {
  id: string;
  bank: string;
  account_number: string;
  currency: string;
  amount: number;
}

export interface ITransferEntry {
  id: string;
  bank_account_id: string;
  amount: number;
  receipt?: File | null;
  notes?: string;
}

interface ITransferDistributionFormProps {
  totalAmount: number;
  currency: string;
  bankAccounts: IBankAccount[];
  onChange: (transfers: ITransferEntry[]) => void;
  initialTransfers?: ITransferEntry[];
  disabled?: boolean;
}

export const TransferDistributionForm: React.FC<ITransferDistributionFormProps> = ({
  totalAmount,
  currency,
  bankAccounts,
  onChange,
  initialTransfers = [],
  disabled = false,
}) => {
  const [transfers, setTransfers] = useState<ITransferEntry[]>(() => {
    if (initialTransfers.length > 0) {
      return initialTransfers;
    }
    return [{ id: uuidv4(), bank_account_id: "", amount: totalAmount, receipt: null }];
  });

  // Filtrar cuentas por moneda compatible
  const compatibleAccounts = bankAccounts.filter(
    (acc) => acc.currency === currency
  );

  // Calcular suma actual y diferencia
  const currentSum = transfers.reduce((acc, t) => acc + (t.amount || 0), 0);
  const difference = totalAmount - currentSum;
  const isValid = Math.abs(difference) < 0.01;

  // Notificar cambios al padre
  const notifyChange = useCallback((newTransfers: ITransferEntry[]) => {
    onChange(newTransfers);
  }, [onChange]);

  useEffect(() => {
    notifyChange(transfers);
  }, [transfers, notifyChange]);

  // Actualizar el primer transfer cuando cambia el monto total
  useEffect(() => {
    if (transfers.length === 1 && transfers[0].amount !== totalAmount) {
      setTransfers([{ ...transfers[0], amount: totalAmount }]);
    }
  }, [totalAmount]);

  const handleAddTransfer = () => {
    const newTransfer: ITransferEntry = {
      id: uuidv4(),
      bank_account_id: "",
      amount: Math.max(0, difference),
      receipt: null,
    };
    setTransfers([...transfers, newTransfer]);
  };

  const handleRemoveTransfer = (id: string) => {
    if (transfers.length <= 1) return;
    setTransfers(transfers.filter((t) => t.id !== id));
  };

  const handleTransferChange = (
    id: string,
    field: keyof ITransferEntry,
    value: string | number | File | null
  ) => {
    setTransfers(
      transfers.map((t) =>
        t.id === id
          ? { ...t, [field]: field === "amount" ? parseFloat(String(value)) || 0 : value }
          : t
      )
    );
  };

  const handleFileChange = (id: string, file: File | null) => {
    handleTransferChange(id, "receipt", file);
  };

  // Distribuir el monto restante automáticamente
  const handleAutoDistribute = () => {
    if (transfers.length === 0) return;
    const perTransfer = totalAmount / transfers.length;
    setTransfers(
      transfers.map((t) => ({ ...t, amount: Math.round(perTransfer * 100) / 100 }))
    );
  };

  // Obtener nombre de cuenta para mostrar
  const getAccountLabel = (accountId: string) => {
    const account = compatibleAccounts.find((acc) => acc.id === accountId);
    if (!account) return "Seleccionar cuenta...";
    return `${account.bank} - ${account.account_number}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">
          Distribución de Transferencias
        </Label>
        <div className="flex gap-2">
          {transfers.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleAutoDistribute}
              disabled={disabled}
              className="text-xs"
            >
              Distribuir equitativo
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddTransfer}
            disabled={disabled || compatibleAccounts.length === 0}
          >
            <Plus className="h-4 w-4 mr-1" />
            Agregar Cuenta
          </Button>
        </div>
      </div>

      {compatibleAccounts.length === 0 && (
        <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          No hay cuentas bancarias en {currency}. Crea una cuenta primero.
        </div>
      )}

      <div className="space-y-3">
        {transfers.map((transfer, index) => (
          <Card key={transfer.id} className="border-dashed">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Selector de cuenta */}
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Cuenta Destino {index + 1}
                    </Label>
                    <Select
                      value={transfer.bank_account_id}
                      onValueChange={(value) =>
                        handleTransferChange(transfer.id, "bank_account_id", value)
                      }
                      disabled={disabled}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccionar cuenta...">
                          {transfer.bank_account_id && getAccountLabel(transfer.bank_account_id)}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {compatibleAccounts.map((acc) => (
                          <SelectItem
                            key={acc.id}
                            value={acc.id}
                            disabled={transfers.some(
                              (t) => t.id !== transfer.id && t.bank_account_id === acc.id
                            )}
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">{acc.bank}</span>
                              <span className="text-xs text-muted-foreground">
                                {acc.account_number}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Monto */}
                  <div>
                    <Label className="text-xs text-muted-foreground">Monto</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        {currency}
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={transfer.amount || ""}
                        onChange={(e) =>
                          handleTransferChange(transfer.id, "amount", e.target.value)
                        }
                        className="pl-14"
                        disabled={disabled}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                {/* Comprobante */}
                <div className="w-28">
                  <Label className="text-xs text-muted-foreground">Comprobante</Label>
                  <div className="mt-1">
                    {transfer.receipt ? (
                      <div className="flex items-center gap-1 p-2 border rounded bg-green-50 dark:bg-green-900/20">
                        <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                        <span className="text-xs truncate max-w-[60px]" title={transfer.receipt.name}>
                          {transfer.receipt.name}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 flex-shrink-0"
                          onClick={() => handleFileChange(transfer.id, null)}
                          disabled={disabled}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <label className="flex items-center justify-center p-2 border rounded cursor-pointer hover:bg-muted/50 transition-colors">
                        <Upload className="h-4 w-4 text-muted-foreground" />
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) =>
                            handleFileChange(transfer.id, e.target.files?.[0] || null)
                          }
                          disabled={disabled}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Botón eliminar */}
                {transfers.length > 1 && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="mt-5 flex-shrink-0"
                    onClick={() => handleRemoveTransfer(transfer.id)}
                    disabled={disabled}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Resumen y validación */}
      <div
        className={`p-3 rounded-lg border ${
          isValid
            ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
            : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
        }`}
      >
        <div className="flex justify-between items-center text-sm">
          <span className="font-medium">Total distribuido:</span>
          <span className={isValid ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}>
            {currency} {currentSum.toFixed(2)} / {totalAmount.toFixed(2)}
          </span>
        </div>
        {!isValid && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Diferencia: {currency} {Math.abs(difference).toFixed(2)}
            {difference > 0 ? " (falta asignar)" : " (excede el total)"}
          </p>
        )}
        {isValid && transfers.length > 1 && (
          <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Distribución correcta en {transfers.length} cuentas
          </p>
        )}
      </div>
    </div>
  );
};

export default TransferDistributionForm;
