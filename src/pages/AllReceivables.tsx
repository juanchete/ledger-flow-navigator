import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from 'react-router-dom';
import { ArrowLeft, Search, Calendar, Filter } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { DebtDetailsModal } from '@/components/operations/DebtDetailsModal';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { getReceivables } from "@/integrations/supabase/receivableService";
import { getTransactions } from "@/integrations/supabase/transactionService";

interface Receivable {
  id: string;
  clientId: string;
  amount: number;
  dueDate: Date;
  status: string;
  description: string;
  notes: string;
}

interface Transaction {
  id: string;
  type: string;
  receivableId?: string;
  clientId?: string;
  amount: number;
  date: string | Date;
  status: string;
}

const AllReceivables: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedReceivable, setSelectedReceivable] = useState<Receivable | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState<Date | undefined>(undefined);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [receivablesData, transactionsData] = await Promise.all([
          getReceivables(),
          getTransactions()
        ]);
        setReceivables(
          receivablesData.map((r) => ({
            id: r.id,
            clientId: r.client_id,
            amount: r.amount,
            dueDate: new Date(r.due_date),
            status: r.status || 'pending',
            description: r.description || '',
            notes: r.notes || ''
          }))
        );
        setTransactions(
          transactionsData.map((t) => ({
            id: t.id,
            type: t.type,
            receivableId: t.receivable_id,
            clientId: t.client_id,
            amount: t.amount,
            date: t.date,
            status: t.status
          }))
        );
      } catch (err) {
        console.error("Error al cargar datos de Supabase:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Calcular el estado real de cada cuenta por cobrar en base a los pagos asociados
  const receivablesWithPayments = receivables.map(receivable => {
    const payments = transactions.filter(t => t.type === 'payment' && t.receivableId === receivable.id && t.status === 'completed');
    const totalPaid = payments.reduce((sum, t) => sum + t.amount, 0);
    const isPaid = totalPaid >= receivable.amount;
    return {
      ...receivable,
      status: isPaid ? 'paid' : receivable.status,
      totalPaid,
      payments
    };
  });

  // Usar receivablesWithPayments en vez de receivables
  const filteredReceivables = receivablesWithPayments.filter((receivable) => {
    const matchesSearch = receivable.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         receivable.clientId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || receivable.status === statusFilter;
    const matchesDate = !dateRange || 
                       new Date(receivable.dueDate).toDateString() === new Date(dateRange).toDateString();
    return matchesSearch && matchesStatus && matchesDate;
  });

  // Calculate totals
  const totalAmount = filteredReceivables.reduce((sum, receivable) => sum + receivable.amount, 0);
  
  // Calculate pending, overdue, and paid amounts
  const pendingAmount = filteredReceivables
    .filter(receivable => receivable.status === 'pending')
    .reduce((sum, receivable) => sum + receivable.amount, 0);
  
  const overdueAmount = filteredReceivables
    .filter(receivable => receivable.status === 'overdue')
    .reduce((sum, receivable) => sum + receivable.amount, 0);
  
  const paidAmount = filteredReceivables
    .filter(receivable => receivable.status === 'paid')
    .reduce((sum, receivable) => sum + receivable.amount, 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-400 text-yellow-900';
      case 'paid':
        return 'bg-green-500 text-white';
      case 'overdue':
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

  const handleReceivableClick = (receivable: Receivable) => {
    setSelectedReceivable(receivable);
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
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
              <span className="ml-2">Volver</span>
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Todas las Cuentas por Cobrar</h1>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total por Cobrar</CardTitle>
            <CardDescription className="text-2xl font-bold text-green-600">
              {formatCurrency(totalAmount)}
            </CardDescription>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <CardDescription className="text-2xl font-bold text-yellow-600">
              {formatCurrency(pendingAmount)}
            </CardDescription>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Vencidas</CardTitle>
            <CardDescription className="text-2xl font-bold text-red-600">
              {formatCurrency(overdueAmount)}
            </CardDescription>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pagadas</CardTitle>
            <CardDescription className="text-2xl font-bold text-green-600">
              {formatCurrency(paidAmount)}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Listado de Cuentas por Cobrar</CardTitle>
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="relative flex-grow">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por descripción o cliente..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="overdue">Vencido</SelectItem>
                  <SelectItem value="paid">Pagado</SelectItem>
                </SelectContent>
              </Select>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[180px]">
                    <Calendar className="mr-2 h-4 w-4" />
                    {dateRange ? formatDate(dateRange) : "Filtrar por fecha"}
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
              
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <Filter className="h-4 w-4" />
                <span className="ml-1">Limpiar</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descripción</TableHead>
                <TableHead>Cliente ID</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Fecha de Vencimiento</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReceivables.length > 0 ? (
                filteredReceivables.map((receivable) => (
                  <HoverCard key={receivable.id}>
                    <HoverCardTrigger asChild>
                      <TableRow>
                        <TableCell className="font-medium">{receivable.description}</TableCell>
                        <TableCell>{receivable.clientId}</TableCell>
                        <TableCell>{formatCurrency(receivable.amount)}</TableCell>
                        <TableCell>{formatDate(receivable.dueDate)}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(receivable.status)}>
                            {receivable.status === 'pending' ? 'Pendiente' : receivable.status === 'paid' ? 'Pagado' : receivable.status === 'overdue' ? 'Vencido' : receivable.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            asChild
                          >
                            <Link to={`/all-receivables/${receivable.id}`}>
                              Ver Detalle
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80 p-4">
                      <span className="font-semibold text-xs text-gray-700">Historial de pagos:</span>
                      {(() => {
                        const pagos = transactions
                          .filter(t => t.type === 'payment' && t.receivableId === receivable.id)
                          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                        let saldoAnterior = receivable.amount;
                        if (pagos.length > 0) {
                          return (
                            <ul className="mt-1 space-y-1">
                              {pagos.map((t, idx) => {
                                const row = (
                                  <li key={t.id} className="text-xs items-center border-b last:border-b-0 py-1 grid grid-cols-4 gap-1">
                                    <span className="col-span-1">{new Date(t.date).toLocaleDateString('es-ES')}</span>
                                    <span className="col-span-1 truncate">{t.clientId ? t.clientId : 'Cliente'}</span>
                                    <span className="col-span-1 font-semibold text-right">{formatCurrency(t.amount)}</span>
                                    <span className="col-span-1 text-right text-gray-500">Antes: {formatCurrency(saldoAnterior)} <br/> Desp: {formatCurrency(Math.max(0, saldoAnterior - t.amount))}</span>
                                  </li>
                                );
                                saldoAnterior = Math.max(0, saldoAnterior - t.amount);
                                return row;
                              })}
                            </ul>
                          );
                        } else {
                          return <div className="text-xs text-gray-500 mt-1">Sin pagos asociados</div>;
                        }
                      })()}
                    </HoverCardContent>
                  </HoverCard>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                    No se encontraron cuentas por cobrar con los filtros aplicados
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedReceivable && (
        <DebtDetailsModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          item={selectedReceivable}
          type="receivable"
        />
      )}
    </div>
  );
};

export default AllReceivables;
