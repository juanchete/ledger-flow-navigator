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

  // 5. Operaciones del día actual
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const todayTransactions = transactions.filter(transaction => {
    const transactionDate = new Date(transaction.date);
    return transactionDate >= today && transactionDate < tomorrow;
  });

  const getClientName = (clientId: string | undefined) => {
    if (!clientId) return 'N/A';
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : 'Cliente no encontrado';
  };

  const formatDateForChart = (date: Date) => format(new Date(date), 'MMM d');
  const chartData = {
    date: formatDateForChart(new Date()),
    netWorth: currentStats.netWorth,
    receivables: currentStats.receivables,
    debts: currentStats.debts
  };
  return <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Header responsive */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Panel</h1>
        
        {/* Botones siempre visibles en móvil y desktop */}
        <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-2">
          <Dialog open={openTransactionModal} onOpenChange={setOpenTransactionModal}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 w-full sm:w-auto">
                <PlusCircle size={18} />
                <span className="hidden xs:inline">Nueva Transacción</span>
                <span className="xs:hidden">Nueva</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-md mx-4 sm:mx-auto max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Crear Nueva Transacción</DialogTitle>
                <DialogDescription>
                  Ingresa los detalles para tu nueva transacción.
                </DialogDescription>
              </DialogHeader>
              <TransactionFormOptimized onSuccess={() => setOpenTransactionModal(false)} showCancelButton={true} />
            </DialogContent>
          </Dialog>
          <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
            <Link to="/historical-balance">
              <Clock className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Balance Histórico</span>
              <span className="sm:hidden">Balance</span>
            </Link>
          </Button>
        </div>
      </div>
      
      {/* Métricas principales - responsive grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 w-full max-w-full">
        <Card className="col-span-1 sm:col-span-2 lg:col-span-1 min-w-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Patrimonio Neto</CardTitle>
            <CardDescription className="text-xl md:text-2xl font-bold">{formatCurrency(currentStats.netWorth)}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-1 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 text-xs">
              <span className="text-muted-foreground">
                Total en todas las cuentas
              </span>
              <div className="text-left sm:text-right space-y-0.5">
                <div className="text-xs text-muted-foreground">USD: {formatCurrency(totalUSD)}</div>
                <div className="text-xs text-muted-foreground">VES: Bs. {new Intl.NumberFormat('es-VE').format(totalVES)}</div>
                {exchangeRates && <div className="text-xs text-muted-foreground">
                    Tasa: Bs. {exchangeRates.usd_to_ves_parallel.toFixed(2)}/USD
                  </div>}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="min-w-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cuentas por Cobrar</CardTitle>
            <CardDescription className="text-xl md:text-2xl font-bold">{formatCurrency(currentStats.receivables)}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 text-xs">
              <span className="text-muted-foreground">
                {pendingReceivables.length} cuenta{pendingReceivables.length !== 1 ? 's' : ''} pendiente{pendingReceivables.length !== 1 ? 's' : ''}
              </span>
              <Button variant="ghost" size="sm" asChild className="h-6 px-2 text-xs w-fit">
                <Link to="/all-receivables">Ver todas</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card className="min-w-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Deudas Pendientes</CardTitle>
            <CardDescription className="text-xl md:text-2xl font-bold">{formatCurrency(currentStats.debts)}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 text-xs">
              <span className="text-muted-foreground">
                {pendingDebts.length} deuda{pendingDebts.length !== 1 ? 's' : ''} pendiente{pendingDebts.length !== 1 ? 's' : ''}
              </span>
              <Button variant="ghost" size="sm" asChild className="h-6 px-2 text-xs w-fit">
                <Link to="/all-debts">Ver todas</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Operaciones del Día */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Operaciones del Día</CardTitle>
          <CardDescription>
            {todayTransactions.length} operación{todayTransactions.length !== 1 ? 'es' : ''} realizada{todayTransactions.length !== 1 ? 's' : ''} hoy
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {todayTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground px-6">
              <Clock className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No hay operaciones registradas para hoy</p>
            </div>
          ) : (
            <>
              {/* Vista móvil - tarjetas apiladas */}
              <div className="block md:hidden space-y-3 p-4 w-full max-w-full overflow-hidden">
                {todayTransactions.map((transaction) => (
                  <div key={transaction.id} className="border rounded-lg p-4 space-y-2 w-full max-w-full">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2 flex-shrink min-w-0">
                        {transaction.type === 'income' ? (
                          <ArrowUp className="h-4 w-4 text-green-500 flex-shrink-0" />
                        ) : (
                          <ArrowDown className="h-4 w-4 text-red-500 flex-shrink-0" />
                        )}
                        <span className="font-medium truncate">
                          {transaction.type === 'income' ? 'Ingreso' : 
                           transaction.type === 'expense' ? 'Gasto' : 
                           transaction.type}
                        </span>
                      </div>
                      <span className={`font-bold flex-shrink-0 ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(transaction.amount)}
                      </span>
                    </div>
                    
                    <div className="space-y-1 text-sm w-full">
                      <div className="w-full">
                        <span className="text-muted-foreground">Descripción: </span>
                        <span className="break-words">{transaction.description || 'Sin descripción'}</span>
                      </div>
                      <div className="w-full">
                        <span className="text-muted-foreground">Cliente: </span>
                        <span className="break-words">{getClientName(transaction.clientId)}</span>
                      </div>
                      <div className="flex items-center justify-between w-full">
                        <div className="flex-shrink-0">
                          <span className="text-muted-foreground">Hora: </span>
                          <span>{format(new Date(transaction.date), 'HH:mm')}</span>
                        </div>
                        <Badge variant={
                          transaction.status === 'completed' ? 'default' :
                          transaction.status === 'pending' ? 'secondary' :
                          transaction.status === 'cancelled' ? 'destructive' :
                          'outline'
                        } className="text-xs flex-shrink-0">
                          {transaction.status === 'completed' ? 'Completado' :
                           transaction.status === 'pending' ? 'Pendiente' :
                           transaction.status === 'cancelled' ? 'Cancelado' :
                           transaction.status || 'Sin estado'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Vista desktop - tabla normal */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Hora</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {todayTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {transaction.type === 'income' ? (
                              <ArrowUp className="h-4 w-4 text-green-500" />
                            ) : (
                              <ArrowDown className="h-4 w-4 text-red-500" />
                            )}
                            <span className="capitalize">
                              {transaction.type === 'income' ? 'Ingreso' : 
                               transaction.type === 'expense' ? 'Gasto' : 
                               transaction.type}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px] truncate">
                            {transaction.description || 'Sin descripción'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[150px] truncate">
                            {getClientName(transaction.clientId)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={transaction.type === 'income' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                            {formatCurrency(transaction.amount)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(transaction.date), 'HH:mm')}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            transaction.status === 'completed' ? 'default' :
                            transaction.status === 'pending' ? 'secondary' :
                            transaction.status === 'cancelled' ? 'destructive' :
                            'outline'
                          }>
                            {transaction.status === 'completed' ? 'Completado' :
                             transaction.status === 'pending' ? 'Pendiente' :
                             transaction.status === 'cancelled' ? 'Cancelado' :
                             transaction.status || 'Sin estado'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
          {todayTransactions.length > 0 && (
            <div className="mt-4 flex justify-center md:justify-end px-4 md:px-0">
              <Button variant="outline" size="sm" asChild className="w-full md:w-auto">
                <Link to="/operations">Ver todas las operaciones</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      <DebtsAndReceivables />
      
      <BankAccountsModal isOpen={openModal === 'USD'} onClose={() => setOpenModal(null)} currency="USD" accounts={usdAccounts} />
      
      <BankAccountsModal isOpen={openModal === 'VES'} onClose={() => setOpenModal(null)} currency="VES" accounts={vesAccounts} />
    </div>;
};
export default Dashboard;