import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUp, ArrowDown, DollarSign, Coins, Clock, PlusCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { BankAccountsModal } from "@/components/BankAccountsModal";
import { DebtsAndReceivables } from "@/components/operations/DebtsAndReceivables";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TransactionFormOptimized } from "@/components/operations/TransactionFormOptimized";
import { getTransactions } from "@/integrations/supabase/transactionService";
import { getClients } from "@/integrations/supabase/clientService";
import { getDebts } from "@/integrations/supabase/debtService";
import { getReceivables } from "@/integrations/supabase/receivableService";
import { getBankAccounts, BankAccount } from "@/integrations/supabase/bankAccountService";
import { getCalendarEvents, CalendarEvent } from "@/integrations/supabase/calendarEventService";
import { Transaction as SupabaseTransaction } from "@/integrations/supabase/transactionService";
import { Tables as SupabaseClient } from "@/integrations/supabase/types";
import { Debt } from "@/integrations/supabase/debtService";
import { Receivable } from "@/integrations/supabase/receivableService";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { ExchangeRateDisplay } from "@/components/ExchangeRateDisplay";

// Defino el tipo para la UI
interface BankAccountUI {
  id: string;
  bank: string;
  accountNumber: string;
  amount: number;
  currency: "USD" | "VES";
}

// Tipos para la UI
interface TransactionUI {
  id: string;
  type: string;
  amount: number;
  description?: string;
  date: Date;
  clientId?: string;
  status?: string;
  receipt?: string;
  invoice?: string;
  deliveryNote?: string;
  paymentMethod?: string;
  category?: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
  indirectForClientId?: string;
  debtId?: string;
  receivableId?: string;
}
interface ClientUI {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  category?: string;
  clientType?: string;
  active: boolean;
  address?: string;
  contactPerson?: string;
  createdAt?: Date;
  updatedAt?: Date;
  alertStatus?: string;
  alertNote?: string;
  relatedToClientId?: string;
}
interface DebtUI {
  id: string;
  creditor: string;
  amount: number;
  dueDate: Date;
  status?: string;
  category?: string;
  notes?: string;
  clientId?: string;
  interestRate?: number;
  commission?: number;
  currency?: string;
}
interface ReceivableUI {
  id: string;
  clientId: string;
  amount: number;
  dueDate: Date;
  status?: string;
  description?: string;
  notes?: string;
  interestRate?: number;
  commission?: number;
  currency?: string;
}
interface CalendarEventUI {
  id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  category?: string;
  clientId?: string;
  isReminder: boolean;
  completed: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);
};
const Dashboard = () => {
  const [transactions, setTransactions] = useState<TransactionUI[]>([]);
  const [clients, setClients] = useState<ClientUI[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountUI[]>([]);
  const [events, setEvents] = useState<CalendarEventUI[]>([]);
  const [debts, setDebts] = useState<DebtUI[]>([]);
  const [receivables, setReceivables] = useState<ReceivableUI[]>([]);
  const [openModal, setOpenModal] = useState<null | 'USD' | 'VES'>(null);
  const [openTransactionModal, setOpenTransactionModal] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const [txs, cls, dbts, recs, bks, evs] = await Promise.all([getTransactions(), getClients(), getDebts(), getReceivables(), getBankAccounts(), getCalendarEvents()]);
      setTransactions(txs.map(t => ({
        id: t.id,
        type: t.type || '',
        amount: t.amount,
        description: t.description || '',
        date: t.date ? new Date(t.date) : new Date(),
        clientId: t.client_id || undefined,
        status: t.status || undefined,
        receipt: t.receipt || undefined,
        invoice: t.invoice || undefined,
        deliveryNote: t.delivery_note || undefined,
        paymentMethod: t.payment_method || undefined,
        category: t.category || undefined,
        notes: t.notes || undefined,
        createdAt: t.created_at ? new Date(t.created_at) : undefined,
        updatedAt: t.updated_at ? new Date(t.updated_at) : undefined,
        indirectForClientId: t.indirect_for_client_id || undefined,
        debtId: t.debt_id || undefined,
        receivableId: t.receivable_id || undefined
      })));
      setClients(cls.map(c => ({
        id: c.id,
        name: c.name,
        email: c.email || undefined,
        phone: c.phone || undefined,
        category: c.category || undefined,
        clientType: c.client_type || undefined,
        active: c.active,
        address: c.address || undefined,
        contactPerson: c.contact_person || undefined,
        createdAt: c.created_at ? new Date(c.created_at) : undefined,
        updatedAt: c.updated_at ? new Date(c.updated_at) : undefined,
        alertStatus: c.alert_status || undefined,
        alertNote: c.alert_note || undefined,
        relatedToClientId: c.related_to_client_id || undefined
      })));
      setDebts(dbts.map(d => ({
        id: d.id,
        creditor: d.creditor,
        amount: d.amount,
        dueDate: d.due_date ? new Date(d.due_date) : new Date(),
        status: d.status || undefined,
        category: d.category || undefined,
        notes: d.notes || undefined,
        clientId: d.client_id || undefined,
        interestRate: d.interest_rate || undefined,
        commission: d.commission || undefined,
        currency: d.currency || undefined
      })));
      setReceivables(recs.map(r => ({
        id: r.id,
        clientId: r.client_id,
        amount: r.amount,
        dueDate: r.due_date ? new Date(r.due_date) : new Date(),
        status: r.status || undefined,
        description: r.description || undefined,
        notes: r.notes || undefined,
        interestRate: r.interest_rate || undefined,
        commission: r.commission || undefined,
        currency: r.currency || undefined
      })));
      setBankAccounts(bks.map(acc => ({
        id: acc.id,
        bank: acc.bank,
        accountNumber: acc.account_number,
        amount: acc.amount,
        currency: acc.currency === 'USD' ? 'USD' : 'VES'
      })));
      setEvents(evs.map(e => ({
        id: e.id,
        title: e.title,
        description: e.description || undefined,
        startDate: e.start_date ? new Date(e.start_date) : new Date(),
        endDate: e.end_date ? new Date(e.end_date) : new Date(),
        category: e.category || undefined,
        clientId: e.client_id || undefined,
        isReminder: e.is_reminder,
        completed: e.completed,
        createdAt: e.created_at ? new Date(e.created_at) : undefined,
        updatedAt: e.updated_at ? new Date(e.updated_at) : undefined
      })));
      setLoading(false);
    };
    fetchAll();
  }, []);

  // Clientes con alerta
  const alertClients = clients.filter(c => c.alertStatus === 'red' || c.alertStatus === 'yellow');

  // Próximos eventos (requiere eventos cargados)
  const now = new Date();
  const upcomingEvents = events.filter(e => new Date(e.startDate) > now && new Date(e.startDate) < new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000));

  // Cálculos financieros corregidos

  // 1. Cuentas por Cobrar - Solo las pendientes (no pagadas)
  const pendingReceivables = receivables.filter(r => r.status === 'pending' || r.status === 'overdue' || !r.status);
  const totalPendingReceivables = pendingReceivables.reduce((sum, r) => sum + Number(r.amount), 0);

  // 2. Deudas - Solo las pendientes (no pagadas)
  const pendingDebts = debts.filter(d => d.status === 'pending' || d.status === 'overdue' || !d.status);
  const totalPendingDebts = pendingDebts.reduce((sum, d) => sum + Number(d.amount), 0);

  // 3. Balance por moneda - Total real en cuentas bancarias
  const usdAccounts = bankAccounts.filter(acc => acc.currency === 'USD');
  const vesAccounts = bankAccounts.filter(acc => acc.currency === 'VES');
  const totalUSD = usdAccounts.reduce((sum, acc) => sum + Number(acc.amount), 0);
  const totalVES = vesAccounts.reduce((sum, acc) => sum + Number(acc.amount), 0);

  // 4. Patrimonio Neto - Total en todas las cuentas usando tasas de cambio dinámicas
  const {
    rates: exchangeRates,
    convertVESToUSD
  } = useExchangeRates();
  const totalVESInUSD = convertVESToUSD ? convertVESToUSD(totalVES, 'parallel') || 0 : 0;
  const totalNetWorth = totalUSD + totalVESInUSD;
  const currentStats = {
    netWorth: totalNetWorth,
    receivables: totalPendingReceivables,
    debts: totalPendingDebts
  };
  const formatDateForChart = (date: Date) => format(new Date(date), 'MMM d');
  const chartData = {
    date: formatDateForChart(new Date()),
    netWorth: currentStats.netWorth,
    receivables: currentStats.receivables,
    debts: currentStats.debts
  };
  return <div className="space-y-6 animate-fade-in">
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
                  Ingresa los detalles para tu nueva transacción.ss
                </DialogDescription>
              </DialogHeader>
              <TransactionFormOptimized onSuccess={() => setOpenTransactionModal(false)} showCancelButton={true} />
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
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Total en todas las cuentas
              </span>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">USD: {formatCurrency(totalUSD)}</div>
                <div className="text-xs text-muted-foreground">VES: Bs. {new Intl.NumberFormat('es-VE').format(totalVES)}</div>
                {exchangeRates && <div className="text-xs text-muted-foreground mt-1">
                    Tasa: Bs. {exchangeRates.usd_to_ves_parallel.toFixed(2)}/USD
                  </div>}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cuentas por Cobrar Pendientes</CardTitle>
            <CardDescription className="text-2xl font-bold">{formatCurrency(currentStats.receivables)}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {pendingReceivables.length} cuenta{pendingReceivables.length !== 1 ? 's' : ''} pendiente{pendingReceivables.length !== 1 ? 's' : ''}
              </span>
              <Button variant="ghost" size="sm" asChild className="h-6 px-2 text-xs">
                <Link to="/all-receivables">Ver todas</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Deudas Pendientes</CardTitle>
            <CardDescription className="text-2xl font-bold">{formatCurrency(currentStats.debts)}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {pendingDebts.length} deuda{pendingDebts.length !== 1 ? 's' : ''} pendiente{pendingDebts.length !== 1 ? 's' : ''}
              </span>
              <Button variant="ghost" size="sm" asChild className="h-6 px-2 text-xs">
                <Link to="/all-debts">Ver todas</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      
        <DebtsAndReceivables />
      
      <BankAccountsModal isOpen={openModal === 'USD'} onClose={() => setOpenModal(null)} currency="USD" accounts={usdAccounts} />
      
      <BankAccountsModal isOpen={openModal === 'VES'} onClose={() => setOpenModal(null)} currency="VES" accounts={vesAccounts} />
    </div>;
};
export default Dashboard;