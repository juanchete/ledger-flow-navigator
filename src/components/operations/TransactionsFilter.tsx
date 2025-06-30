import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TransactionsFilterProps {
  selectedType: string;
  setSelectedType: (type: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedPaymentMethod: string;
  setSelectedPaymentMethod: (method: string) => void;
}

export const TransactionsFilter = ({ 
  selectedType, 
  setSelectedType, 
  searchQuery, 
  setSearchQuery,
  selectedPaymentMethod,
  setSelectedPaymentMethod
}: TransactionsFilterProps) => {
  const getPaymentMethodLabel = (method: string) => {
    switch(method) {
      case 'cash':
        return 'Efectivo';
      case 'transfer':
        return 'Transferencia';
      case 'credit_card':
        return 'Tarjeta de Crédito';
      case 'other':
        return 'Otro';
      default:
        return method || 'N/A';
    }
  };

  return (
    <div className="space-y-4">
      {/* Tabs de tipo de transacción */}
      <div className="w-full">
        <Tabs defaultValue="all" value={selectedType} onValueChange={setSelectedType}>
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-1 h-auto">
            <TabsTrigger 
              value="all" 
              className="text-xs sm:text-sm px-2 py-2 sm:px-3 whitespace-nowrap"
            >
              Todas
            </TabsTrigger>
            <TabsTrigger 
              value="purchase" 
              className="text-xs sm:text-sm px-2 py-2 sm:px-3 whitespace-nowrap"
            >
              Compras
            </TabsTrigger>
            <TabsTrigger 
              value="sale" 
              className="text-xs sm:text-sm px-2 py-2 sm:px-3 whitespace-nowrap"
            >
              Ventas
            </TabsTrigger>
            <TabsTrigger 
              value="cash" 
              className="text-xs sm:text-sm px-2 py-2 sm:px-3 whitespace-nowrap"
            >
              Efectivo
            </TabsTrigger>
            <TabsTrigger 
              value="expense" 
              className="text-xs sm:text-sm px-2 py-2 sm:px-3 whitespace-nowrap"
            >
              Gastos
            </TabsTrigger>
            <TabsTrigger 
              value="payment" 
              className="text-xs sm:text-sm px-2 py-2 sm:px-3 whitespace-nowrap"
            >
              Pagos
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      {/* Filtros adicionales */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="w-full sm:w-64">
          <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Todos los métodos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los métodos</SelectItem>
              <SelectItem value="cash">💵 Efectivo</SelectItem>
              <SelectItem value="transfer">🏦 Transferencia</SelectItem>
              <SelectItem value="credit_card">💳 Tarjeta de Crédito</SelectItem>
              <SelectItem value="other">📝 Otro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex-1 max-w-sm">
          <Input 
            placeholder="Buscar transacciones..." 
            className="w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};
