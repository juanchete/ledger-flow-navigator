
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
    <div className="flex flex-col sm:flex-row justify-between gap-4 mt-4">
      <Tabs defaultValue="all" value={selectedType} onValueChange={setSelectedType}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="purchase">Purchases</TabsTrigger>
          <TabsTrigger value="sale">Sales</TabsTrigger>
          <TabsTrigger value="expense">Expenses</TabsTrigger>
          <TabsTrigger value="banking">Banking</TabsTrigger>
        </TabsList>
      </Tabs>
      
      <Input 
        placeholder="Search transactions..." 
        className="max-w-[300px]"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
    </div>
  );
};
