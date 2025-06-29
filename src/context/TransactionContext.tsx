import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
// import { transactionService } from "@/integrations/supabase/transactionService"; // Old import
import {
  getTransactions as apiGetTransactions,
  createTransaction as apiCreateTransaction,
  updateTransaction as apiUpdateTransaction,
  deleteTransaction as apiDeleteTransaction,
  getTransactionById as apiGetTransactionById,
  searchTransactions as apiSearchTransactions,
  filterTransactions as apiFilterTransactions,
  type Transaction, // Supabase based type
  type NewTransaction, // Supabase based type
  type UpdatedTransaction, // Supabase based type
  type TransactionFilter // Filter interface
} from "../integrations/supabase/transactionService"; // Correct path
import { useToast } from "@/components/ui/use-toast";

// Evento personalizado para notificar cambios en transacciones
const TRANSACTION_UPDATED_EVENT = 'transactionUpdated';
const BANK_BALANCE_UPDATED_EVENT = 'bankBalanceUpdated';

interface TransactionContextType {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  refetchTransactions: () => Promise<void>; // Renamed for clarity
  addTransaction: (transactionData: NewTransaction) => Promise<Transaction | undefined>; // Use NewTransaction
  modifyTransaction: (id: string, updates: UpdatedTransaction) => Promise<Transaction | undefined>; // Use UpdatedTransaction
  removeTransaction: (id: string) => Promise<boolean>;
  fetchTransactionById: (id: string) => Promise<Transaction | null>;
  searchTransactions: (searchTerm: string) => Promise<Transaction[]>;
  filterTransactions: (filters: TransactionFilter) => Promise<Transaction[]>;
  // Nuevas funciones para eventos
  onTransactionChange: (callback: (transaction: Transaction, action: 'created' | 'updated' | 'deleted') => void) => () => void;
  onBankBalanceChange: (callback: (bankAccountId: string) => void) => () => void;
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

export const useTransactions = () => {
  const context = useContext(TransactionContext);
  if (!context) {
    throw new Error("useTransactions must be used within a TransactionProvider");
  }
  return context;
};

interface TransactionProviderProps {
  children: ReactNode;
}

export const TransactionProvider: React.FC<TransactionProviderProps> = ({ children }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Función para disparar eventos personalizados
  const dispatchTransactionEvent = useCallback((transaction: Transaction, action: 'created' | 'updated' | 'deleted') => {
    const event = new CustomEvent(TRANSACTION_UPDATED_EVENT, { 
      detail: { transaction, action } 
    });
    window.dispatchEvent(event);
    
    // También disparar evento de actualización de balance bancario si la transacción afecta una cuenta
    if (transaction.bank_account_id) {
      const balanceEvent = new CustomEvent(BANK_BALANCE_UPDATED_EVENT, { 
        detail: { bankAccountId: transaction.bank_account_id } 
      });
      window.dispatchEvent(balanceEvent);
    }
  }, []);

  const fetchTransactionsCallback = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiGetTransactions(); // Use direct function call
      setTransactions(data || []);
    } catch (err) {
      console.error("Error fetching transactions:", err);
      setError(err instanceof Error ? err.message : "Error desconocido al obtener transacciones");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactionsCallback();
  }, [fetchTransactionsCallback]);

  const addTransaction = async (transactionData: NewTransaction) => {
    setIsLoading(true);
    try {
      const newTransaction = await apiCreateTransaction(transactionData); // Use direct function call
      setTransactions((prev) => [newTransaction, ...prev]); // Agregar al inicio para orden cronológico
      
      // Disparar eventos para notificar el cambio
      dispatchTransactionEvent(newTransaction, 'created');
      
      toast({
        title: "Transacción creada",
        description: `Se ha registrado la transacción por ${newTransaction.currency || 'USD'} ${newTransaction.amount}`,
      });
      
      setIsLoading(false);
      return newTransaction;
    } catch (err) {
      console.error("Error creating transaction:", err);
      setError(err instanceof Error ? err.message : "Error desconocido al crear transacción");
      
      toast({
        title: "Error",
        description: "No se pudo crear la transacción",
        variant: "destructive",
      });
      
      setIsLoading(false);
      return undefined;
    }
  };

  const modifyTransaction = async (
    id: string,
    updates: UpdatedTransaction
  ) => {
    setIsLoading(true);
    try {
      const updatedTransaction = await apiUpdateTransaction(id, updates); // Use direct function call
      setTransactions((prev) =>
        prev.map((t) => (t.id === id ? updatedTransaction : t))
      );
      
      // Disparar eventos para notificar el cambio
      dispatchTransactionEvent(updatedTransaction, 'updated');
      
      toast({
        title: "Transacción actualizada",
        description: "Los cambios se han guardado correctamente",
      });
      
      setIsLoading(false);
      return updatedTransaction;
    } catch (err) {
      console.error("Error updating transaction:", err);
      setError(err instanceof Error ? err.message : "Error desconocido al actualizar transacción");
      
      toast({
        title: "Error",
        description: "No se pudo actualizar la transacción",
        variant: "destructive",
      });
      
      setIsLoading(false);
      return undefined;
    }
  };

  const removeTransaction = async (id: string) => {
    // Obtener la transacción antes de eliminarla para los eventos
    const transactionToDelete = transactions.find(t => t.id === id);
    
    setIsLoading(true);
    try {
      await apiDeleteTransaction(id); // Use direct function call
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      
      // Disparar eventos para notificar el cambio
      if (transactionToDelete) {
        dispatchTransactionEvent(transactionToDelete, 'deleted');
      }
      
      toast({
        title: "Transacción eliminada",
        description: "La transacción se ha eliminado correctamente",
      });
      
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error("Error deleting transaction:", err);
      setError(err instanceof Error ? err.message : "Error desconocido al eliminar transacción");
      
      toast({
        title: "Error",
        description: "No se pudo eliminar la transacción",
        variant: "destructive",
      });
      
      setIsLoading(false);
      return false;
    }
  };

  const fetchTransactionById = async (id: string) => {
    setIsLoading(true);
    try {
      const transaction = await apiGetTransactionById(id); // Use direct function call
      setIsLoading(false);
      return transaction;
    } catch (err) {
      console.error("Error getting transaction by ID:", err);
      setError(err instanceof Error ? err.message : "Error desconocido al obtener transacción por ID");
      setIsLoading(false);
      return null;
    }
  };

  const searchTransactions = async (searchTerm: string) => {
    setIsLoading(true);
    try {
      const results = await apiSearchTransactions(searchTerm);
      setIsLoading(false);
      return results;
    } catch (err) {
      console.error("Error searching transactions:", err);
      setError(err instanceof Error ? err.message : "Error desconocido al buscar transacciones");
      setIsLoading(false);
      return [];
    }
  };

  const filterTransactions = async (filters: TransactionFilter) => {
    setIsLoading(true);
    try {
      const results = await apiFilterTransactions(filters);
      setIsLoading(false);
      return results;
    } catch (err) {
      console.error("Error filtering transactions:", err);
      setError(err instanceof Error ? err.message : "Error desconocido al filtrar transacciones");
      setIsLoading(false);
      return [];
    }
  };

  // Funciones para suscribirse a eventos
  const onTransactionChange = useCallback((callback: (transaction: Transaction, action: 'created' | 'updated' | 'deleted') => void) => {
    const handleEvent = (event: CustomEvent) => {
      const { transaction, action } = event.detail;
      callback(transaction, action);
    };

    window.addEventListener(TRANSACTION_UPDATED_EVENT, handleEvent as EventListener);
    
    // Retornar función de limpieza
    return () => {
      window.removeEventListener(TRANSACTION_UPDATED_EVENT, handleEvent as EventListener);
    };
  }, []);

  const onBankBalanceChange = useCallback((callback: (bankAccountId: string) => void) => {
    const handleEvent = (event: CustomEvent) => {
      const { bankAccountId } = event.detail;
      callback(bankAccountId);
    };

    window.addEventListener(BANK_BALANCE_UPDATED_EVENT, handleEvent as EventListener);
    
    // Retornar función de limpieza
    return () => {
      window.removeEventListener(BANK_BALANCE_UPDATED_EVENT, handleEvent as EventListener);
    };
  }, []);

  const value = {
    transactions,
    isLoading,
    error,
    refetchTransactions: fetchTransactionsCallback,
    addTransaction,
    modifyTransaction,
    removeTransaction,
    fetchTransactionById,
    searchTransactions,
    filterTransactions,
    onTransactionChange,
    onBankBalanceChange,
  };

  return (
    <TransactionContext.Provider value={value}>
      {children}
    </TransactionContext.Provider>
  );
}; 