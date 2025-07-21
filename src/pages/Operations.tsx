import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, RefreshCw, Sparkles } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { TransactionFormOptimized } from "@/components/operations/TransactionFormOptimized";
import { TransactionsList } from "@/components/operations/TransactionsList";
import { TransactionsFilter } from "@/components/operations/TransactionsFilter";
import { TransactionWizard } from "@/components/wizard";
import { TransactionWizardData } from "@/types/wizard";
import { createTransaction } from "@/integrations/supabase/transactionService";
import { createTransactionWithDebtReceivable } from "@/integrations/supabase/transactionWithDebtReceivableService";
import { useTransactions } from "@/context/TransactionContext";
import { toast } from "@/components/ui/use-toast";
const Operations = () => {
  const [selectedType, setSelectedType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
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
          description: `Se creó una transacción por ${transaction.currency || 'USD'} ${transaction.amount}`
        });
      } else if (action === 'updated') {
        toast({
          title: "📝 Transacción actualizada",
          description: "Los datos se han actualizado automáticamente"
        });
      }
    });
    const unsubscribeBalance = onBankBalanceChange(bankAccountId => {
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
        description: "Todas las transacciones se han sincronizado"
      });
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "No se pudieron actualizar las transacciones",
        variant: "destructive"
      });
    }
  };
  const handleWizardComplete = async (wizardData: TransactionWizardData) => {
    try {
      // Transformar los datos del wizard al formato de la API
      const now = new Date().toISOString();
      const transactionData = {
        id: uuidv4(),
        created_at: now,
        updated_at: now,
        type: wizardData.transactionType,
        amount: parseFloat(wizardData.amount || '0'),
        currency: wizardData.currency,
        date: wizardData.date || new Date().toISOString().split('T')[0],
        description: wizardData.description || wizardData.reference || '',
        category: wizardData.category || undefined,
        payment_method: wizardData.paymentMethod || 'transfer',
        bank_account_id: wizardData.bankAccountId || undefined,
        destination_bank_account_id: wizardData.destinationBankAccountId || undefined,
        client_id: wizardData.clientId || undefined,
        debt_id: wizardData.relatedType === 'debt' ? wizardData.relatedId : undefined,
        receivable_id: wizardData.relatedType === 'receivable' ? wizardData.relatedId : undefined,
        notes: wizardData.notes || undefined,
        denominations: wizardData.denominations || undefined,
        bank_commission: wizardData.bankCommission ? parseFloat(wizardData.bankCommission) : undefined,
        transfer_count: wizardData.transferCount ? parseInt(wizardData.transferCount) : undefined
      };

      // Check if we should auto-create debt/receivable
      if (wizardData.autoCreateDebtReceivable && wizardData.debtReceivableDueDate) {
        await createTransactionWithDebtReceivable({
          transaction: transactionData,
          createDebtReceivable: true,
          debtReceivableData: {
            dueDate: wizardData.debtReceivableDueDate,
            interestRate: parseFloat(wizardData.debtReceivableInterestRate || '0'),
            notes: wizardData.debtReceivableNotes || ''
          }
        });
        const debtReceivableType = ['purchase', 'expense'].includes(wizardData.transactionType || '') ? 'deuda' : 'cuenta por cobrar';
        toast({
          title: "✅ Transacción y " + debtReceivableType + " creadas exitosamente",
          description: `Se registró la ${wizardData.transactionType} por ${wizardData.currency} ${wizardData.amount} y se creó la ${debtReceivableType} asociada`
        });
      } else {
        await createTransaction(transactionData);
        toast({
          title: "✅ Transacción creada exitosamente",
          description: `Se registró la ${wizardData.transactionType} por ${wizardData.currency} ${wizardData.amount}`
        });
      }
      setIsWizardOpen(false);
    } catch (error) {
      console.error('Error creating transaction:', error);
      toast({
        title: "❌ Error",
        description: "No se pudo crear la transacción. Por favor, intenta de nuevo.",
        variant: "destructive"
      });
      throw error; // Re-throw para que el wizard pueda manejar el error
    }
  };
  return <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Operaciones</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Gestión de transacciones financieras</span>
            {lastTransactionUpdate && <>
                <span>•</span>
                <Badge variant="secondary" className="text-xs">
                  ✨ Actualizado: {lastTransactionUpdate.toLocaleTimeString()}
                </Badge>
              </>}
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleManualRefresh} disabled={isLoading} className="gap-2 flex-shrink-0">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sincronizar</span>
            <span className="sm:hidden">Sync</span>
          </Button>
          
          {/* Nuevo Transaction Wizard */}
          
          
          {/* Formulario tradicional */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 flex-shrink-0">
                <PlusCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Formulario Clásico</span>
                <span className="sm:hidden">Clásico</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Crear Nueva Transacción</DialogTitle>
                <DialogDescription>
                  Los datos se actualizarán automáticamente sin recargar la página.
                </DialogDescription>
              </DialogHeader>
              <TransactionFormOptimized onSuccess={handleTransactionSuccess} showCancelButton={true} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros de Búsqueda</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionsFilter selectedType={selectedType} searchQuery={searchQuery} selectedPaymentMethod={selectedPaymentMethod} setSelectedType={setSelectedType} setSearchQuery={setSearchQuery} setSelectedPaymentMethod={setSelectedPaymentMethod} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Transacciones</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionsList selectedType={selectedType} searchQuery={searchQuery} selectedPaymentMethod={selectedPaymentMethod} />
        </CardContent>
      </Card>

      {/* Transaction Wizard */}
      <TransactionWizard isOpen={isWizardOpen} onClose={() => setIsWizardOpen(false)} onComplete={handleWizardComplete} />
    </div>;
};
export default Operations;