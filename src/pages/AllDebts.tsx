import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from '@/components/common/PageHeader';
import { DebtSummaryMetrics } from '@/components/debts/DebtSummaryMetrics';
import { DebtFilters } from '@/components/debts/DebtFilters';
import { DebtTable } from '@/components/debts/DebtTable';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Loader2, Plus, Pencil } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { DebtFormModal } from '@/components/debts/DebtFormModal';

import { useDebts } from '../contexts/DebtContext';
import { useTransactions } from '../context/TransactionContext';
import { getClients } from '@/integrations/supabase/clientService';

import type { Debt as SupabaseDebt } from '../integrations/supabase/debtService';
import type { Transaction as SupabaseTransaction } from '../integrations/supabase/transactionService';
import type { Client as SupabaseClient } from '../integrations/supabase/clientService';

interface EnrichedDebt extends SupabaseDebt {
  totalPaid: number;
  calculatedStatus: string;
  payments: SupabaseTransaction[];
  primaryClient?: SupabaseClient;
  payingClients?: SupabaseClient[];
}

export interface EnrichedDebtForTable extends SupabaseDebt {
  totalPaid: number;
  calculatedStatus: string; 
  payments: SupabaseTransaction[];
  primaryClient?: SupabaseClient & { name?: string };
  payingClients?: (SupabaseClient & { name?: string })[];
  dueDate: Date;
}

const AllDebts: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState<Date | undefined>(undefined);
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<SupabaseDebt | undefined>(undefined);
  const [clients, setClients] = useState<Array<{ id: string, name: string }>>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  const { debts: allDebtsFromContext, isLoading: isLoadingDebts, error: errorDebts, fetchDebts } = useDebts();
  const { transactions: allTransactionsFromContext, isLoading: isLoadingTransactions, error: errorTransactions } = useTransactions();

  useEffect(() => {
    const loadClients = async () => {
      setLoadingClients(true);
      try {
        const clientsData = await getClients();
        setClients(clientsData.map(client => ({
          id: client.id,
          name: client.name
        })));
      } catch (error) {
        console.error('Error loading clients:', error);
      } finally {
        setLoadingClients(false);
      }
    };
    loadClients();
  }, []);

  const enrichedDebts = useMemo<EnrichedDebtForTable[]>(() => {
    if (!allDebtsFromContext || !allTransactionsFromContext) return [];

    return allDebtsFromContext.map(debt => {
      const paymentsForDebt = allTransactionsFromContext.filter(
        t => t.type === 'payment' && t.debt_id === debt.id && t.status === 'completed'
      );
      const totalPaid = paymentsForDebt.reduce((sum, t) => sum + t.amount, 0);
      const calculatedStatus = totalPaid >= debt.amount ? 'paid' : debt.status;

      return {
        ...debt,
        dueDate: new Date(debt.due_date || 0),
        totalPaid,
        calculatedStatus,
        payments: paymentsForDebt,
        payingClients: [],
      };
    });
  }, [allDebtsFromContext, allTransactionsFromContext]);

  const filteredDebts = useMemo(() => {
    return enrichedDebts.filter((debt) => {
      const creditor = debt.creditor || "";
      const category = debt.category || "";
      
      const matchesSearch = creditor.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            category.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || debt.calculatedStatus === statusFilter;
      
      const matchesDate = !dateRange || 
                          (debt.due_date && new Date(debt.due_date).toDateString() === new Date(dateRange).toDateString());
      
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [enrichedDebts, searchQuery, statusFilter, dateRange]);

  // Calculate totals from filteredDebts
  const totalAmount = filteredDebts.reduce((sum, debt) => sum + debt.amount, 0);
  const pendingAmount = filteredDebts
    .filter(debt => debt.calculatedStatus === 'pending')
    .reduce((sum, debt) => sum + debt.amount, 0);
  const overdueAmount = filteredDebts
    .filter(debt => debt.calculatedStatus === 'overdue')
    .reduce((sum, debt) => sum + debt.amount, 0);
  const paidAmount = filteredDebts
    .filter(debt => debt.calculatedStatus === 'paid')
    .reduce((sum, debt) => sum + debt.amount, 0);

  const formatDate = useCallback((dateString: string | null | undefined | Date): string => {
    if (!dateString) return 'N/A';
    try {
        const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
        if (isNaN(date.getTime())) return 'Fecha inválida';
        return date.toLocaleDateString('es-ES', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
    } catch (e) {
        return 'Error fecha';
    }
  }, []);

  const handleDebtClick = (debt: any) => {
    // Navigation will be handled by Link component in DebtTable
    console.log('Deuda seleccionada para detalle (desde AllDebts):', debt.id);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setDateRange(undefined);
  };

  const handleAddDebt = () => {
    setSelectedDebt(undefined);
    setIsDebtModalOpen(true);
  };

  const handleEditDebt = (debt: SupabaseDebt) => {
    setSelectedDebt(debt);
    setIsDebtModalOpen(true);
  };

  const handleDebtModalClose = () => {
    setIsDebtModalOpen(false);
    setSelectedDebt(undefined);
  };

  const handleDebtSuccess = () => {
    fetchDebts();
  };

  if (isLoadingDebts || isLoadingTransactions) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    );
  }

  if (errorDebts || errorTransactions) {
    const error = errorDebts || errorTransactions;
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error al Cargar Datos</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : (typeof error === 'string' ? error : "Ocurrió un error desconocido. Por favor, inténtalo de nuevo.")}
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  if (!allDebtsFromContext || !allTransactionsFromContext) {
     // This case should ideally be covered by isLoading, but as a fallback:
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p>No hay datos disponibles o cargando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader title="Todas las Deudas" />
        <Button onClick={handleAddDebt} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          <span>Agregar Deuda</span>
        </Button>
      </div>
      
      <DebtSummaryMetrics 
        totalAmount={totalAmount}
        pendingAmount={pendingAmount}
        overdueAmount={overdueAmount}
        paidAmount={paidAmount}
      />
      
      <Card>
        <CardHeader>
          <CardTitle>Listado de Deudas</CardTitle>
          <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
            <DebtFilters 
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              dateRange={dateRange}
              setDateRange={setDateRange}
              clearFilters={clearFilters}
              formatDate={formatDate}
            />
          </div>
        </CardHeader>
        <CardContent>
          <DebtTable 
            debts={filteredDebts}
            formatDate={formatDate}
            onDebtClick={handleDebtClick}
            onEditDebt={handleEditDebt}
          />
        </CardContent>
      </Card>

      {isDebtModalOpen && (
        <DebtFormModal 
          isOpen={isDebtModalOpen}
          onClose={handleDebtModalClose}
          debt={selectedDebt}
          clients={clients}
          onSuccess={handleDebtSuccess}
        />
      )}
    </div>
  );
};

export default AllDebts;
