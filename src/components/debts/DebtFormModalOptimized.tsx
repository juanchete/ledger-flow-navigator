import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon, Loader2 } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button as PopoverButton } from "@/components/ui/button";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createDebt, updateDebt, type Debt } from "@/integrations/supabase/debtService";

// Componentes optimizados
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { ExchangeRateSection } from '@/components/forms/ExchangeRateSection';
import { AmountCurrencySection } from '@/components/forms/AmountCurrencySection';
import { ClientSelectionSection } from '../operations/transaction/ClientSelectionSection';

interface DebtFormModalOptimizedProps {
  isOpen: boolean;
  onClose: () => void;
  debt?: Debt;
  clients: { id: string; name: string }[];
  onSuccess?: () => void;
}

export const DebtFormModalOptimized: React.FC<DebtFormModalOptimizedProps> = ({ 
  isOpen, 
  onClose, 
  debt,
  clients,
  onSuccess
}) => {
  // Estados del formulario
  const [clientId, setClientId] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [reference, setReference] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [dueDate, setDueDate] = useState<Date>(new Date());
  const [status, setStatus] = useState<'pending' | 'overdue' | 'paid'>('pending');
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [installments, setInstallments] = useState('1');
  const [loading, setLoading] = useState(false);

  const isEditing = !!debt;

  // Hook para manejo de tasa de cambio
  const exchangeRateHook = useExchangeRate();

  // Resetear formulario cuando cambia el debt o se abre el modal
  useEffect(() => {
    if (isOpen) {
      if (debt) {
        setClientId(debt.client_id || '');
        setAmount(debt.amount?.toString() || '');
        setCurrency(debt.currency || 'USD');
        setReference(debt.creditor || '');
        setDueDate(debt.due_date ? new Date(debt.due_date) : new Date());
        setStatus((debt.status as 'pending' | 'overdue' | 'paid') || 'pending');
        setCategory(debt.category || '');
        setNotes(debt.notes || '');
        setInterestRate(debt.interest_rate?.toString() || '');
        setInstallments(debt.installments?.toString() || '1');
      } else {
        resetForm();
      }
    }
  }, [isOpen, debt]);

  const resetForm = () => {
    setClientId('');
    setAmount('');
    setCurrency('USD');
    setReference('');
    setReceipt(null);
    setDueDate(new Date());
    setStatus('pending');
    setCategory('');
    setNotes('');
    setInterestRate('');
    setInstallments('1');
  };

  const handleSubmit = async () => {
    // Validaciones básicas
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Por favor ingresa un monto válido");
      return;
    }
    if (!reference) {
      toast.error("Por favor ingresa una referencia");
      return;
    }

    setLoading(true);
    
    try {
      // Calcular el monto final según la moneda
      let finalAmount = parseFloat(amount);
      if (currency === 'VES') {
        // Si es VES, convertir a USD dividiendo por la tasa de cambio
        const rate = exchangeRateHook.useCustomRate 
          ? parseFloat(exchangeRateHook.customRate) 
          : exchangeRateHook.exchangeRate;
        finalAmount = finalAmount / rate;
      }

      const debtData = {
        creditor: reference,
        client_id: clientId === "" || clientId === "none" ? null : clientId,
        amount: finalAmount,
        due_date: dueDate.toISOString(),
        status: status,
        category: category || null,
        notes: notes || null,
        currency: currency || null,
        interest_rate: interestRate ? parseFloat(interestRate) : null,
        installments: installments ? parseInt(installments) : 1
      };

      if (isEditing && debt) {
        await updateDebt(debt.id, debtData);
        toast.success("Deuda actualizada correctamente");
      } else {
        await createDebt({
          ...debtData,
          id: crypto.randomUUID()
        });
        toast.success("Deuda creada correctamente");
      }
      
      if (onSuccess) {
        onSuccess();
      }
      onClose();
      resetForm();
    } catch (error) {
      console.error("Error al guardar la deuda:", error);
      toast.error(`Error: ${isEditing ? 'No se pudo actualizar' : 'No se pudo crear'} la deuda`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">
            {isEditing ? "Editar deuda" : "Agregar deuda"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 sm:space-y-6">
          
          {/* Selección de Cliente (Opcional) */}
          <div className="grid gap-2">
            <Label className="text-sm font-medium">Cliente (Opcional)</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger className="h-10 sm:h-11">
                <SelectValue placeholder="Seleccionar cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Sin cliente</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Monto y Moneda */}
          <AmountCurrencySection
            amount={amount}
            currency={currency}
            exchangeRate={exchangeRateHook.exchangeRate}
            onAmountChange={setAmount}
            onCurrencyChange={setCurrency}
            currencies={[
              { value: 'USD', label: 'USD' },
              { value: 'VES', label: 'VES' },
            ]}
          />

          {/* Tasa de Cambio (solo si es VES) */}
          {currency === 'VES' && (
            <ExchangeRateSection
              exchangeRate={exchangeRateHook.exchangeRate}
              customRate={exchangeRateHook.customRate}
              useCustomRate={exchangeRateHook.useCustomRate}
              isLoadingRate={exchangeRateHook.isLoadingRate}
              isRefreshing={exchangeRateHook.isRefreshing}
              lastUpdated={exchangeRateHook.lastUpdated}
              onCustomRateChange={exchangeRateHook.handleCustomRateChange}
              onUseCustomRateChange={exchangeRateHook.handleUseCustomRateChange}
              onRefreshRate={exchangeRateHook.refreshExchangeRate}
            />
          )}

          {/* Referencia */}
          <div className="grid gap-2">
            <Label htmlFor="reference" className="text-sm font-medium">
              Referencia *
            </Label>
            <Input
              id="reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Referencia de la deuda"
              className="h-10 sm:h-11 text-base"
              required
            />
          </div>

          {/* Comprobante */}
          <div className="grid gap-2">
            <Label htmlFor="receipt" className="text-sm font-medium">
              Comprobante
            </Label>
            <Input
              id="receipt"
              type="file"
              accept="image/*,.pdf,.doc,.docx"
              onChange={(e) => setReceipt(e.target.files?.[0] || null)}
              className="h-10 sm:h-11 text-base cursor-pointer"
            />
            {receipt && (
              <p className="text-xs text-muted-foreground">
                Archivo seleccionado: {receipt.name}
              </p>
            )}
          </div>

          {/* Fecha de Vencimiento */}
          <div className="grid gap-2">
            <Label className="text-sm font-medium">Fecha de vencimiento *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <PopoverButton
                  variant="outline"
                  className={cn(
                    "w-full pl-3 text-left font-normal h-10 sm:h-11 text-base",
                    !dueDate && "text-muted-foreground"
                  )}
                >
                  {dueDate ? (
                    format(dueDate, "dd/MM/yyyy")
                  ) : (
                    <span>Seleccionar fecha</span>
                  )}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </PopoverButton>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={(date) => date && setDueDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Estado */}
          <div className="grid gap-2">
            <Label className="text-sm font-medium">Estado *</Label>
            <Select value={status} onValueChange={(value: 'pending' | 'overdue' | 'paid') => setStatus(value)}>
              <SelectTrigger className="h-10 sm:h-11">
                <SelectValue placeholder="Seleccionar estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="overdue">Vencido</SelectItem>
                <SelectItem value="paid">Pagado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Categoría */}
          <div className="grid gap-2">
            <Label htmlFor="category" className="text-sm font-medium">
              Categoría
            </Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Ej: Préstamo, Compra, etc."
              className="h-10 sm:h-11 text-base"
            />
          </div>

          {/* Campos opcionales en dos columnas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="interestRate" className="text-sm font-medium">
                Tasa de Interés Anual (%)
              </Label>
              <Input
                id="interestRate"
                type="number"
                step="0.01"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                placeholder="Ej: 12.5"
                className="h-10 sm:h-11 text-base"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="installments" className="text-sm font-medium">
                Número de Cuotas
              </Label>
              <Input
                id="installments"
                type="number"
                min="1"
                max="360"
                value={installments}
                onChange={(e) => setInstallments(e.target.value)}
                placeholder="1"
                className="h-10 sm:h-11 text-base"
              />
            </div>
          </div>

          {/* Notas */}
          <div className="grid gap-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Notas
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Información adicional..."
              className="min-h-[80px] sm:min-h-[100px] text-base resize-none"
            />
          </div>

        </div>

        <DialogFooter className="pt-4 sm:pt-6">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose}
            className="h-10 sm:h-11 text-sm sm:text-base"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={loading}
            className="h-10 sm:h-11 text-sm sm:text-base"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              isEditing ? "Actualizar" : "Crear"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 