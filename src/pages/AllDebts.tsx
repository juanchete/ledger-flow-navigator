import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from '@/components/common/PageHeader';
import { DebtSummaryMetrics } from '@/components/debts/DebtSummaryMetrics';
import { DebtFilters } from '@/components/debts/DebtFilters';
import { DebtTable } from '@/components/debts/DebtTable';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Loader2, Plus, Pencil, ArrowLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { DebtFormModalOptimized } from '@/components/debts/DebtFormModalOptimized';
import { Link } from 'react-router-dom';

import { useDebts } from '../contexts/DebtContext';
import { useTransactions } from '../context/TransactionContext';
import { getClients, type Client as SupabaseClient } from '@/integrations/supabase/clientService';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { useHistoricalExchangeRates } from '@/hooks/useHistoricalExchangeRates';

import type { Debt as SupabaseDebt } from '../integrations/supabase/debtService';
import type { Transaction as SupabaseTransaction } from '../integrations/supabase/transactionService';

interface EnrichedDebt extends SupabaseDebt {
  totalPaid: number;
  totalPaidUSD: number;
  calculatedStatus: string;
  payments: SupabaseTransaction[];
  primaryClient?: SupabaseClient;
  payingClients?: SupabaseClient[];
}

export interface EnrichedDebtForTable extends SupabaseDebt {
  totalPaid: number;
  totalPaidUSD: number;
  calculatedStatus: string; 
  payments: SupabaseTransaction[];
  primaryClient?: SupabaseClient;
  payingClients?: SupabaseClient[];
  dueDate: Date;
}

const AllDebts: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [dateRange, setDateRange] = useState<Date | undefined>(undefined);
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<SupabaseDebt | undefined>(undefined);
  const [clients, setClients] = useState<SupabaseClient[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  const { debts: allDebtsFromContext, isLoading: isLoadingDebts, error: errorDebts, fetchDebts } = useDebts();
  const { transactions: allTransactionsFromContext, isLoading: isLoadingTransactions, error: errorTransactions } = useTransactions();
  const { convertVESToUSD } = useExchangeRates();

  // Obtener IDs de todas las transacciones de pago en VES para cargar tasas históricas
  const vesPaymentIds = useMemo(() => {
    if (!allTransactionsFromContext) return [];
    return allTransactionsFromContext
      .filter(t => t.type === 'payment' && t.currency === 'VES' && t.status === 'completed')
      .map(t => t.id);
  }, [allTransactionsFromContext]);

  const { convertVESToUSDWithHistoricalRate } = useHistoricalExchangeRates(vesPaymentIds);

  useEffect(() => {
    const loadClients = async () => {
      setLoadingClients(true);
      try {
        const clientsData = await getClients();
        setClients(clientsData);
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
      
      // Calcular total pagado usando tasas históricas
      let totalPaidUSD = 0;
      const totalPaid = paymentsForDebt.reduce((sum, t) => {
        const paymentAmount = t.amount;
        sum += paymentAmount;
        
        // Convertir a USD usando tasa histórica si el pago fue en VES
        if (t.currency === 'VES') {
          const fallbackRate = convertVESToUSD ? convertVESToUSD(1, 'parallel') : undefined;
          totalPaidUSD += convertVESToUSDWithHistoricalRate(paymentAmount, t.id, fallbackRate);
        } else {
          // Asumir que es USD si no se especifica moneda o si es USD
          totalPaidUSD += paymentAmount;
        }
        
        return sum;
      }, 0);
      
      // El monto de la deuda ya está guardado en USD en la base de datos
      const debtAmountUSD = debt.amount;
      
      const calculatedStatus = totalPaidUSD >= debtAmountUSD ? 'paid' : debt.status;

      const primaryClient = debt.client_id ? 
        clients.find(client => client.id === debt.client_id) : 
        undefined;

      return {
        ...debt,
        amount: debtAmountUSD,
        currency: 'USD',
        dueDate: new Date(debt.due_date || 0),
        totalPaid,
        totalPaidUSD,
        calculatedStatus,
        payments: paymentsForDebt,
        primaryClient,
        payingClients: [],
      };
    });
  }, [allDebtsFromContext, allTransactionsFromContext, clients, convertVESToUSD, convertVESToUSDWithHistoricalRate]);

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

  // Calculate totals from filteredDebts (considering actual payments in USD)
  const totalAmount = filteredDebts.reduce((sum, debt) => sum + debt.amount, 0);
  const pendingAmount = filteredDebts
    .filter(debt => debt.calculatedStatus === 'pending')
    .reduce((sum, debt) => {
      const remainingAmount = Math.max(0, debt.amount - debt.totalPaidUSD);
      return sum + remainingAmount;
    }, 0);
  const overdueAmount = filteredDebts
    .filter(debt => debt.calculatedStatus === 'overdue')
    .reduce((sum, debt) => {
      const remainingAmount = Math.max(0, debt.amount - debt.totalPaidUSD);
      return sum + remainingAmount;
    }, 0);
  const paidAmount = filteredDebts
    .filter(debt => debt.calculatedStatus === 'paid')
    .reduce((sum, debt) => sum + debt.totalPaidUSD, 0);

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

  const handleDebtClick = (debt: EnrichedDebtForTable) => {
    // Navigation will be handled by Link component in DebtTable
    console.log('Deuda seleccionada para detalle (desde AllDebts):', debt.id);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("pending");
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
    handleDebtModalClose(); // Cerrar modal y limpiar estado
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
    <div className="space-y-4 sm:space-y-6 animate-fade-in p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild className="shrink-0">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
              <span className="ml-2 hidden sm:inline">Volver</span>
            </Link>
          </Button>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
            Todas las Deudas
          </h1>
        </div>
        <Button onClick={handleAddDebt} className="flex items-center gap-2 w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          <span className="sm:hidden">Agregar</span>
          <span className="hidden sm:inline">Agregar Deuda</span>
        </Button>
      </div>
      
      {/* Summary Cards */}
      <div className="w-full">
        <DebtSummaryMetrics 
          totalAmount={totalAmount}
          pendingAmount={pendingAmount}
          overdueAmount={overdueAmount}
          paidAmount={paidAmount}
        />
      </div>
      
      {/* Main Content */}
      <Card className="w-full">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg sm:text-xl">Listado de Deudas</CardTitle>
          <div className="w-full">
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
        <CardContent className="p-0">
          <div className="w-full">
            <DebtTable 
              debts={filteredDebts}
              formatDate={formatDate}
              onDebtClick={handleDebtClick}
              onEditDebt={handleEditDebt}
            />
          </div>
        </CardContent>
      </Card>

      {isDebtModalOpen && (
        <DebtFormModalOptimized 
          isOpen={isDebtModalOpen}
          onClose={handleDebtModalClose}
          debt={selectedDebt}
          clients={clients.map(client => ({ id: client.id, name: client.name }))}
          onSuccess={handleDebtSuccess}
        />
      )}
    </div>
  );
};

export default AllDebts;
