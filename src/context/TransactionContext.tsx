import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
// import { transactionService } from "@/integrations/supabase/transactionService"; // Old import
import {
  getTransactions as apiGetTransactions,
  createTransaction as apiCreateTransaction,
  updateTransaction as apiUpdateTransaction,
  deleteTransaction as apiDeleteTransaction,
  getTransactionById as apiGetTransactionById,
  // searchTransactions, // TODO: Refactor in service and add here if needed
  // filterTransactions, // TODO: Refactor in service and add here if needed
  type Transaction, // Supabase based type
  type NewTransaction, // Supabase based type
  type UpdatedTransaction // Supabase based type
} from "../integrations/supabase/transactionService"; // Correct path
// import type { Transaction } from "@/types"; // Old import

interface TransactionContextType {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  refetchTransactions: () => Promise<void>; // Renamed for clarity
  addTransaction: (transactionData: NewTransaction) => Promise<Transaction | undefined>; // Use NewTransaction
  modifyTransaction: (id: string, updates: UpdatedTransaction) => Promise<Transaction | undefined>; // Use UpdatedTransaction
  removeTransaction: (id: string) => Promise<boolean>;
  fetchTransactionById: (id: string) => Promise<Transaction | null>;
  // searchTransactions: (searchTerm: string) => Promise<Transaction[]>; // Temporarily remove
  // filterTransactions: (filters: any) => Promise<Transaction[]>; // Temporarily remove, `any` was placeholder
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
      setTransactions((prev) => [...prev, newTransaction]);
      setIsLoading(false);
      return newTransaction;
    } catch (err) {
      console.error("Error creating transaction:", err);
      setError(err instanceof Error ? err.message : "Error desconocido al crear transacción");
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
      setIsLoading(false);
      return updatedTransaction;
    } catch (err) {
      console.error("Error updating transaction:", err);
      setError(err instanceof Error ? err.message : "Error desconocido al actualizar transacción");
      setIsLoading(false);
      return undefined;
    }
  };

  const removeTransaction = async (id: string) => {
    setIsLoading(true);
    try {
      await apiDeleteTransaction(id); // Use direct function call
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error("Error deleting transaction:", err);
      setError(err instanceof Error ? err.message : "Error desconocido al eliminar transacción");
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

  // Temporarily removing search and filter functions from context value
  // as they are not yet refactored in the service layer

  const value = {
    transactions,
    isLoading,
    error,
    refetchTransactions: fetchTransactionsCallback,
    addTransaction,
    modifyTransaction,
    removeTransaction,
    fetchTransactionById,
    // searchTransactions, 
    // filterTransactions,
  };

  return (
    <TransactionContext.Provider value={value}>
      {children}
    </TransactionContext.Provider>
  );
}; 