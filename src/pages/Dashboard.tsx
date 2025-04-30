import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { mockTransactions, mockClients, mockFinancialStats, mockExpenseStats, mockCalendarEvents } from "@/data/mockData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Calendar, 
  File, 
  Users,
  Wallet,
  ArrowUp,
  ArrowDown,
  CircleAlert,
  PieChart,
  DollarSign,
  Coins,
  Receipt,
  Clock,
  PlusCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { useState } from "react";
import { BankAccountsModal } from "@/components/BankAccountsModal";
import { DebtsAndReceivables } from "@/components/operations/DebtsAndReceivables";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TransactionForm } from "@/components/operations/TransactionForm";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);
};

const mockUSDAccounts = [
  { id: "1", bank: "Bank of America", accountNumber: "****1234", amount: 50000, currency: "USD" },
  { id: "2", bank: "Chase", accountNumber: "****5678", amount: 25420.50, currency: "USD" },
] as const;

const mockVESAccounts = [
  { id: "3", bank: "Banco Mercantil", accountNumber: "****9012", amount: 2425750.00, currency: "VES" },
  { id: "4", bank: "Banesco", accountNumber: "****3456", amount: 1000000.00, currency: "VES" },
] as const;

const Dashboard = () => {
  const [openModal, setOpenModal] = useState<null | 'USD' | 'VES'>(null);
  const [openTransactionModal, setOpenTransactionModal] = useState(false);

  const currentStats = mockFinancialStats[mockFinancialStats.length - 1];
  const previousStats = mockFinancialStats[mockFinancialStats.length - 2];
  
  const netWorthChange = currentStats.netWorth - previousStats.netWorth;
  const netWorthPercentChange = (netWorthChange / previousStats.netWorth * 100).toFixed(1);
  
  const receivablesChange = currentStats.receivables - previousStats.receivables;
  const receivablesPercentChange = (receivablesChange / previousStats.receivables * 100).toFixed(1);
  
  const debtsChange = currentStats.debts - previousStats.debts;
  const debtsPercentChange = (debtsChange / previousStats.debts * 100).toFixed(1);

  const upcomingEvents = mockCalendarEvents.filter(e => 
    new Date(e.startDate) > new Date() && 
    new Date(e.startDate) < new Date(new Date().setDate(new Date().getDate() + 7))
  ).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  const alertClients = mockClients.filter(c => c.alertStatus === 'red' || c.alertStatus === 'yellow');
  
  const formatDateForChart = (date: Date) => format(new Date(date), 'MMM d');
  
  const chartData = mockFinancialStats.map(stat => ({
    date: formatDateForChart(stat.date),
    netWorth: stat.netWorth,
    receivables: stat.receivables,
    debts: stat.debts
  }));
  

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Panel</h1>
        <div className="hidden md:flex items-center gap-2">
          <Dialog open={openTransactionModal} onOpenChange={setOpenTransactionModal}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <PlusCircle size={18} />
                Nueva Transacción
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Crear Nueva Transacción</DialogTitle>
                <DialogDescription>
                  Ingresa los detalles para tu nueva transacción.
                </DialogDescription>
              </DialogHeader>
              <TransactionForm />
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenTransactionModal(false)}>Cancelar</Button>
                <Button onClick={() => setOpenTransactionModal(false)}>Crear Transacción</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button asChild variant="outline" size="sm">
            <Link to="/historical-balance">
              <Clock className="mr-2 h-4 w-4" />
              Balance Histórico
            </Link>
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Patrimonio Neto</CardTitle>
            <CardDescription className="text-2xl font-bold">{formatCurrency(currentStats.netWorth)}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-xs">
              <span className={`inline-flex items-center ${netWorthChange >= 0 ? 'text-finance-green' : 'text-finance-red'}`}>
                {netWorthChange >= 0 ? <ArrowUp size={14} className="mr-1" /> : <ArrowDown size={14} className="mr-1" />}
                {Math.abs(Number(netWorthPercentChange))}%
              </span>
              <span className="text-muted-foreground ml-2">vs mes anterior</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cuentas por Cobrar</CardTitle>
            <CardDescription className="text-2xl font-bold">{formatCurrency(currentStats.receivables)}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-xs">
              <span className={`inline-flex items-center ${receivablesChange >= 0 ? 'text-finance-green' : 'text-finance-red'}`}>
                {receivablesChange >= 0 ? <ArrowUp size={14} className="mr-1" /> : <ArrowDown size={14} className="mr-1" />}
                {Math.abs(Number(receivablesPercentChange))}%
              </span>
              <span className="text-muted-foreground ml-2">vs mes anterior</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Deudas</CardTitle>
            <CardDescription className="text-2xl font-bold">{formatCurrency(currentStats.debts)}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-xs">
              <span className={`inline-flex items-center ${debtsChange <= 0 ? 'text-finance-green' : 'text-finance-red'}`}>
                {debtsChange <= 0 ? <ArrowDown size={14} className="mr-1" /> : <ArrowUp size={14} className="mr-1" />}
                {Math.abs(Number(debtsPercentChange))}%
              </span>
              <span className="text-muted-foreground ml-2">vs mes anterior</span>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Disponible en USD</CardTitle>
            <CardDescription className="text-2xl font-bold">
              {formatCurrency(mockUSDAccounts.reduce((sum, acc) => sum + acc.amount, 0))}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center">
                <DollarSign size={16} className="mr-2 text-finance-blue" />
                <span>Balance total en dólares</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => setOpenModal('USD')}>
                Ver detalles
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Disponible en VES</CardTitle>
            <CardDescription className="text-2xl font-bold">
              Bs. {new Intl.NumberFormat('es-VE').format(mockVESAccounts.reduce((sum, acc) => sum + acc.amount, 0))}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center">
                <Coins size={16} className="mr-2 text-finance-green" />
                <span>Balance total en bolívares</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => setOpenModal('VES')}>
                Ver detalles
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
        <DebtsAndReceivables />
      
      <BankAccountsModal
        isOpen={openModal === 'USD'}
        onClose={() => setOpenModal(null)}
        currency="USD"
        accounts={[...mockUSDAccounts]}
      />
      
      <BankAccountsModal
        isOpen={openModal === 'VES'}
        onClose={() => setOpenModal(null)}
        currency="VES"
        accounts={[...mockVESAccounts]}
      />
    </div>
  );
};

export default Dashboard;
