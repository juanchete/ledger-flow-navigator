import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, Coins, Clock, PlusCircle, TrendingUp, TrendingDown, Users, Calendar, AlertTriangle, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { BankAccountsModal } from "@/components/BankAccountsModal";
import { DebtsAndReceivables } from "@/components/operations/DebtsAndReceivables";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TransactionFormOptimized } from "@/components/operations/TransactionFormOptimized";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { ExchangeRateDisplay } from "@/components/ExchangeRateDisplay";
import { useDashboardData } from "@/hooks/useDashboardData";
import { NetWorthBreakdown } from "@/components/NetWorthBreakdown";
import { OperationsList } from "@/components/OperationsList";
import { formatCurrency } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";

const Dashboard = () => {
  const {
    transactions,
    clients,
    bankAccounts,
    events,
    debts,
    receivables,
    loading,
    lastUpdate,
    refreshData,
    refreshSpecificData
  } = useDashboardData({
    autoRefresh: false, // Deshabilitar auto-refresh por defecto
    refreshInterval: 5 * 60 * 1000, // 5 minutos si se habilita
    pauseWhenUserActive: true
  });
  
  const [openModal, setOpenModal] = useState<null | 'USD' | 'VES'>(null);
  const [openTransactionModal, setOpenTransactionModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Clientes con alerta
  const alertClients = clients.filter(c => c.alertStatus === 'red' || c.alertStatus === 'yellow');

  // Próximos eventos (requiere eventos cargados)
  const now = new Date();
  const upcomingEvents = events.filter(e => 
    new Date(e.startDate) > now && 
    new Date(e.startDate) < new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  );

  // Cálculos financieros corregidos

  // 1. Cuentas por Cobrar - Solo las pendientes (no pagadas)
  const pendingReceivables = receivables.filter(r => 
    r.status === 'pending' || r.status === 'overdue' || !r.status
  );
  const totalPendingReceivables = pendingReceivables.reduce((sum, r) => sum + Number(r.amount), 0);

  // 2. Deudas - Solo las pendientes (no pagadas)
  const pendingDebts = debts.filter(d => 
    d.status === 'pending' || d.status === 'overdue' || !d.status
  );
  const totalPendingDebts = pendingDebts.reduce((sum, d) => sum + Number(d.amount), 0);

  // 3. Balance por moneda - Total real en cuentas bancarias
  const usdAccounts = bankAccounts.filter(acc => acc.currency === 'USD');
  const vesAccounts = bankAccounts.filter(acc => acc.currency === 'VES');
  const totalUSD = usdAccounts.reduce((sum, acc) => sum + Number(acc.amount), 0);
  const totalVES = vesAccounts.reduce((sum, acc) => sum + Number(acc.amount), 0);

  // 4. Patrimonio Neto - Total en todas las cuentas usando tasas de cambio dinámicas
  const { convertVESToUSD } = useExchangeRates();
  const totalVESInUSD = convertVESToUSD ? convertVESToUSD(totalVES, 'parallel') || 0 : 0;
  const totalNetWorth = totalUSD + totalVESInUSD;
  
  const currentStats = {
    netWorth: totalNetWorth,
    receivables: totalPendingReceivables,
    debts: totalPendingDebts
  };

  // Función para manejar el éxito en crear transacción
  const handleTransactionSuccess = async () => {
    setOpenTransactionModal(false);
    // Actualizar específicamente las transacciones y cuentas bancarias
    await Promise.all([
      refreshSpecificData('transactions'),
      refreshSpecificData('bankAccounts')
    ]);
    
    toast({
      title: "Datos actualizados",
      description: "Los saldos y transacciones se han actualizado automáticamente",
    });
  };

  // Función para refresh manual
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
      toast({
        title: "Datos actualizados",
        description: "Todos los datos del dashboard se han actualizado correctamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Hubo un problema al actualizar los datos",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Formatear última actualización
  const formatLastUpdate = (timestamp: number) => {
    const now = Date.now();
    const diffInMinutes = Math.floor((now - timestamp) / (1000 * 60));
    
    if (diffInMinutes === 0) return 'Ahora mismo';
    if (diffInMinutes === 1) return 'Hace 1 minuto';
    if (diffInMinutes < 60) return `Hace ${diffInMinutes} minutos`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours === 1) return 'Hace 1 hora';
    if (diffInHours < 24) return `Hace ${diffInHours} horas`;
    
    return 'Hace más de 24 horas';
  };

  if (loading) {
    return (
      <div className="space-y-4 md:space-y-6 animate-fade-in">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Clock className="mx-auto h-12 w-12 mb-4 opacity-50 animate-spin" />
            <p className="text-muted-foreground">Cargando dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Header responsive con información de actualización */}
      <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            Resumen financiero y operativo
            <span className="text-xs">• Última actualización: {formatLastUpdate(lastUpdate)}</span>
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="w-full sm:w-auto"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Actualizando...' : 'Actualizar'}
          </Button>
          <Dialog open={openTransactionModal} onOpenChange={setOpenTransactionModal}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <PlusCircle className="mr-2 h-4 w-4" />
                Nueva Transacción
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Crear Nueva Transacción</DialogTitle>
                <DialogDescription>
                  Registra una nueva operación financiera en el sistema.
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
      
      {/* Patrimonio Neto Principal - Ancho completo */}
      <NetWorthBreakdown 
        bankAccounts={bankAccounts}
        totalUSD={totalUSD}
        totalVES={totalVES}
        netWorth={currentStats.netWorth}
        pendingReceivables={totalPendingReceivables}
        pendingDebts={totalPendingDebts}
        isFullWidth={true}
      />
      
      {/* Lista de Operaciones Scrolleable */}
      <OperationsList 
        transactions={transactions}
        clients={clients}
        onRefresh={refreshData}
        lastUpdate={lastUpdate}
      />
      
      <DebtsAndReceivables />
      
      <BankAccountsModal 
        isOpen={openModal === 'USD'} 
        onClose={() => setOpenModal(null)} 
        currency="USD" 
        accounts={usdAccounts} 
      />
      
      <BankAccountsModal 
        isOpen={openModal === 'VES'} 
        onClose={() => setOpenModal(null)} 
        currency="VES" 
        accounts={vesAccounts} 
      />
    </div>
  );
};
export default Dashboard;