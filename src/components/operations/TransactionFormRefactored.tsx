import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";

import { useTransactionForm } from "@/hooks/useTransactionForm";
import { ExchangeRateSection } from "@/components/forms/ExchangeRateSection";
import { AmountCurrencySection } from "@/components/forms/AmountCurrencySection";
import { TransactionTypeSection } from "./transaction/TransactionTypeSection";
import { ClientSelectionSection } from "./transaction/ClientSelectionSection";
import { BankAccountSection } from "./transaction/BankAccountSection";
import { addTransaction } from "@/integrations/supabase/transactionService";
import { toast } from "@/components/ui/use-toast";

interface TransactionFormProps {
  onSuccess?: () => void;
  showCancelButton?: boolean;
}

export const TransactionFormRefactored: React.FC<TransactionFormProps> = ({
  onSuccess,
  showCancelButton = false,
}) => {
  const navigate = useNavigate();

  // Hook personalizado que maneja toda la lógica del formulario
  const form = useTransactionForm({
    onSubmit: async (data) => {
      const now = new Date().toISOString();
      const newTransaction = {
        id: uuidv4(),
        type: data.transactionType || 'expense',
        amount: parseFloat(data.amount),
        description: data.description,
        date: now,
        status: "completed" as const,
        category: data.category || undefined,
        notes: data.notes || undefined,
        payment_method: data.paymentMethod || undefined,
        client_id: data.selectedClient || undefined,
        created_at: now,
        updated_at: now,
        bank_account_id: data.selectedAccount || undefined,
      };

      const result = await addTransaction(newTransaction);
      
      if (result) {
        toast({
          title: "¡Éxito!",
          description: "La transacción se ha creado correctamente.",
        });
        
        if (onSuccess) {
          onSuccess();
        } else {
          navigate(`/operations/transaction/${result.id}`);
        }
      } else {
        throw new Error("No se pudo crear la transacción");
      }
    },
  });

  if (form.isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Cargando formulario...</div>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit} className="space-y-6">
      <div className="grid gap-4 py-4">
        
        <TransactionTypeSection 
          selectedType={form.formData.transactionType || ''}
          onTypeChange={(type) => form.updateField('transactionType' as any, type)}
        />

        <AmountCurrencySection
          amount={form.formData.amount}
          currency={form.formData.currency}
          exchangeRate={form.exchangeRate.exchangeRate}
          onAmountChange={(amount) => form.updateField('amount', amount)}
          onCurrencyChange={(currency) => form.updateField('currency', currency)}
        />

        <ExchangeRateSection
          exchangeRate={form.exchangeRate.exchangeRate}
          customRate={form.exchangeRate.customRate}
          useCustomRate={form.exchangeRate.useCustomRate}
          isLoadingRate={form.exchangeRate.isLoadingRate}
          isRefreshing={form.exchangeRate.isRefreshing}
          lastUpdated={form.exchangeRate.lastUpdated}
          onCustomRateChange={form.exchangeRate.handleCustomRateChange}
          onUseCustomRateChange={form.exchangeRate.handleUseCustomRateChange}
          onRefreshRate={form.exchangeRate.refreshExchangeRate}
        />

        <ClientSelectionSection 
          selectedClient={form.formData.selectedClient}
          onClientChange={(client) => form.updateField('selectedClient', client)}
        />

        <BankAccountSection 
          selectedBank={form.formData.selectedBank}
          selectedAccount={form.formData.selectedAccount}
          onBankChange={(bank) => form.updateField('selectedBank', bank)}
          onAccountChange={(account) => form.updateField('selectedAccount', account)}
          availableBanks={form.availableBanks}
          bankAccounts={form.bankAccounts}
        />

        {/* Campos adicionales del formulario */}
        <div className="grid gap-4">
          <div className="grid grid-cols-1 gap-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Descripción *
            </Label>
            <Input
              id="description"
              type="text"
              value={form.formData.description}
              onChange={(e) => form.updateField('description', e.target.value)}
              placeholder="Descripción de la transacción"
              required
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="category" className="text-sm font-medium">
                Categoría
              </Label>
              <Input
                id="category"
                type="text"
                value={form.formData.category}
                onChange={(e) => form.updateField('category', e.target.value)}
                placeholder="Categoría"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="paymentMethod" className="text-sm font-medium">
                Método de Pago
              </Label>
              <Input
                id="paymentMethod"
                type="text"
                value={form.formData.paymentMethod}
                onChange={(e) => form.updateField('paymentMethod', e.target.value)}
                placeholder="Método de pago"
              />
            </div>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Notas
            </Label>
            <Textarea
              id="notes"
              value={form.formData.notes}
              onChange={(e) => form.updateField('notes', e.target.value)}
              placeholder="Notas adicionales sobre la transacción"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        {showCancelButton && (
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onSuccess ? onSuccess() : navigate("/operations")}
            disabled={form.isSubmitting}
          >
            Cancelar
          </Button>
        )}
        <Button 
          type="submit" 
          disabled={form.isSubmitting}
        >
          {form.isSubmitting ? "Guardando..." : "Guardar Transacción"}
        </Button>
      </div>
    </form>
  );
}; 