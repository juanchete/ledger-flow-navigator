import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn, formatCurrency, formatDateEs } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getBankAccounts, BankAccount } from "@/integrations/supabase/bankAccountService";
import { getTransactions, Transaction } from "@/integrations/supabase/transactionService";
import { getDebts, Debt } from "@/integrations/supabase/debtService";
import { getReceivables, Receivable } from "@/integrations/supabase/receivableService";
import { getFinancialStats, FinancialStat } from "@/integrations/supabase/financialStatsService";

const HistoricalBalance = () => {
  const [date, setDate] = useState<Date>(new Date());
  const [view, setView] = useState<"summary" | "accounts" | "transactions" | "debtReceivables">("summary");
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [financialStats, setFinancialStats] = useState<FinancialStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [bks, txs, dbts, recs, stats] = await Promise.all([
          getBankAccounts(),
          getTransactions(),
          getDebts(),
          getReceivables(),
          getFinancialStats()
        ]);
        setBankAccounts(bks);
        setTransactions(txs);
        setDebts(dbts);
        setReceivables(recs);
        setFinancialStats(stats);
      } catch (e) {
        // Manejo de error
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // 1. Saldos históricos de cuentas
  const getHistoricalAccountBalances = () => {
    return bankAccounts.map(account => {
      // Suma todas las transacciones asociadas a la cuenta hasta la fecha seleccionada
      const txs = transactions.filter(t => t.bank_account_id === account.id && new Date(t.date) <= date);
      const saldo = txs.reduce((sum, t) => sum + (t.type === 'expense' || t.type === 'purchase' ? -t.amount : t.amount), account.amount);
      return {
        ...account,
        amount: saldo
      };
    });
  };
  const historicalAccounts = getHistoricalAccountBalances();
  const usdAccounts = historicalAccounts.filter(acc => acc.currency === 'USD');
  const vesAccounts = historicalAccounts.filter(acc => acc.currency === 'VES');
  const totalUSD = usdAccounts.reduce((sum, acc) => sum + acc.amount, 0);
  const totalVES = vesAccounts.reduce((sum, acc) => sum + acc.amount, 0);

  // 2. Transacciones históricas
  const historicalTransactions = transactions.filter(t => new Date(t.date) <= date);

  // 3. Deudas y cuentas por cobrar históricas
  // Deudas activas a la fecha: creadas antes o igual a la fecha
  const historicalDebts = debts.filter(d => new Date(d.due_date) <= date);
  const historicalReceivables = receivables.filter(r => new Date(r.due_date) <= date);

  // Estado de deudas/cobros según pagos y vencimiento a la fecha
  const getDebtStatus = (debt: Debt) => {
    const pagos = transactions.filter(t => t.debt_id === debt.id && new Date(t.date) <= date && t.type === 'payment' && t.status === 'completed');
    const totalPagado = pagos.reduce((sum, t) => sum + t.amount, 0);
    if (totalPagado >= debt.amount) return 'paid';
    if (new Date(debt.due_date) < date) return 'overdue';
    return 'pending';
  };
  const debtsWithStatus = historicalDebts.map(d => ({ ...d, status: getDebtStatus(d) }));

  const getReceivableStatus = (rec: Receivable) => {
    const pagos = transactions.filter(t => t.receivable_id === rec.id && new Date(t.date) <= date && t.type === 'payment' && t.status === 'completed');
    const totalPagado = pagos.reduce((sum, t) => sum + t.amount, 0);
    if (totalPagado >= rec.amount) return 'paid';
    if (new Date(rec.due_date) < date) return 'overdue';
    return 'pending';
  };
  const receivablesWithStatus = historicalReceivables.map(r => ({ ...r, status: getReceivableStatus(r) }));

  // 4. Financial stats históricos: el más cercano anterior o igual a la fecha
  const getClosestFinancialStat = () => {
    if (financialStats.length === 0) return null;
    let closest = financialStats[0];
    let minDiff = Math.abs(new Date(closest.date).getTime() - date.getTime());
    for (const stat of financialStats) {
      const diff = Math.abs(new Date(stat.date).getTime() - date.getTime());
      if (new Date(stat.date) <= date && diff < minDiff) {
        closest = stat;
        minDiff = diff;
      }
    }
    return closest;
  };
  const stat = getClosestFinancialStat();

  if (loading) return <div className="p-8 text-center">Cargando historial...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Balance Histórico</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal sm:w-[240px]"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP", { locale: es }) : "Seleccionar fecha"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                disabled={(date) => date > new Date()}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      <div className="bg-muted/40 p-4 rounded-lg">
        <h2 className="text-lg font-medium mb-2">Fecha del registro: {date ? format(date, "PPP", { locale: es }) : "No seleccionada"}</h2>
        <p className="text-muted-foreground">
          Mostrando el balance financiero histórico más cercano a la fecha seleccionada.
        </p>
      </div>
      
      <Tabs value={view} onValueChange={(val) => setView(val as "summary" | "accounts" | "transactions" | "debtReceivables")}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="summary">Resumen</TabsTrigger>
          <TabsTrigger value="accounts">Cuentas</TabsTrigger>
          <TabsTrigger value="transactions">Transacciones</TabsTrigger>
          <TabsTrigger value="debtReceivables">Deudas/Cobros</TabsTrigger>
        </TabsList>
        
        <TabsContent value="summary" className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Patrimonio Neto</CardTitle>
                <CardDescription className="text-2xl font-bold">{formatCurrency(stat?.net_worth || 0)}</CardDescription>
              </CardHeader>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Cuentas por Cobrar</CardTitle>
                <CardDescription className="text-2xl font-bold">{formatCurrency(stat?.receivables || 0)}</CardDescription>
              </CardHeader>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Deudas</CardTitle>
                <CardDescription className="text-2xl font-bold">{formatCurrency(stat?.debts || 0)}</CardDescription>
              </CardHeader>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Balance en USD</CardTitle>
                <CardDescription className="text-2xl font-bold">
                  {formatCurrency(totalUSD)}
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Balance en VES</CardTitle>
                <CardDescription className="text-2xl font-bold">
                  Bs. {new Intl.NumberFormat('es-VE').format(totalVES)}
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="accounts" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Cuentas en USD</CardTitle>
              <CardDescription>Estado de las cuentas en dólares para la fecha seleccionada</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Banco</TableHead>
                    <TableHead>Número de Cuenta</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usdAccounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">{account.bank}</TableCell>
                      <TableCell>{account.account_number}</TableCell>
                      <TableCell className="text-right">{formatCurrency(account.amount)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={2} className="font-bold">Total</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(totalUSD)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Cuentas en VES</CardTitle>
              <CardDescription>Estado de las cuentas en bolívares para la fecha seleccionada</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Banco</TableHead>
                    <TableHead>Número de Cuenta</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vesAccounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">{account.bank}</TableCell>
                      <TableCell>{account.account_number}</TableCell>
                      <TableCell className="text-right">Bs. {new Intl.NumberFormat('es-VE').format(account.amount)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={2} className="font-bold">Total</TableCell>
                    <TableCell className="text-right font-bold">Bs. {new Intl.NumberFormat('es-VE').format(totalVES)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="transactions" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Transacciones</CardTitle>
              <CardDescription>
                Mostrando transacciones registradas en el periodo seleccionado
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historicalTransactions.length > 0 ? (
                <div className="space-y-4">
                  {historicalTransactions.map(transaction => (
                    <div key={transaction.id} className="border rounded-md p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="font-medium">{transaction.description}</h3>
                          <p className="text-sm text-muted-foreground">{format(new Date(transaction.date), "PPP", { locale: es })}</p>
                        </div>
                        <Badge className={
                          transaction.type === 'sale' ? 'bg-finance-green text-white' :
                          transaction.type === 'purchase' ? 'bg-finance-red-light text-white' :
                          'bg-finance-blue text-white'
                        }>
                          {transaction.type === 'sale' ? 'Venta' : 
                           transaction.type === 'purchase' ? 'Compra' : 
                           transaction.type === 'expense' ? 'Gasto' : 'Bancario'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="font-bold">
                          {transaction.type === 'sale' ? '+' : '-'} {formatCurrency(transaction.amount)}
                        </p>
                        <Badge className={
                          transaction.status === 'completed' ? 'bg-green-500' : 
                          transaction.status === 'pending' ? 'bg-yellow-500' : 
                          'bg-red-500'
                        }>
                          {transaction.status === 'completed' ? 'Completado' : 
                           transaction.status === 'pending' ? 'Pendiente' : 'Cancelado'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  No hay transacciones registradas para este periodo
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="debtReceivables" className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Estado de Deudas</CardTitle>
                <CardDescription>Para la fecha seleccionada</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="border rounded-md p-3 text-center">
                      <p className="text-sm text-muted-foreground">Pagadas</p>
                      <p className="text-lg font-bold text-green-600">{debtsWithStatus.filter(d => d.status === 'paid').length}</p>
                      <p className="text-sm font-bold">
                        {formatCurrency(debtsWithStatus.filter(d => d.status === 'paid').reduce((sum, d) => sum + d.amount, 0))}
                      </p>
                    </div>
                    <div className="border rounded-md p-3 text-center">
                      <p className="text-sm text-muted-foreground">Pendientes</p>
                      <p className="text-lg font-bold text-yellow-600">{debtsWithStatus.filter(d => d.status === 'pending').length}</p>
                      <p className="text-sm font-bold">
                        {formatCurrency(debtsWithStatus.filter(d => d.status === 'pending').reduce((sum, d) => sum + d.amount, 0))}
                      </p>
                    </div>
                    <div className="border rounded-md p-3 text-center">
                      <p className="text-sm text-muted-foreground">Vencidas</p>
                      <p className="text-lg font-bold text-red-600">{debtsWithStatus.filter(d => d.status === 'overdue').length}</p>
                      <p className="text-sm font-bold">
                        {formatCurrency(debtsWithStatus.filter(d => d.status === 'overdue').reduce((sum, d) => sum + d.amount, 0))}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Deudas recientes</h4>
                    {debtsWithStatus.slice(0, 3).map(debt => (
                      <div key={debt.id} className="border rounded-md p-3">
                        <div className="flex justify-between">
                          <div>
                            <p className="font-medium">{debt.creditor}</p>
                            <p className="text-sm text-muted-foreground">{debt.category}</p>
                          </div>
                          <Badge className={
                            debt.status === 'paid' ? 'bg-green-500 text-white' :
                            debt.status === 'pending' ? 'bg-yellow-500 text-yellow-900' :
                            'bg-red-500 text-white'
                          }>
                            {debt.status === 'paid' ? 'Pagada' : 
                            debt.status === 'pending' ? 'Pendiente' : 'Vencida'}
                          </Badge>
                        </div>
                        <div className="mt-2 flex justify-between">
                          <p className="font-bold">{formatCurrency(debt.amount)}</p>
                          <p className="text-sm text-muted-foreground">
                            Vence: {formatDateEs(debt.due_date, 'dd/MM/yyyy')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Estado de Cuentas por Cobrar</CardTitle>
                <CardDescription>Para la fecha seleccionada</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="border rounded-md p-3 text-center">
                      <p className="text-sm text-muted-foreground">Cobradas</p>
                      <p className="text-lg font-bold text-green-600">{receivablesWithStatus.filter(r => r.status === 'paid').length}</p>
                      <p className="text-sm font-bold">
                        {formatCurrency(receivablesWithStatus.filter(r => r.status === 'paid').reduce((sum, r) => sum + r.amount, 0))}
                      </p>
                    </div>
                    <div className="border rounded-md p-3 text-center">
                      <p className="text-sm text-muted-foreground">Pendientes</p>
                      <p className="text-lg font-bold text-yellow-600">{receivablesWithStatus.filter(r => r.status === 'pending').length}</p>
                      <p className="text-sm font-bold">
                        {formatCurrency(receivablesWithStatus.filter(r => r.status === 'pending').reduce((sum, r) => sum + r.amount, 0))}
                      </p>
                    </div>
                    <div className="border rounded-md p-3 text-center">
                      <p className="text-sm text-muted-foreground">Vencidas</p>
                      <p className="text-lg font-bold text-red-600">{receivablesWithStatus.filter(r => r.status === 'overdue').length}</p>
                      <p className="text-sm font-bold">
                        {formatCurrency(receivablesWithStatus.filter(r => r.status === 'overdue').reduce((sum, r) => sum + r.amount, 0))}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Cuentas por cobrar recientes</h4>
                    {receivablesWithStatus.slice(0, 3).map(receivable => (
                      <div key={receivable.id} className="border rounded-md p-3">
                        <div className="flex justify-between">
                          <div>
                            <p className="font-medium">{receivable.description}</p>
                            <p className="text-sm text-muted-foreground">Cliente ID: {receivable.client_id}</p>
                          </div>
                          <Badge className={
                            receivable.status === 'paid' ? 'bg-green-500 text-white' :
                            receivable.status === 'pending' ? 'bg-yellow-500 text-yellow-900' :
                            'bg-red-500 text-white'
                          }>
                            {receivable.status === 'paid' ? 'Cobrada' : 
                            receivable.status === 'pending' ? 'Pendiente' : 'Vencida'}
                          </Badge>
                        </div>
                        <div className="mt-2 flex justify-between">
                          <p className="font-bold">{formatCurrency(receivable.amount)}</p>
                          <p className="text-sm text-muted-foreground">
                            Vence: {formatDateEs(receivable.due_date, 'dd/MM/yyyy')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HistoricalBalance;
