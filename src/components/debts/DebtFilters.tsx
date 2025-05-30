import React from 'react';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from "@/components/ui/button";
import { Calendar } from '@/components/ui/calendar';
import { Search, Calendar as CalendarIcon, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DebtFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  dateRange: Date | undefined;
  setDateRange: (date: Date | undefined) => void;
  clearFilters: () => void;
  formatDate: (date: Date) => string;
}

export const DebtFilters: React.FC<DebtFiltersProps> = ({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  dateRange,
  setDateRange,
  clearFilters,
  formatDate
}) => {
  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por acreedor o categoría..."
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
              <CalendarIcon className="mr-2 h-4 w-4" />
              <span className="truncate">
                {dateRange ? formatDate(dateRange) : "Fecha de vencimiento"}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateRange}
              onSelect={setDateRange}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
        
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={clearFilters}
          className="w-full sm:w-auto"
        >
          <Filter className="h-4 w-4" />
          <span className="ml-1">Limpiar Filtros</span>
        </Button>
      </div>
    </div>
  );
};
