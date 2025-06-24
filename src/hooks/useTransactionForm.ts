import { useState, useEffect } from "react";
import { toast } from "@/components/ui/use-toast";
import { getBankAccounts } from "@/integrations/supabase/bankAccountService";
import { getClients } from "@/integrations/supabase/clientService";
import { useExchangeRate } from "./useExchangeRate";

interface BankAccount {
  id: string;
  bank: string;
  accountNumber: string;
  currency: string;
}

interface Client {
  id: string;
  name: string;
}

interface TransactionFormData {
  amount: string;
  currency: string;
  description: string;
  category: string;
  notes: string;
  paymentMethod: string;
  selectedClient: string;
  selectedBank: string;
  selectedAccount: string;
  date: string;
  transactionType: string;
  receipt: File | null;
}

interface UseTransactionFormProps {
  initialData?: Partial<TransactionFormData>;
  onSubmit: (
    data: TransactionFormData & { exchangeRate: number }
  ) => Promise<void>;
}

export const useTransactionForm = ({
  initialData,
  onSubmit,
}: UseTransactionFormProps) => {
  // Estados del formulario
  const [formData, setFormData] = useState<TransactionFormData>({
    amount: "",
    currency: "USD",
    description: "",
    category: "",
    notes: "",
    paymentMethod: "cash",
    selectedClient: "",
    selectedBank: "",
    selectedAccount: "",
    date: new Date().toISOString().split("T")[0],
    transactionType: "expense",
    receipt: null,
    ...initialData,
  });

  // Estados de datos externos
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Hook de tasa de cambio
  const exchangeRateHook = useExchangeRate();

  // Cargar datos iniciales
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [bankAccountsData, clientsData] = await Promise.all([
          getBankAccounts(),
          getClients(),
        ]);

        setBankAccounts(
          bankAccountsData.map((acc) => ({
            id: acc.id.toString(),
            bank: acc.bankName || "Banco",
            accountNumber: acc.accountNumber,
            currency: acc.currency,
          }))
        );

        setClients(clientsData);
      } catch (error) {
        console.error("Error loading form data:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos del formulario",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Bancos únicos para el selector
  const availableBanks = Array.from(
    new Set(bankAccounts.map((account) => account.bank))
  );

  // Actualizar campo del formulario
  const updateField = (
    field: keyof TransactionFormData,
    value: string | File | null
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Validar formulario
  const validateForm = (): boolean => {
    if (!formData.amount || !formData.description) {
      toast({
        title: "Error en el formulario",
        description: "Por favor complete todos los campos obligatorios.",
        variant: "destructive",
      });
      return false;
    }

    const parsedAmount = parseFloat(formData.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast({
        title: "Monto inválido",
        description: "Por favor ingrese un monto válido mayor que cero.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  // Manejar envío del formulario
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        ...formData,
        exchangeRate: exchangeRateHook.exchangeRate,
      });
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: "Error",
        description: "Ha ocurrido un error al guardar.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resetear formulario
  const resetForm = () => {
    setFormData({
      amount: "",
      currency: "USD",
      description: "",
      category: "",
      notes: "",
      paymentMethod: "cash",
      selectedClient: "",
      selectedBank: "",
      selectedAccount: "",
      date: new Date().toISOString().split("T")[0],
      transactionType: "expense",
      receipt: null,
    });
  };

  return {
    // Datos del formulario
    formData,
    updateField,

    // Datos externos
    bankAccounts,
    clients,
    availableBanks,

    // Estados
    isSubmitting,
    isLoading,

    // Funciones
    handleSubmit,
    resetForm,
    validateForm,

    // Hook de tasa de cambio
    exchangeRate: exchangeRateHook,
  };
};
