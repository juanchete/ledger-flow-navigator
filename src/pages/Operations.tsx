import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { mockTransactions, mockClients } from "@/data/mockData";
import { format } from "date-fns";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { PlusCircle } from "lucide-react";
import { TransactionForm } from "@/components/operations/TransactionForm";

const Operations = () => {
  const [selectedType, setSelectedType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
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
  
  const handleAddTransaction = () => {
    toast.success("Transaction created! This is a mock action in the MVP.");
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

  const transactionTypeOptions = [
    { value: 'purchase', label: 'Purchase' },
    { value: 'sale', label: 'Sale' },
    { value: 'banking', label: 'Banking' },
    { value: 'balance-change', label: 'Balance Change' },
    { value: 'expense', label: 'Expense' },
  ];
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Operations</h1>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <PlusCircle size={18} />
              Add Transaction
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Transaction</DialogTitle>
              <DialogDescription>
                Enter the details for your new transaction.
              </DialogDescription>
            </DialogHeader>
            
            <TransactionForm />
            
            <DialogFooter>
              <Button variant="outline">Cancel</Button>
              <Button onClick={handleAddTransaction}>Create Transaction</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
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
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
};

export default Operations;
