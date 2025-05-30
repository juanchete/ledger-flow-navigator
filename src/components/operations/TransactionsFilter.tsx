import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TransactionsFilterProps {
  selectedType: string;
  setSelectedType: (type: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const TransactionsFilter = ({ 
  selectedType, 
  setSelectedType, 
  searchQuery, 
  setSearchQuery 
}: TransactionsFilterProps) => {
  return (
    <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:justify-between sm:items-center gap-0 sm:gap-4">
      <div className="w-full sm:w-auto">
        <Tabs defaultValue="all" value={selectedType} onValueChange={setSelectedType}>
          <TabsList className="grid w-full grid-cols-5 sm:w-auto sm:flex">
            <TabsTrigger value="all" className="text-xs sm:text-sm px-2 sm:px-3">Todo</TabsTrigger>
            <TabsTrigger value="purchase" className="text-xs sm:text-sm px-2 sm:px-3">Compras</TabsTrigger>
            <TabsTrigger value="sale" className="text-xs sm:text-sm px-2 sm:px-3">Ventas</TabsTrigger>
            <TabsTrigger value="expense" className="text-xs sm:text-sm px-2 sm:px-3">Gastos</TabsTrigger>
            <TabsTrigger value="banking" className="text-xs sm:text-sm px-2 sm:px-3">Banco</TabsTrigger>
          </TabsList>
        </Tabs>
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
  );
};
