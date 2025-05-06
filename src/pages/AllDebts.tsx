
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockDetailedDebts } from '@/data/mockData';
import { DebtDetailsModal } from '@/components/operations/DebtDetailsModal';
import { PageHeader } from '@/components/common/PageHeader';
import { DebtSummaryMetrics } from '@/components/debts/DebtSummaryMetrics';
import { DebtFilters } from '@/components/debts/DebtFilters';
import { DebtTable } from '@/components/debts/DebtTable';
import { CurrencySwitch } from '@/components/operations/common/CurrencySwitch';

interface Debt {
  id: string;
  creditor: string;
  amount: number;
  dueDate: Date;
  status: string;
  category: string;
  notes: string;
}

const AllDebts: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState<Date | undefined>(undefined);
  const [isUSD, setIsUSD] = useState(true);

  // Filter debts based on search query, status filter, and date filter
  const filteredDebts = mockDetailedDebts.filter((debt) => {
    const matchesSearch = debt.creditor.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         debt.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || debt.status === statusFilter;
    const matchesDate = !dateRange || 
                       new Date(debt.dueDate).toDateString() === new Date(dateRange).toDateString();
    
    return matchesSearch && matchesStatus && matchesDate;
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
