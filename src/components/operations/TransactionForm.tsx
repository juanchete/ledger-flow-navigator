import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getBankAccounts } from "@/integrations/supabase/bankAccountService";
import { TransactionTypeSection } from "./transaction/TransactionTypeSection";
import { AmountInputSection } from "./transaction/AmountInputSection";
import { ClientSelectionSection } from "./transaction/ClientSelectionSection";
import { BankAccountSection } from "./transaction/BankAccountSection";
import { useTransactions } from "@/context/TransactionContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw } from "lucide-react";
import type { Transaction } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { exchangeRateService } from "@/services/exchangeRateService";

// Define interface for bank accounts to resolve the TypeScript error
interface BankAccount {
  id: string;
  bank: string;
  accountNumber: string;
  currency: string;
}

interface TransactionFormProps {
  onSuccess?: () => void;
  showCancelButton?: boolean;
}

export const TransactionForm = ({ onSuccess, showCancelButton = true }: TransactionFormProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addTransaction } = useTransactions();
  const [transactionType, setTransactionType] = useState<Transaction["type"]>("sale");
  const [isUSD, setIsUSD] = useState(true);
  const [amount, setAmount] = useState("");
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedBank, setSelectedBank] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [reference, setReference] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [exchangeRate, setExchangeRate] = useState<number>(0);
  const [isLoadingRate, setIsLoadingRate] = useState(true);
  const [customRate, setCustomRate] = useState<string>("");
  const [useCustomRate, setUseCustomRate] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Cargar tasa de cambio al inicializar el componente
  useEffect(() => {
    const loadExchangeRate = async () => {
      setIsLoadingRate(true);
      try {
        const response = await exchangeRateService.getExchangeRates();
        if (response.success && response.data) {
          // Usar tasa paralelo por defecto
          const parallelRate = response.data.usd_to_ves_parallel;
          setExchangeRate(parallelRate);
          setCustomRate(parallelRate.toString());
          setLastUpdated(response.data.last_updated);
        } else {
          // Fallback a una tasa más actualizada que la anterior
          setExchangeRate(36.5);
          setCustomRate("36.5");
          setLastUpdated("Sin datos recientes");
        }
      } catch (error) {
        console.error("Error al cargar tasa de cambio:", error);
        setExchangeRate(36.5);
        setCustomRate("36.5");
        setLastUpdated("Error al cargar");
      } finally {
        setIsLoadingRate(false);
      }
    };

    loadExchangeRate();
  }, []);

  // Función para refrescar la tasa de cambio
  const refreshExchangeRate = async () => {
    setIsRefreshing(true);
    try {
      const response = await exchangeRateService.forceRefresh();
      if (response.success && response.data) {
        const parallelRate = response.data.usd_to_ves_parallel;
        if (!useCustomRate) {
          setExchangeRate(parallelRate);
        }
        setCustomRate(parallelRate.toString());
        setLastUpdated(response.data.last_updated);
        toast({
          title: "Tasa actualizada",
          description: `Nueva tasa paralelo: Bs. ${parallelRate.toFixed(2)}`,
        });
      } else {
        throw new Error("No se pudo actualizar la tasa");
      }
    } catch (error) {
      console.error("Error al refrescar tasa:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la tasa de cambio",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Actualizar tasa cuando el usuario cambia el valor personalizado
  const handleCustomRateChange = (value: string) => {
    setCustomRate(value);
    if (useCustomRate) {
      const numericValue = parseFloat(value);
      if (!isNaN(numericValue) && numericValue > 0) {
        setExchangeRate(numericValue);
      }
    }
  };

  // Manejar el cambio del checkbox de tasa personalizada
  const handleUseCustomRateChange = (checked: boolean) => {
    setUseCustomRate(checked);
    if (checked) {
      // Si activa la tasa personalizada, usar el valor del input
      const numericValue = parseFloat(customRate);
      if (!isNaN(numericValue) && numericValue > 0) {
        setExchangeRate(numericValue);
      }
    } else {
      // Si desactiva la tasa personalizada, recargar la tasa automática
      const reloadAutomaticRate = async () => {
        try {
          const response = await exchangeRateService.getExchangeRates();
          if (response.success && response.data) {
            const parallelRate = response.data.usd_to_ves_parallel;
            setExchangeRate(parallelRate);
            setCustomRate(parallelRate.toString());
            setLastUpdated(response.data.last_updated);
          }
        } catch (error) {
          console.error("Error al recargar tasa automática:", error);
        }
      };
      reloadAutomaticRate();
    }
  };

  useEffect(() => {
    const fetchBankAccounts = async () => {
      const data = await getBankAccounts();
      setBankAccounts(
        data.map(acc => ({
          id: acc.id,
          bank: acc.bank,
          accountNumber: acc.account_number,
          currency: acc.currency,
        }))
      );
    };
    fetchBankAccounts();
  }, []);

  // Get unique banks for the bank selection dropdown
  const availableBanks = Array.from(
    new Set(bankAccounts.map(account => account.bank))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionType || !amount || !reference) {
      toast({
        title: "Error en el formulario",
        description: "Por favor complete todos los campos obligatorios.",
        variant: "destructive",
      });
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast({
        title: "Monto inválido",
        description: "Por favor ingrese un monto válido mayor que cero.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const now = new Date().toISOString();
      const newTransaction: import("@/integrations/supabase/transactionService").NewTransaction = {
        id: uuidv4(),
        type: transactionType,
        amount: parsedAmount,
        description: reference,
        date: now,
        status: "completed",
        category: category || undefined,
        notes: notes || undefined,
        payment_method: paymentMethod || undefined,
        client_id: selectedClient || undefined,
        created_at: now,
        updated_at: now,
        bank_account_id: selectedAccount || undefined,
      };

      // Enviar la transacción a la API
      const result = await addTransaction(newTransaction);
      
      if (result) {
        toast({
          title: "¡Éxito!",
          description: "La transacción se ha creado correctamente.",
        });
        
        // Si hay un callback onSuccess, ejecutarlo (para modales)
        if (onSuccess) {
          onSuccess();
        } else {
          // Si no hay callback, navegar a la página de detalle (comportamiento por defecto)
          navigate(`/operations/transaction/${result.id}`);
        }
      } else {
        throw new Error("No se pudo crear la transacción");
      }
    } catch (error) {
      console.error("Error al crear la transacción:", error);
      toast({
        title: "Error",
        description: "Ha ocurrido un error al guardar la transacción.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
    <div className="grid gap-4 py-4">
      <TransactionTypeSection 
        selectedType={transactionType}
        onTypeChange={setTransactionType}
      />

      <AmountInputSection 
        amount={amount}
        isUSD={isUSD}
        onAmountChange={setAmount}
        onCurrencyChange={setIsUSD}
        exchangeRate={exchangeRate}
      />

      {/* Sección de Tasa de Cambio */}
      <div className="grid gap-4 p-4 border rounded-lg bg-muted/10">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Tasa de Cambio (USD/VES)</Label>
          <div className="flex items-center gap-2">
            {isLoadingRate && (
              <span className="text-xs text-muted-foreground">Cargando...</span>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={refreshExchangeRate}
              disabled={isLoadingRate || isRefreshing}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="useCustomRate"
                checked={useCustomRate}
                onChange={(e) => handleUseCustomRateChange(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="useCustomRate" className="text-sm">
                Usar tasa personalizada
              </Label>
            </div>
            
            <Input
              type="number"
              step="0.01"
              min="0"
              value={customRate}
              onChange={(e) => handleCustomRateChange(e.target.value)}
              disabled={!useCustomRate}
              placeholder="Ingresa tasa personalizada"
              className={!useCustomRate ? "bg-muted" : ""}
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">
              {useCustomRate ? "Tasa actual:" : "Tasa paralelo actual:"}
            </Label>
            <div className="text-lg font-medium">
              {isLoadingRate ? "..." : `Bs. ${exchangeRate.toFixed(2)}`}
            </div>
            <div className="text-xs text-muted-foreground">
              {useCustomRate ? "Personalizada" : "Obtenida automáticamente"}
            </div>
            {lastUpdated && !useCustomRate && (
              <div className="text-xs text-muted-foreground">
                Actualizada: {new Date(lastUpdated).toLocaleString('es-VE', {
                  dateStyle: 'short',
                  timeStyle: 'short'
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <ClientSelectionSection 
        selectedClient={selectedClient}
        onClientChange={setSelectedClient}
      />

      <BankAccountSection 
        selectedBank={selectedBank}
        selectedAccount={selectedAccount}
        onBankChange={setSelectedBank}
        onAccountChange={setSelectedAccount}
        availableBanks={availableBanks}
        bankAccounts={bankAccounts}
      />

        {/* Nuevos campos para la transacción */}
        <div className="grid gap-4">
          <div className="grid grid-cols-1 gap-2">
            <label htmlFor="reference" className="text-sm font-medium">
              Referencia *
            </label>
            <input
              id="reference"
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Referencia de la transacción"
              required
            />
          </div>

          {/* Comprobante */}
          <div className="grid grid-cols-1 gap-2">
            <label htmlFor="receipt" className="text-sm font-medium">
              Comprobante
            </label>
            <input
              id="receipt"
              type="file"
              accept="image/*,.pdf,.doc,.docx"
              onChange={(e) => setReceipt(e.target.files?.[0] || null)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            />
            {receipt && (
              <p className="text-xs text-muted-foreground">
                Archivo seleccionado: {receipt.name}
              </p>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label htmlFor="category" className="text-sm font-medium">
                Categoría
              </label>
              <input
                id="category"
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Categoría"
              />
            </div>
            
            <div className="grid gap-2">
              <label htmlFor="paymentMethod" className="text-sm font-medium">
                Método de Pago
              </label>
              <select
                id="paymentMethod"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Seleccionar método</option>
                <option value="cash">Efectivo</option>
                <option value="transfer">Transferencia</option>
                <option value="credit_card">Tarjeta de Crédito</option>
                <option value="other">Otro</option>
              </select>
            </div>
          </div>
          
          <div className="grid gap-2">
            <label htmlFor="notes" className="text-sm font-medium">
              Notas
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
        )}
        <Button 
          type="submit" 
          disabled={isSubmitting}
        >
          {isSubmitting ? "Guardando..." : "Guardar Transacción"}
        </Button>
    </div>
    </form>
  );
};
