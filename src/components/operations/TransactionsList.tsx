
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockTransactions, mockClients } from "@/data/mockData";

interface TransactionsListProps {
  selectedType: string;
  searchQuery: string;
}

export const TransactionsList = ({ selectedType, searchQuery }: TransactionsListProps) => {
  const filteredTransactions = mockTransactions.filter((transaction) => {
    const matchesType = selectedType === "all" || transaction.type === selectedType;
    const matchesSearch = transaction.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getBadgeColor = (transactionType: string) => {
    switch(transactionType) {
      case 'purchase':
        return 'bg-finance-red-light text-white';
      case 'sale':
        return 'bg-finance-green text-white';
      case 'banking':
        return 'bg-finance-blue text-white';
      case 'balance-change':
        return 'bg-finance-yellow text-finance-gray-dark';
      case 'expense':
        return 'bg-finance-gray text-white';
      default:
        return '';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch(status) {
      case 'completed':
        return 'bg-finance-green text-white';
      case 'pending':
        return 'bg-finance-yellow text-finance-gray-dark';
      case 'cancelled':
        return 'bg-finance-red text-white';
      default:
        return '';
    }
  };

  return (
    <div className="rounded-md border">
      <div className="grid grid-cols-1 md:grid-cols-12 p-4 bg-muted/50">
        <div className="hidden md:block md:col-span-1 font-medium">Type</div>
        <div className="hidden md:block md:col-span-4 font-medium">Description</div>
        <div className="hidden md:block md:col-span-2 font-medium">Date</div>
        <div className="hidden md:block md:col-span-2 font-medium">Amount</div>
        <div className="hidden md:block md:col-span-2 font-medium">Status</div>
        <div className="hidden md:block md:col-span-1 font-medium text-right">Actions</div>
      </div>
      
      <div className="divide-y">
        {filteredTransactions.length > 0 ? (
          filteredTransactions.map((transaction) => {
            const client = transaction.clientId ? 
              mockClients.find(c => c.id === transaction.clientId) : null;
            
            return (
              <div key={transaction.id} className="grid grid-cols-1 md:grid-cols-12 p-4 items-center">
                <div className="md:col-span-1 mb-2 md:mb-0">
                  <Badge className={getBadgeColor(transaction.type)}>
                    {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                  </Badge>
                </div>
                
                <div className="md:col-span-4 mb-2 md:mb-0">
                  <div className="font-medium">{transaction.description}</div>
                  {client && (
                    <div className="text-sm text-muted-foreground">
                      Client: {client.name}
                    </div>
                  )}
                </div>
                
                <div className="md:col-span-2 text-sm mb-2 md:mb-0">
                  {format(new Date(transaction.date), 'MMM d, yyyy')}
                </div>
                
                <div className="md:col-span-2 font-medium mb-2 md:mb-0">
                  {formatCurrency(transaction.amount)}
                </div>
                
                <div className="md:col-span-2 mb-2 md:mb-0">
                  <Badge className={getStatusBadgeColor(transaction.status)}>
                    {transaction.status}
                  </Badge>
                </div>
                
                <div className="md:col-span-1 flex justify-end">
                  <Button size="sm" variant="ghost">View</Button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-4 text-center text-muted-foreground">
            No transactions found.
          </div>
        )}
      </div>
    </div>
  );
};
