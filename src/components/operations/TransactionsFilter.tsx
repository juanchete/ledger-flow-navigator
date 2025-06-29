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
    <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:justify-between sm:items-center gap-0 sm:gap-4">
      <div className="w-full sm:w-auto">
        <Tabs defaultValue="all" value={selectedType} onValueChange={setSelectedType}>
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 gap-1">
            <TabsTrigger value="all" className="text-xs sm:text-sm px-2 sm:px-3">Todas</TabsTrigger>
            <TabsTrigger value="purchase" className="text-xs sm:text-sm px-2 sm:px-3">Compras</TabsTrigger>
            <TabsTrigger value="sale" className="text-xs sm:text-sm px-2 sm:px-3">Ventas</TabsTrigger>
            <TabsTrigger value="cash" className="text-xs sm:text-sm px-2 sm:px-3">Efectivo</TabsTrigger>
            <TabsTrigger value="expense" className="text-xs sm:text-sm px-2 sm:px-3">Gastos</TabsTrigger>
            <TabsTrigger value="payment" className="text-xs sm:text-sm px-2 sm:px-3">Pagos</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:gap-3 w-full sm:w-auto">
        <div className="w-full sm:w-[200px]">
          <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Método de Pago" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los métodos</SelectItem>
              <SelectItem value="cash">Efectivo</SelectItem>
              <SelectItem value="transfer">Transferencia</SelectItem>
              <SelectItem value="credit_card">Tarjeta de Crédito</SelectItem>
              <SelectItem value="other">Otro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="w-full sm:w-auto sm:max-w-[300px]">
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
