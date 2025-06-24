import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PlusCircle } from "lucide-react";
import { TransactionFormOptimized } from "@/components/operations/TransactionFormOptimized";
import { TransactionsList } from "@/components/operations/TransactionsList";
import { TransactionsFilter } from "@/components/operations/TransactionsFilter";
import { useTransactions } from "@/context/TransactionContext";

const Operations = () => {
  const [selectedType, setSelectedType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { isLoading } = useTransactions();
  
  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in p-4 sm:p-6">
      <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:justify-between sm:items-center">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Operaciones</h1>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 w-full sm:w-auto min-w-fit">
              <PlusCircle size={18} />
              <span className="hidden sm:inline">Agregar Transacción</span>
              <span className="sm:hidden">Agregar</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] sm:max-h-[80vh] overflow-y-auto mx-4">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">Crear Nueva Transacción</DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                Ingresa los detalles para tu nueva transacción.
              </DialogDescription>
            </DialogHeader>
            
            <TransactionFormOptimized onSuccess={() => setIsDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="space-y-4 sm:space-y-0 sm:flex sm:flex-row sm:justify-between sm:items-center pb-4">
          <CardTitle className="text-lg sm:text-xl">Transacciones</CardTitle>
          <div className="w-full sm:w-auto">
            <TransactionsFilter
              selectedType={selectedType}
              setSelectedType={setSelectedType}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          {isLoading ? (
            <div className="flex items-center justify-center p-8 sm:p-12">
              <div className="text-muted-foreground text-sm sm:text-base">Cargando transacciones...</div>
            </div>
          ) : (
          <div className="w-full overflow-x-auto">
            <TransactionsList
              selectedType={selectedType}
              searchQuery={searchQuery}
            />
          </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Operations;
