
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from 'react-router-dom';
import { ArrowLeft, Search, Calendar, Filter } from 'lucide-react';
import { mockDetailedDebts } from '@/data/mockData';
import { formatCurrency } from '@/lib/utils';
import { DebtDetailsModal } from '@/components/operations/DebtDetailsModal';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';

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
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
              <span className="ml-2">Volver</span>
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Todas las Deudas</h1>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Deudas</CardTitle>
            <CardDescription className="text-2xl font-bold text-red-600">
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
          <CardTitle>Listado de Deudas</CardTitle>
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="relative flex-grow">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por acreedor o categoría..."
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
                <TableHead>Acreedor</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Fecha de Vencimiento</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDebts.length > 0 ? (
                filteredDebts.map((debt) => (
                  <TableRow key={debt.id}>
                    <TableCell className="font-medium">{debt.creditor}</TableCell>
                    <TableCell>{debt.category}</TableCell>
                    <TableCell>{formatCurrency(debt.amount)}</TableCell>
                    <TableCell>{formatDate(debt.dueDate)}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(debt.status)}>
                        {debt.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDebtClick(debt)}
                      >
                        Ver Detalle
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                    No se encontraron deudas con los filtros aplicados
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
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
