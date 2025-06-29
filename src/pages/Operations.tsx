import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, RefreshCw } from "lucide-react";
import { TransactionFormOptimized } from "@/components/operations/TransactionFormOptimized";
import { TransactionsList } from "@/components/operations/TransactionsList";
import { TransactionsFilter } from "@/components/operations/TransactionsFilter";
import { useTransactions } from "@/context/TransactionContext";
import { toast } from "@/components/ui/use-toast";

const Operations = () => {
  const [selectedType, setSelectedType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [lastTransactionUpdate, setLastTransactionUpdate] = useState<Date | null>(null);
  
  const { 
    isLoading, 
    onTransactionChange, 
    onBankBalanceChange, 
    refetchTransactions 
  } = useTransactions();

  // Suscribirse a cambios de transacciones para mostrar notificaciones
  useEffect(() => {
    const unsubscribeTransaction = onTransactionChange((transaction, action) => {
      setLastTransactionUpdate(new Date());
      
      if (action === 'created') {
        toast({
          title: "🆕 Nueva transacción detectada",
          description: `Se creó una transacción por ${transaction.currency || 'USD'} ${transaction.amount}`,
        });
      } else if (action === 'updated') {
        toast({
          title: "📝 Transacción actualizada",
          description: "Los datos se han actualizado automáticamente",
        });
      }
    });

    const unsubscribeBalance = onBankBalanceChange((bankAccountId) => {
      console.log(`Balance actualizado para la cuenta: ${bankAccountId}`);
    });

    return () => {
      unsubscribeTransaction();
      unsubscribeBalance();
    };
  }, [onTransactionChange, onBankBalanceChange]);

  const handleTransactionSuccess = () => {
    setIsDialogOpen(false);
    // Las actualizaciones se manejan automáticamente mediante los eventos
  };

  const handleManualRefresh = async () => {
    try {
      await refetchTransactions();
      toast({
        title: "🔄 Datos actualizados",
        description: "Todas las transacciones se han sincronizado",
      });
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "No se pudieron actualizar las transacciones",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Operaciones</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Gestión de transacciones financieras</span>
            {lastTransactionUpdate && (
              <>
                <span>•</span>
                <Badge variant="secondary" className="text-xs">
                  ✨ Actualizado: {lastTransactionUpdate.toLocaleTimeString()}
                </Badge>
              </>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleManualRefresh}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Sincronizar
          </Button>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <PlusCircle className="h-4 w-4" />
                Nueva Transacción
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Crear Nueva Transacción</DialogTitle>
                <DialogDescription>
                  Los datos se actualizarán automáticamente sin recargar la página.
                </DialogDescription>
              </DialogHeader>
              <TransactionFormOptimized 
                onSuccess={handleTransactionSuccess}
                showCancelButton={true}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros de Búsqueda</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionsFilter
            selectedType={selectedType}
            searchQuery={searchQuery}
            selectedPaymentMethod={selectedPaymentMethod}
            setSelectedType={setSelectedType}
            setSearchQuery={setSearchQuery}
            setSelectedPaymentMethod={setSelectedPaymentMethod}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Transacciones</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionsList
            selectedType={selectedType}
            searchQuery={searchQuery}
            selectedPaymentMethod={selectedPaymentMethod}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default Operations;
