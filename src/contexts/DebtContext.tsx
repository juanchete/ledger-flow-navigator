import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getDebts as apiGetDebts,
  createDebt as apiCreateDebt,
  updateDebt as apiUpdateDebt,
  deleteDebt as apiDeleteDebt,
  getDebtById as apiGetDebtById,
  type Debt,
  type NewDebt,
  type UpdatedDebt,
} from '../integrations/supabase/debtService';

interface DebtContextType {
  debts: Debt[];
  isLoading: boolean;
  error: Error | null;
  fetchDebts: () => Promise<void>;
  addDebt: (debt: NewDebt) => Promise<Debt | undefined>;
  updateExistingDebt: (id: string, updates: UpdatedDebt) => Promise<Debt | undefined>;
  removeDebt: (id: string) => Promise<void>;
  fetchDebtById: (id: string) => Promise<Debt | null | undefined>;
  // TODO: Add search and filter functions if needed later
}

const DebtContext = createContext<DebtContextType | undefined>(undefined);

export const DebtProvider: React.FC<React.PropsWithChildren<Record<string, unknown>>> = ({ children }) => {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchDebts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiGetDebts();
      setDebts(data);
    } catch (err) {
      setError(err as Error);
      console.error("Failed to fetch debts", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDebts();
  }, [fetchDebts]);

  const addDebt = async (debt: NewDebt) => {
    setIsLoading(true);
    try {
      const newDebt = await apiCreateDebt(debt);
      setDebts((prevDebts) => [...prevDebts, newDebt]);
      setIsLoading(false);
      return newDebt;
    } catch (err) {
      setError(err as Error);
      setIsLoading(false);
      console.error("Failed to create debt", err);
    }
  };

  const updateExistingDebt = async (id: string, updates: UpdatedDebt) => {
    setIsLoading(true);
    try {
      const updatedDebt = await apiUpdateDebt(id, updates);
      setDebts((prevDebts) =>
        prevDebts.map((debt) => (debt.id === id ? updatedDebt : debt))
      );
      setIsLoading(false);
      return updatedDebt;
    } catch (err) {
      setError(err as Error);
      setIsLoading(false);
      console.error("Failed to update debt", err);
    }
  };

  const removeDebt = async (id: string) => {
    setIsLoading(true);
    try {
      await apiDeleteDebt(id);
      setDebts((prevDebts) => prevDebts.filter((debt) => debt.id !== id));
      setIsLoading(false);
    } catch (err) {
      setError(err as Error);
      setIsLoading(false);
      console.error("Failed to delete debt", err);
    }
  };

  const fetchDebtById = async (id: string) => {
    setIsLoading(true);
    try {
      const debt = await apiGetDebtById(id);
      setIsLoading(false);
      return debt;
    } catch (err) {
      setError(err as Error);
      setIsLoading(false);
      console.error("Failed to fetch debt by id", err);
      return null;
    }
  };

  return (
    <DebtContext.Provider
      value={{
        debts,
        isLoading,
        error,
        fetchDebts,
        addDebt,
        updateExistingDebt,
        removeDebt,
        fetchDebtById,
      }}
    >
      {children}
    </DebtContext.Provider>
  );
};

export const useDebts = () => {
  const context = useContext(DebtContext);
  if (context === undefined) {
    throw new Error('useDebts must be used within a DebtProvider');
  }
  return context;
}; 