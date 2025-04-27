
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { TransactionForm } from "@/components/operations/TransactionForm";
import { TransactionsList } from "@/components/operations/TransactionsList";
import { TransactionsFilter } from "@/components/operations/TransactionsFilter";

const Operations = () => {
  const [selectedType, setSelectedType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  const handleAddTransaction = () => {
    toast.success("Transaction created! This is a mock action in the MVP.");
  };
  
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
          <TransactionsFilter
            selectedType={selectedType}
            setSelectedType={setSelectedType}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        </CardHeader>
        <CardContent>
          <TransactionsList
            selectedType={selectedType}
            searchQuery={searchQuery}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default Operations;
