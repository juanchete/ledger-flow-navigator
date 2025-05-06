import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockDetailedDebts, mockClients } from '@/data/mockData';
import { DebtDetailsModal } from '@/components/operations/DebtDetailsModal';
import { PageHeader } from '@/components/common/PageHeader';
import { DebtSummaryMetrics } from '@/components/debts/DebtSummaryMetrics';
import { DebtFilters } from '@/components/debts/DebtFilters';
import { DebtTable } from '@/components/debts/DebtTable';
import { CurrencySwitch } from '@/components/operations/common/CurrencySwitch';

interface Client {
  id: string;
  name: string;
  clientType: 'direct' | 'indirect';
  // ... other client properties
}

interface Debt {
  id: string;
  creditor: string;
  amount: number;
  dueDate: Date;
  status: string;
  category: string;
  notes: string;
  relatedClientId?: string; // Primary client responsible for the debt
  payingClients?: Client[]; // Clients who made payments for this debt
}

const AllDebts: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState<Date | undefined>(undefined);
  const [isUSD, setIsUSD] = useState(true);
  const [clientTypeFilter, setClientTypeFilter] = useState("all");

  // Enhanced mock data - in a real app, this would come from your database
  const enhancedDebts = mockDetailedDebts.map(debt => {
    // Randomly assign a primary client and potentially paying clients
    const randomClientIndex = Math.floor(Math.random() * mockClients.length);
    const primaryClient = mockClients[randomClientIndex];
    
    // For demonstration - some debts have indirect clients paying for them
    const hasIndirectPayers = Math.random() > 0.7;
    let payingClients: Client[] = [];
    
    if (hasIndirectPayers) {
      // Add 1-2 indirect clients as payers
      const indirectClients = mockClients.filter(c => 
        c.clientType === 'indirect' && c.id !== primaryClient.id
      ).slice(0, 2);
      
      payingClients = indirectClients;
    }
    
    return {
      ...debt,
      relatedClientId: primaryClient.id,
      payingClients: payingClients.length > 0 ? payingClients : undefined
    };
  });

  // Filter debts based on search query, status filter, date filter, and client type
  const filteredDebts = enhancedDebts.filter((debt) => {
    const matchesSearch = debt.creditor.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          debt.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || debt.status === statusFilter;
    const matchesDate = !dateRange || 
                        new Date(debt.dueDate).toDateString() === new Date(dateRange).toDateString();
    
    // Filter by client type (direct, indirect, or all)
    const matchesClientType = clientTypeFilter === "all" || (
      clientTypeFilter === "direct" ? 
        !debt.payingClients || debt.payingClients.length === 0 :
        debt.payingClients && debt.payingClients.length > 0
    );
    
    return matchesSearch && matchesStatus && matchesDate && matchesClientType;
  });

  // Calculate totals
  const totalAmount = filteredDebts.reduce((sum, debt) => sum + debt.amount, 0);
  
  // Calculate pending, overdue, and paid amounts
  const pendingAmount = filteredDebts
    .filter(debt => debt.status === 'pending')
    .reduce((sum, debt) => sum + debt.amount, 0);
  
  const overdueAmount = filteredDebts
    .filter(debt => debt.status === 'overdue')
    .reduce((sum, debt) => sum + debt.amount, 0);
  
  const paidAmount = filteredDebts
    .filter(debt => debt.status === 'paid')
    .reduce((sum, debt) => sum + debt.amount, 0);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleDebtClick = (debt: Debt) => {
    setSelectedDebt(debt);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setDateRange(undefined);
    setClientTypeFilter("all");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader title="Todas las Deudas" />
        <CurrencySwitch isUSD={isUSD} onCheckedChange={setIsUSD} />
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
          </div>
        </CardHeader>
        <CardContent>
          <DebtTable 
            debts={filteredDebts}
            formatDate={formatDate}
            onDebtClick={handleDebtClick}
          />
        </CardContent>
      </Card>

      {selectedDebt && (
        <DebtDetailsModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          item={selectedDebt}
          type="debt"
        />
      )}
    </div>
  );
};

export default AllDebts;
