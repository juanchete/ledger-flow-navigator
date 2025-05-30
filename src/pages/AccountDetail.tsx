
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Search, Calendar, Filter, Plus, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DebtDetailsModal } from '@/components/operations/DebtDetailsModal';
import { getTransactions } from "@/integrations/supabase/transactionService";
import { getClientById } from "@/integrations/supabase/clientService";
import { Transaction } from '@/types';

interface Account {
  id: string;
  clientId: string;
  amount: number;
  dueDate: Date;
  status: string;
  description: string;
  notes: string;
}

interface TransactionWithBalance extends Transaction {
  balance?: number;
}

const AccountDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [selectedDebt, setSelectedDebt] = useState<Account | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState<Date | undefined>(undefined);
  const [transactions, setTransactions] = useState<TransactionWithBalance[]>([]);
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Simulando la obtención de la cuenta (reemplaza con tu lógica real)
        const accountData = await getClientById(id || '');
        if (accountData) {
          setAccount({
            id: accountData.id,
            clientId: accountData.id,
            amount: 1000, // Valor simulado
            dueDate: new Date(), // Valor simulado
            status: 'pending', // Valor simulado
            description: 'Cuenta simulada', // Valor simulado
            notes: 'Notas simuladas' // Valor simulado
          });
        }

        const transactionsData = await getTransactions();
        setTransactions(
          transactionsData.map((t) => ({
            id: t.id,
            type: t.type as Transaction["type"],
            clientId: t.client_id,
            amount: t.amount,
            date: new Date(t.date),
            status: t.status as Transaction["status"],
            description: t.description || '',
            paymentMethod: t.payment_method || '',
            category: t.category || '',
            notes: t.notes || '',
            createdAt: new Date(t.created_at),
            updatedAt: new Date(t.updated_at)
          }))
        );
      } catch (err) {
        console.error("Error al cargar datos de Supabase:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const currentBalance = transactions.reduce((balance, transaction) => {
    if (transaction.type === 'sale' || transaction.type === 'payment' || transaction.type === 'banking') {
      return balance + transaction.amount;
    } else if (transaction.type === 'purchase' || transaction.type === 'expense') {
      return balance - transaction.amount;
    }
    return balance;
  }, account?.amount || 0);

  const balanceHistory = transactions.map((transaction, index) => {
    const previousBalance = index === 0 ? (account?.amount || 0) : currentBalance;
    return {
      ...transaction,
      balance: previousBalance
    };
  });

  const filteredTransactions = balanceHistory.filter((transaction) => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || transaction.status === statusFilter;
    const matchesDate = !dateRange || 
                       new Date(transaction.date).toDateString() === new Date(dateRange).toDateString();
    return matchesSearch && matchesStatus && matchesDate;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-400 text-yellow-900';
      case 'completed':
        return 'bg-green-500 text-white';
      case 'cancelled':
        return 'bg-red-500 text-white';
      default:
        return 'bg-gray-300 text-gray-800';
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleDebtClick = (debt: Account) => {
    setSelectedDebt(debt);
    setIsDetailsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsDetailsModalOpen(false);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("pending");
    setDateRange(undefined);
  };

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
            Detalle de Cuenta
          </h1>
        </div>
        <div className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
            Saldo: {formatCurrency(currentBalance)}
          </div>
      </div>
      
      {/* Main Content */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg sm:text-xl">Listado de Transacciones</CardTitle>
          
          {/* Filters */}
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por descripción..."
                className="pl-8 text-sm sm:text-base"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {/* Filter row */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px] text-sm">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="completed">Completado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-[180px] justify-start text-sm">
                    <Calendar className="mr-2 h-4 w-4" />
                    <span className="truncate">
                      {dateRange ? formatDate(dateRange) : "Filtrar fecha"}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dateRange}
                    onSelect={setDateRange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              
              <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full sm:w-auto">
                <Filter className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Limpiar</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-[200px]">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Saldo</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>{formatDate(transaction.date)}</TableCell>
                    <TableCell>{transaction.type}</TableCell>
                    <TableCell>{transaction.description}</TableCell>
                    <TableCell>{formatCurrency(transaction.amount)}</TableCell>
                    <TableCell>{formatCurrency(transaction.balance || 0)}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(transaction.status)}>
                        {transaction.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedDebt && (
        <DebtDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={handleCloseModal}
          item={selectedDebt}
          type="debt"
        />
      )}
    </div>
  );
};

export default AccountDetail;
