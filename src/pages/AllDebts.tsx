import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { mockDetailedDebts, mockClients, mockTransactions } from '@/data/mockData'; // Remove mock data
import { PageHeader } from '@/components/common/PageHeader';
import { DebtSummaryMetrics } from '@/components/debts/DebtSummaryMetrics';
import { DebtFilters } from '@/components/debts/DebtFilters';
import { DebtTable } from '@/components/debts/DebtTable'; // Removed DebtTableRow import
// import { CurrencySwitch } from '@/components/operations/common/CurrencySwitch'; // Temporarily remove
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Loader2 } from 'lucide-react';

import { useDebts } from '../contexts/DebtContext';
import { useTransactions } from '../context/TransactionContext'; // Changed path
// import { useClients } from '../contexts/ClientContext'; // Commented out due to missing file

import type { Debt as SupabaseDebt } from '../integrations/supabase/debtService';
import type { Transaction as SupabaseTransaction } from '../integrations/supabase/transactionService';
import type { Client as SupabaseClient } from '../integrations/supabase/clientService'; // This is UserProfile

// Define enriched types based on Supabase types
// interface EnrichedDebtClient extends SupabaseClient { // Removed redundant interface
//   // clientType is already in SupabaseClient if it's part of the table, otherwise define it
//   // clientType: 'direct' | 'indirect'; // Example if not in SupabaseClient
// }

interface EnrichedDebt extends SupabaseDebt {
  totalPaid: number;
  calculatedStatus: string; // 'paid' or original status
  payments: SupabaseTransaction[]; // Assuming payments are full transaction objects
  primaryClient?: SupabaseClient; // The client directly associated via client_id
  payingClients?: SupabaseClient[]; // Clients who made payments for this debt
  // status will be calculated and potentially overridden
}

// interface Client { // Remove local Client interface
//   id: string;
//   name: string;
//   clientType: 'direct' | 'indirect';
//   // ... other client properties
// }

// interface Debt { // Remove local Debt interface
//   id: string;
//   creditor: string;
//   amount: number;
//   dueDate: Date; // Supabase dueDate is string
//   status: string;
//   category: string;
//   notes: string;
//   relatedClientId?: string; // Primary client responsible for the debt
//   payingClients?: Client[]; // Clients who made payments for this debt
// }

// This will be the shape of data passed to DebtTable
// It should align with what DebtTable and DebtTableRow expect or they need to be adapted
export interface EnrichedDebtForTable extends SupabaseDebt {
  totalPaid: number;
  calculatedStatus: string; 
  payments: SupabaseTransaction[];
  primaryClient?: SupabaseClient & { name?: string }; // Will be affected by ClientContext removal
  payingClients?: (SupabaseClient & { name?: string })[]; // Will be affected by ClientContext removal
  dueDate: Date; // Changed to non-optional Date for DebtTable compatibility
  // SupabaseDebt already has: id, creditor, amount, due_date (string), status (original), category, notes, client_id, etc.
}

const AllDebts: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState<Date | undefined>(undefined);
  // const [isUSD, setIsUSD] = useState(true); // Temporarily removed
  // const [clientTypeFilter, setClientTypeFilter] = useState("all"); // Temporarily removed or will be re-evaluated

  const { debts: allDebtsFromContext, isLoading: isLoadingDebts, error: errorDebts } = useDebts();
  const { transactions: allTransactionsFromContext, isLoading: isLoadingTransactions, error: errorTransactions } = useTransactions();
  // const { clients: allClientsFromContext, isLoading: isLoadingClients, error: errorClients } = useClients(); // Commented out

  // const clientsMap = useMemo(() => { // Commented out as allClientsFromContext is unavailable
  //   if (!allClientsFromContext) return new Map<string, SupabaseClient>();
  //   return allClientsFromContext.reduce((acc, client) => {
  //     acc.set(client.id, client);
  //     return acc;
  //   }, new Map<string, SupabaseClient>());
  // }, [allClientsFromContext]);

  const enrichedDebts = useMemo<EnrichedDebtForTable[]>(() => {
    if (!allDebtsFromContext || !allTransactionsFromContext) return [];

    return allDebtsFromContext.map(debt => {
      const paymentsForDebt = allTransactionsFromContext.filter(
        t => t.type === 'payment' && t.debt_id === debt.id && t.status === 'completed'
      );
      const totalPaid = paymentsForDebt.reduce((sum, t) => sum + t.amount, 0);
      const calculatedStatus = totalPaid >= debt.amount ? 'paid' : debt.status;

      // const primaryClient = debt.client_id && clientsMap ? clientsMap.get(debt.client_id) : undefined; // Commented out
      
      // const payingClientIds = new Set<string>(); // Commented out
      // paymentsForDebt.forEach(p => { // Commented out
      //   if (p.client_id) payingClientIds.add(p.client_id); // Commented out
      // }); // Commented out
      // const payingClients = clientsMap ? Array.from(payingClientIds).map(id => clientsMap.get(id)).filter(Boolean) as SupabaseClient[] : undefined; // Commented out

      return {
        ...debt,
        dueDate: new Date(debt.due_date || 0), // Ensure dueDate is always a Date object
        totalPaid,
        calculatedStatus,
        payments: paymentsForDebt,
        payingClients: [], // Solución rápida para el error de tipo
        // primaryClient, // Commented out
        // payingClients: payingClients && payingClients.length > 0 ? payingClients : undefined, // Commented out
      };
    });
  // }, [allDebtsFromContext, allTransactionsFromContext, clientsMap]); // clientsMap removed from dependencies
  }, [allDebtsFromContext, allTransactionsFromContext]); // Dependencies updated

  const filteredDebts = useMemo(() => {
    return enrichedDebts.filter((debt) => {
      const creditor = debt.creditor || ""; // Ensure creditor is a string
      const category = debt.category || ""; // Ensure category is a string
      
      const matchesSearch = creditor.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            category.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || debt.calculatedStatus === statusFilter;
      
      const matchesDate = !dateRange || 
                          (debt.due_date && new Date(debt.due_date).toDateString() === new Date(dateRange).toDateString());
      
      // Client type filter - simplified based on presence of paying clients for "indirect"
      // This part needs review based on how clientType is actually determined or if it's still needed
      // const matchesClientType = clientTypeFilter === "all" || (
      //   clientTypeFilter === "direct" ? 
      //     !debt.payingClients || debt.payingClients.length === 0 : // Assuming "direct" means no OTHER paying clients
      //     debt.payingClients && debt.payingClients.length > 0
      // );
      // For now, let's remove clientTypeFilter from filtering if it was removed from state
      
      return matchesSearch && matchesStatus && matchesDate; // && matchesClientType (if re-added)
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
    // setClientTypeFilter("all"); // If re-added
  };

  // if (isLoadingDebts || isLoadingTransactions || isLoadingClients) { // isLoadingClients removed
  if (isLoadingDebts || isLoadingTransactions) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    );
  }

  // if (errorDebts || errorTransactions || errorClients) { // errorClients removed
  if (errorDebts || errorTransactions) {
    // const error = errorDebts || errorTransactions || errorClients; // errorClients removed
    const error = errorDebts || errorTransactions; // This should be Error | null
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error al Cargar Datos</AlertTitle>
          <AlertDescription>
            {/* Check if error object exists and has a message property, otherwise provide a generic message */}
            {/* {(error && error.message) ? error.message : "Ocurrió un error desconocido. Por favor, inténtalo de nuevo."} */}
            {error instanceof Error ? error.message : (typeof error === 'string' ? error : "Ocurrió un error desconocido. Por favor, inténtalo de nuevo.")}
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  // if (!allDebtsFromContext || !allTransactionsFromContext || !allClientsFromContext) { // allClientsFromContext removed
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
        {/* <CurrencySwitch isUSD={isUSD} onCheckedChange={setIsUSD} /> */}
      </div>
      
      <DebtSummaryMetrics 
        totalAmount={totalAmount}
        pendingAmount={pendingAmount}
        overdueAmount={overdueAmount}
        paidAmount={paidAmount}
        // currency={isUSD ? 'USD' : 'BS'} // Pass currency if DebtSummaryMetrics supports it
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
              formatDate={formatDate} // Pass the new formatDate
            />
            
            {/* Temporarily remove client type filter UI until logic is clear
            <div className="flex items-center space-x-4">
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                value={clientTypeFilter}
                onChange={(e) => setClientTypeFilter(e.target.value)}
              >
                <option value="all">Todos los Clientes</option>
                <option value="direct">Clientes Directos</option>
                <option value="indirect">Clientes Indirectos</option>
              </select>
            </div>
            */}
          </div>
        </CardHeader>
        <CardContent>
          <DebtTable 
            debts={filteredDebts} // This will be EnrichedDebtForTable[]
            formatDate={formatDate} // Pass the new formatDate
            onDebtClick={handleDebtClick} // onDebtClick expects EnrichedDebtForTable
            // HoverCard for payment history can be implemented within DebtTable
            // using debt.payments from EnrichedDebtForTable
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default AllDebts;
