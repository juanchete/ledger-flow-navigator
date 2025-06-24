import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Receipt } from "lucide-react";
import { Icons } from '@/components/Icons';
import { toast } from "sonner";
import { v4 as uuidv4 } from 'uuid';

// Importar componentes optimizados
import { useTransactionForm } from '@/hooks/useTransactionForm';
import { ExchangeRateSection } from './ExchangeRateSection';
import { AmountCurrencySection } from './AmountCurrencySection';
import { createTransaction } from '@/integrations/supabase/transactionService';

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExpenseCreated?: () => void;
}

export const ExpenseFormModal: React.FC<ExpenseFormModalProps> = ({
  isOpen,
  onClose,
  onExpenseCreated
}) => {
  // Usar hook optimizado para el formulario
  const form = useTransactionForm({
    initialData: {
      transactionType: 'expense',
      currency: 'USD',
      paymentMethod: 'cash',
    },
    onSubmit: async (data) => {
      const now = new Date().toISOString();
      
      await createTransaction({
        id: uuidv4(),
        type: "expense",
        amount: parseFloat(data.amount),
        description: data.description,
        date: new Date(now),
        status: "completed",
        category: data.category || undefined,
        notes: data.notes || undefined,
        paymentMethod: data.paymentMethod,
        bankAccountId: data.selectedAccount || undefined,
        createdAt: new Date(now)
      });
      
      toast.success("Gasto registrado exitosamente");
      
      if (onExpenseCreated) {
        await onExpenseCreated();
      }
      
      form.resetForm();
      onClose();
    },
  });

  // Agregar estados para referencia y comprobante
  const [reference, setReference] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);

  if (form.isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px]">
          <div className="flex items-center justify-center p-8">
            <div className="text-muted-foreground">Cargando formulario...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Registrar Nuevo Gasto
          </DialogTitle>
          <DialogDescription>
            Registra un gasto que se descontará directamente de tu cuenta seleccionada.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit} className="space-y-6">
          <div className="grid gap-4 py-4">
            
            {/* Componente optimizado para monto y moneda */}
            <AmountCurrencySection
              amount={form.formData.amount}
              currency={form.formData.currency}
              exchangeRate={form.exchangeRate.exchangeRate}
              onAmountChange={(amount) => form.updateField('amount', amount)}
              onCurrencyChange={(currency) => form.updateField('currency', currency)}
              currencies={[
                { value: 'USD', label: 'USD (Dólares)' },
                { value: 'VES', label: 'VES (Bolívares)' },
              ]}
            />

            {/* Componente optimizado para tasa de cambio */}
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

            {/* Sección de Cuenta Bancaria */}
            <div className="grid gap-4 p-4 border rounded-lg bg-muted/10">
              <Label className="text-sm font-medium">Cuenta Bancaria (Opcional)</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Banco</Label>
                  <Select 
                    value={form.formData.selectedBank} 
                    onValueChange={(bank) => form.updateField('selectedBank', bank)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar banco" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin banco específico</SelectItem>
                      {form.availableBanks.map(bank => (
                        <SelectItem key={bank} value={bank}>
                          {bank}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm">Cuenta</Label>
                  <Select 
                    value={form.formData.selectedAccount} 
                    onValueChange={(account) => form.updateField('selectedAccount', account)}
                    disabled={!form.formData.selectedBank || form.formData.selectedBank === "none"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cuenta" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin cuenta específica</SelectItem>
                      {form.bankAccounts
                        .filter(account => 
                          form.formData.selectedBank === "none" || 
                          account.bank === form.formData.selectedBank
                        )
                        .map(account => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.accountNumber} ({account.currency})
                          </SelectItem>
                        ))
                      }
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Referencia */}
            <div className="grid gap-2">
              <Label htmlFor="reference">Referencia *</Label>
              <Input
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Referencia del gasto"
                required
              />
            </div>

            {/* Comprobante */}
            <div className="grid gap-2">
              <Label htmlFor="receipt">Comprobante</Label>
              <Input
                id="receipt"
                type="file"
                accept="image/*,.pdf,.doc,.docx"
                onChange={(e) => setReceipt(e.target.files?.[0] || null)}
                className="cursor-pointer"
              />
              {receipt && (
                <p className="text-xs text-muted-foreground">
                  Archivo seleccionado: {receipt.name}
                </p>
              )}
            </div>

            {/* Campos adicionales */}
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
                  placeholder="Descripción del gasto" 
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
                  <Select 
                    value={form.formData.paymentMethod} 
                    onValueChange={(method) => form.updateField('paymentMethod', method)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar método" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Efectivo</SelectItem>
                      <SelectItem value="card">Tarjeta</SelectItem>
                      <SelectItem value="transfer">Transferencia</SelectItem>
                      <SelectItem value="check">Cheque</SelectItem>
                      <SelectItem value="other">Otro</SelectItem>
                    </SelectContent>
                  </Select>
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
                  placeholder="Notas adicionales sobre el gasto" 
                  rows={3} 
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              disabled={form.isSubmitting}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={form.isSubmitting}
            >
              {form.isSubmitting && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
              {form.isSubmitting ? "Registrando..." : "Registrar Gasto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}; 