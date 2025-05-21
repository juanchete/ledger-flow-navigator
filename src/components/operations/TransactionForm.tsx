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
import type { Transaction } from "@/types";
import { v4 as uuidv4 } from "uuid";

const EXCHANGE_RATE = 35.75; // Mock exchange rate USD to VES

// Define interface for bank accounts to resolve the TypeScript error
interface BankAccount {
  id: string;
  bank: string;
  accountNumber: string;
  currency: string;
}

export const TransactionForm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addTransaction } = useTransactions();
  const [transactionType, setTransactionType] = useState<Transaction["type"]>("sale");
  const [isUSD, setIsUSD] = useState(true);
  const [amount, setAmount] = useState("");
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedBank, setSelectedBank] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

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
    if (!transactionType || !amount || !description) {
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
        description,
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
        // Navegar a la página de detalle de la transacción creada
        navigate(`/operations/transaction/${result.id}`);
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
        exchangeRate={EXCHANGE_RATE}
      />

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
            <label htmlFor="description" className="text-sm font-medium">
              Descripción
            </label>
            <input
              id="description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Descripción de la transacción"
              required
            />
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
              <input
                id="paymentMethod"
                type="text"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Método de pago"
              />
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
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => navigate("/operations")}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
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
