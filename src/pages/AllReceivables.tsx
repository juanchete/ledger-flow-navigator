import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from 'react-router-dom';
import { ArrowLeft, Search, Calendar, Filter, Plus, Pencil, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { DebtDetailsModal } from '@/components/operations/DebtDetailsModal';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import { getReceivables, type Receivable as SupabaseReceivableType } from "@/integrations/supabase/receivableService";
import { getTransactions } from "@/integrations/supabase/transactionService";
import { getClients } from '@/integrations/supabase/clientService';
import { ReceivableFormModal } from '@/components/receivables/ReceivableFormModal';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { useHistoricalExchangeRates } from '@/hooks/useHistoricalExchangeRates';

interface Receivable {
  id: string;
  clientId: string;
  amount: number;
  dueDate: Date;
  status: string;
  description: string;
  notes: string;
  totalPaid: number;
  totalPaidUSD: number;
  payments: Transaction[];
}

interface Transaction {
  id: string;
  type: string;
  receivableId?: string;
  clientId?: string;
  amount: number;
  date: string | Date;
  status: string;
  currency?: string;
}

const AllReceivables: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [selectedReceivable, setSelectedReceivable] = useState<Receivable | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState<Date | undefined>(undefined);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [clients, setClients] = useState<Array<{ id: string, name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [editingReceivable, setEditingReceivable] = useState<SupabaseReceivableType | null>(null);

  const { convertVESToUSD } = useExchangeRates();

  // Obtener IDs de todas las transacciones de pago en VES para cargar tasas históricas
  const vesPaymentIds = useMemo(() => {
    if (!transactions) return [];
    return transactions
      .filter(t => t.type === 'payment' && t.currency === 'VES' && t.status === 'completed')
      .map(t => t.id);
  }, [transactions]);

  const { convertVESToUSDWithHistoricalRate } = useHistoricalExchangeRates(vesPaymentIds);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [receivablesData, transactionsData, clientsData] = await Promise.all([
          getReceivables(),
          getTransactions(),
          getClients()
        ]);
        setReceivables(
          receivablesData.map((r) => ({
            id: r.id,
            clientId: r.client_id,
            amount: r.currency === 'VES' && convertVESToUSD ? 
              convertVESToUSD(r.amount, 'parallel') || r.amount : 
              r.amount, // Convertir a USD si es necesario
            dueDate: new Date(r.due_date),
            status: r.status || 'pending',
            description: r.description || '',
            notes: r.notes || '',
            totalPaid: 0,
            totalPaidUSD: 0,
            payments: []
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
            status: t.status,
            currency: t.currency
          }))
        );
        setClients(
          clientsData.map((c) => ({
            id: c.id,
            name: c.name
          }))
        );
      } catch (err) {
        console.error("Error al cargar datos de Supabase:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [convertVESToUSD]);

  // Calcular el estado real de cada cuenta por cobrar en base a los pagos asociados (usando tasas históricas)
  const receivablesWithPayments = useMemo(() => {
    return receivables.map(receivable => {
      const payments = transactions.filter(t => t.type === 'payment' && t.receivableId === receivable.id && t.status === 'completed');
      
      let totalPaidUSD = 0;
      const totalPaid = payments.reduce((sum, t) => {
        sum += t.amount;
        
        // Convertir a USD usando tasa histórica si el pago fue en VES
        if (t.currency === 'VES') {
          const fallbackRate = convertVESToUSD ? convertVESToUSD(1, 'parallel') : undefined;
          totalPaidUSD += convertVESToUSDWithHistoricalRate(t.amount, t.id, fallbackRate);
        } else {
          // Asumir que es USD si no se especifica moneda o si es USD
          totalPaidUSD += t.amount;
        }
        
        return sum;
      }, 0);
      
      const isPaid = totalPaidUSD >= receivable.amount; // Comparar en USD
      
      return {
        ...receivable,
        status: isPaid ? 'paid' : receivable.status,
        totalPaid,
        totalPaidUSD,
        payments
      };
    });
  }, [receivables, transactions, convertVESToUSD, convertVESToUSDWithHistoricalRate]);

  // Función para obtener el nombre del cliente
  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : clientId;
  };

  // Usar receivablesWithPayments en vez de receivables
  const filteredReceivables = receivablesWithPayments.filter((receivable) => {
    const clientName = getClientName(receivable.clientId);
    const matchesSearch = receivable.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         receivable.clientId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         clientName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || receivable.status === statusFilter;
    const matchesDate = !dateRange || 
                       new Date(receivable.dueDate).toDateString() === new Date(dateRange).toDateString();
    return matchesSearch && matchesStatus && matchesDate;
  });

  // Calculate totals (all in USD)
  const totalAmount = filteredReceivables.reduce((sum, receivable) => sum + receivable.amount, 0);
  
  // Calculate pending, overdue, and paid amounts (considering actual payments in USD)
  const pendingAmount = filteredReceivables
    .filter(receivable => receivable.status === 'pending')
    .reduce((sum, receivable) => {
      const remainingAmount = Math.max(0, receivable.amount - receivable.totalPaidUSD);
      return sum + remainingAmount;
    }, 0);
  
  const overdueAmount = filteredReceivables
    .filter(receivable => receivable.status === 'overdue')
    .reduce((sum, receivable) => {
      const remainingAmount = Math.max(0, receivable.amount - receivable.totalPaidUSD);
      return sum + remainingAmount;
    }, 0);
  
  const paidAmount = filteredReceivables
    .filter(receivable => receivable.status === 'paid')
    .reduce((sum, receivable) => sum + receivable.totalPaidUSD, 0);

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

  const handleAddReceivable = () => {
    setEditingReceivable(null);
    setIsFormModalOpen(true);
  };

  const handleEditReceivable = (receivable: Receivable) => {
    // Convert from our local format to Supabase format
    const supabaseFormat: SupabaseReceivableType = {
      id: receivable.id,
      client_id: receivable.clientId,
      amount: receivable.amount,
      due_date: receivable.dueDate.toISOString(),
      status: receivable.status,
      description: receivable.description,
      notes: receivable.notes,
      commission: null,
      currency: "USD",
      interest_rate: null,
      installments: null
    };
    setEditingReceivable(supabaseFormat);
    setIsFormModalOpen(true);
  };

  const handleFormClose = () => {
    setIsFormModalOpen(false);
    setEditingReceivable(null);
  };

  const handleFormSuccess = () => {
    // Reload receivables after a successful form submission
    getReceivables().then((data) => {
      setReceivables(
        data.map((r) => ({
          id: r.id,
          clientId: r.client_id,
          amount: r.currency === 'VES' && convertVESToUSD ? 
            convertVESToUSD(r.amount, 'parallel') || r.amount : 
            r.amount, // Convertir a USD si es necesario
          dueDate: new Date(r.due_date),
          status: r.status || 'pending',
          description: r.description || '',
          notes: r.notes || '',
          totalPaid: 0,
          totalPaidUSD: 0,
          payments: []
        }))
      );
    }).catch((err) => {
      console.error("Error al cargar datos de Supabase:", err);
    });
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
            Cuentas por Cobrar
          </h1>
        </div>
        <Button onClick={handleAddReceivable} className="flex items-center gap-2 w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          <span className="sm:hidden">Agregar</span>
          <span className="hidden sm:inline">Agregar Cuenta por Cobrar</span>
        </Button>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total por Cobrar</CardTitle>
            <CardDescription className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">
              {formatCurrency(totalAmount)}
            </CardDescription>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Pendientes</CardTitle>
            <CardDescription className="text-lg sm:text-xl lg:text-2xl font-bold text-yellow-600">
              {formatCurrency(pendingAmount)}
            </CardDescription>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Vencidas</CardTitle>
            <CardDescription className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600">
              {formatCurrency(overdueAmount)}
            </CardDescription>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Pagadas</CardTitle>
            <CardDescription className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">
              {formatCurrency(paidAmount)}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
      
      {/* Main Content */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg sm:text-xl">Listado de Cuentas por Cobrar</CardTitle>
          
          {/* Filters */}
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por descripción o cliente..."
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
                  <SelectItem value="overdue">Vencido</SelectItem>
                  <SelectItem value="paid">Pagado</SelectItem>
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
            <>
              {/* Mobile Cards View */}
              <div className="block lg:hidden space-y-3 p-4">
                {filteredReceivables.length > 0 ? (
                  filteredReceivables.map((receivable) => (
                    <Card key={receivable.id} className="border">
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-sm truncate">{receivable.description}</h3>
                              <p className="text-xs text-muted-foreground">{getClientName(receivable.clientId)}</p>
                            </div>
                            <Badge className={`ml-2 text-xs ${getStatusColor(receivable.status)}`}>
                              {receivable.status === 'pending' ? 'Pendiente' : 
                               receivable.status === 'paid' ? 'Pagado' : 
                               receivable.status === 'overdue' ? 'Vencido' : receivable.status}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <span className="text-muted-foreground">Monto:</span>
                              <p className="font-medium">{formatCurrency(receivable.amount)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Pagado:</span>
                              <p className="font-medium text-green-600">
                                {formatCurrency(receivable.totalPaidUSD)}
                              </p>
                              {receivable.totalPaid !== receivable.totalPaidUSD && (
                                <p className="text-xs text-blue-600">Pagos mixtos</p>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-xs">
                            <span className="text-muted-foreground">Vencimiento:</span>
                            <p className="font-medium">{formatDate(receivable.dueDate)}</p>
                          </div>
                          
                          <div className="flex gap-2 pt-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEditReceivable(receivable)}
                              className="flex-1"
                            >
                              <Pencil className="h-3 w-3 mr-1" />
                              Editar
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              asChild
                              className="flex-1"
                            >
                              <Link to={`/all-receivables/${receivable.id}`}>
                                Ver Detalle
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No se encontraron cuentas por cobrar
                  </div>
                )}
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Monto Total</TableHead>
                      <TableHead>Pagado</TableHead>
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
                              <TableCell>{getClientName(receivable.clientId)}</TableCell>
                              <TableCell>{formatCurrency(receivable.amount)}</TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  {(() => {
                                    const paymentPercentage = receivable.amount > 0 ? (receivable.totalPaidUSD / receivable.amount) * 100 : 0;
                                    let colorClass = "text-red-600"; // Rojo por defecto (0-24%)
                                    
                                    if (paymentPercentage >= 100) {
                                      colorClass = "text-green-600"; // Verde (100%)
                                    } else if (paymentPercentage >= 25) {
                                      colorClass = "text-yellow-600"; // Amarillo (25-99%)
                                    }
                                    
                                    return (
                                      <span className={`font-medium ${colorClass}`}>
                                        {formatCurrency(receivable.totalPaidUSD)}
                                        <span className="text-xs ml-1">
                                          ({paymentPercentage.toFixed(1)}%)
                                        </span>
                                      </span>
                                    );
                                  })()}
                                  {receivable.totalPaidUSD > 0 && receivable.totalPaidUSD < receivable.amount && (
                                    <span className="text-xs text-muted-foreground">
                                      Restante: {formatCurrency(Math.max(0, receivable.amount - receivable.totalPaidUSD))}
                                    </span>
                                  )}
                                  {receivable.totalPaid !== receivable.totalPaidUSD && (
                                    <span className="text-xs text-blue-600">
                                      Pagos mixtos (USD/VES)
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>{formatDate(receivable.dueDate)}</TableCell>
                              <TableCell>
                                <Badge className={getStatusColor(receivable.status)}>
                                  {receivable.status === 'pending' ? 'Pendiente' : receivable.status === 'paid' ? 'Pagado' : receivable.status === 'overdue' ? 'Vencido' : receivable.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right flex items-center justify-end gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    handleEditReceivable(receivable);
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
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
                                          <span className="col-span-1 truncate">{t.clientId ? getClientName(t.clientId) : 'Cliente'}</span>
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
                        <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                          No se encontraron cuentas por cobrar con los filtros aplicados
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {selectedReceivable && (
        <DebtDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={handleCloseModal}
          item={selectedReceivable}
          type="receivable"
        />
      )}

      <ReceivableFormModal
        isOpen={isFormModalOpen}
        onClose={handleFormClose}
        receivable={editingReceivable}
        clients={clients}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
};

export default AllReceivables;
