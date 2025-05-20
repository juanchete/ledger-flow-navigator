import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PlusCircle } from "lucide-react";
import { TransactionForm } from "@/components/operations/TransactionForm";
import { TransactionsList } from "@/components/operations/TransactionsList";
import { TransactionsFilter } from "@/components/operations/TransactionsFilter";
import { useTransactions } from "@/context/TransactionContext";

const Operations = () => {
  const [selectedType, setSelectedType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { isLoading } = useTransactions();
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Operaciones</h1>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <PlusCircle size={18} />
              Agregar Transacción
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crear Nueva Transacción</DialogTitle>
              <DialogDescription>
                Ingresa los detalles para tu nueva transacción.
              </DialogDescription>
            </DialogHeader>
            
            <TransactionForm />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transacciones</CardTitle>
          <TransactionsFilter
            selectedType={selectedType}
            setSelectedType={setSelectedType}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-muted-foreground">Cargando transacciones...</div>
            </div>
          ) : (
          <TransactionsList
            selectedType={selectedType}
            searchQuery={searchQuery}
          />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Operations;
