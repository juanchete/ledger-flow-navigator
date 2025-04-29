import { useState } from "react";
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
import { mockTransactions, mockDetailedDebts, mockDetailedReceivables, mockFinancialStats } from "@/data/mockData";

// Mock data for historical account balances
const mockHistoricalAccounts = [
  {
    date: new Date(2023, 9, 15), // October 15, 2023
    accounts: [
      { id: "1", bank: "Bank of America", accountNumber: "****1234", amount: 42000, currency: "USD" },
      { id: "2", bank: "Chase", accountNumber: "****5678", amount: 18500, currency: "USD" },
      { id: "3", bank: "Banco Mercantil", accountNumber: "****9012", amount: 1950000, currency: "VES" },
      { id: "4", bank: "Banesco", accountNumber: "****3456", amount: 875000, currency: "VES" },
    ]
  },
  {
    date: new Date(2023, 10, 15), // November 15, 2023
    accounts: [
      { id: "1", bank: "Bank of America", accountNumber: "****1234", amount: 45000, currency: "USD" },
      { id: "2", bank: "Chase", accountNumber: "****5678", amount: 20000, currency: "USD" },
      { id: "3", bank: "Banco Mercantil", accountNumber: "****9012", amount: 2100000, currency: "VES" },
      { id: "4", bank: "Banesco", accountNumber: "****3456", amount: 950000, currency: "VES" },
    ]
  },
  {
    date: new Date(2023, 11, 15), // December 15, 2023
    accounts: [
      { id: "1", bank: "Bank of America", accountNumber: "****1234", amount: 47500, currency: "USD" },
      { id: "2", bank: "Chase", accountNumber: "****5678", amount: 22500, currency: "USD" },
      { id: "3", bank: "Banco Mercantil", accountNumber: "****9012", amount: 2250000, currency: "VES" },
      { id: "4", bank: "Banesco", accountNumber: "****3456", amount: 975000, currency: "VES" },
    ]
  },
  {
    date: new Date(2024, 0, 15), // January 15, 2024
    accounts: [
      { id: "1", bank: "Bank of America", accountNumber: "****1234", amount: 49000, currency: "USD" },
      { id: "2", bank: "Chase", accountNumber: "****5678", amount: 23750, currency: "USD" },
      { id: "3", bank: "Banco Mercantil", accountNumber: "****9012", amount: 2350000, currency: "VES" },
      { id: "4", bank: "Banesco", accountNumber: "****3456", amount: 990000, currency: "VES" },
    ]
  },
  {
    date: new Date(2024, 1, 15), // February 15, 2024
    accounts: [
      { id: "1", bank: "Bank of America", accountNumber: "****1234", amount: 50000, currency: "USD" },
      { id: "2", bank: "Chase", accountNumber: "****5678", amount: 25420.50, currency: "USD" },
      { id: "3", bank: "Banco Mercantil", accountNumber: "****9012", amount: 2425750, currency: "VES" },
      { id: "4", bank: "Banesco", accountNumber: "****3456", amount: 1000000, currency: "VES" },
    ]
  }
];

// Mock data for historical transactions
const getHistoricalTransactions = (date: Date) => {
  const weekBefore = new Date(date);
  weekBefore.setDate(date.getDate() - 7);
  
  return mockTransactions.filter(t => {
    const transDate = new Date(t.date);
    return transDate >= weekBefore && transDate <= date;
  });
};

// Mock data for historical debts and receivables
const getHistoricalDebtsAndReceivables = (date: Date) => {
  // Filter debts and receivables that were active on the selected date
  return {
    debts: mockDetailedDebts.map(debt => ({
      ...debt,
      // Simulate different status based on the date
      status: new Date(debt.dueDate) <= date ? 
        (Math.random() > 0.6 ? 'paid' : 'overdue') : 'pending'
    })),
    receivables: mockDetailedReceivables.map(receivable => ({
      ...receivable,
      // Simulate different status based on the date
      status: new Date(receivable.dueDate) <= date ? 
        (Math.random() > 0.4 ? 'paid' : 'overdue') : 'pending'
    }))
  };
};

const HistoricalBalance = () => {
  const [date, setDate] = useState<Date | undefined>(mockHistoricalAccounts[mockHistoricalAccounts.length - 2].date);
  const [view, setView] = useState<"summary" | "accounts" | "transactions" | "debtReceivables">("summary");
  
  // Get the closest historical data to the selected date
  const getClosestHistoricalData = () => {
    if (!date) return mockHistoricalAccounts[mockHistoricalAccounts.length - 1];
    
    return mockHistoricalAccounts.reduce((prev, curr) => {
      return (Math.abs(curr.date.getTime() - date.getTime()) < Math.abs(prev.date.getTime() - date.getTime()))
        ? curr
        : prev;
    });
  };
  
  const historicalData = getClosestHistoricalData();
  const usdAccounts = historicalData.accounts.filter(acc => acc.currency === 'USD');
  const vesAccounts = historicalData.accounts.filter(acc => acc.currency === 'VES');
  const transactions = getHistoricalTransactions(historicalData.date);
  const { debts, receivables } = getHistoricalDebtsAndReceivables(historicalData.date);
  
  // Calculate totals
  const totalUSD = usdAccounts.reduce((sum, acc) => sum + acc.amount, 0);
  const totalVES = vesAccounts.reduce((sum, acc) => sum + acc.amount, 0);
  
  const paidDebts = debts.filter(d => d.status === 'paid');
  const pendingDebts = debts.filter(d => d.status === 'pending');
  const overdueDebts = debts.filter(d => d.status === 'overdue');
  
  const paidReceivables = receivables.filter(r => r.status === 'paid');
  const pendingReceivables = receivables.filter(r => r.status === 'pending');
  const overdueReceivables = receivables.filter(r => r.status === 'overdue');
  
  // Get historical financial stats
  const getHistoricalFinancialStats = () => {
    if (!date) return mockFinancialStats[mockFinancialStats.length - 1];
    
    return mockFinancialStats.reduce((prev, curr) => {
      return (Math.abs(new Date(curr.date).getTime() - date.getTime()) < Math.abs(new Date(prev.date).getTime() - date.getTime()))
        ? curr
        : prev;
    });
  };
  
  const financialStats = getHistoricalFinancialStats();

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
                <CardDescription className="text-2xl font-bold">{formatCurrency(financialStats.netWorth)}</CardDescription>
              </CardHeader>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Cuentas por Cobrar</CardTitle>
                <CardDescription className="text-2xl font-bold">{formatCurrency(financialStats.receivables)}</CardDescription>
              </CardHeader>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Deudas</CardTitle>
                <CardDescription className="text-2xl font-bold">{formatCurrency(financialStats.debts)}</CardDescription>
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
                      <TableCell>{account.accountNumber}</TableCell>
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
                      <TableCell>{account.accountNumber}</TableCell>
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
              {transactions.length > 0 ? (
                <div className="space-y-4">
                  {transactions.map(transaction => (
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
                      <p className="text-lg font-bold text-green-600">{paidDebts.length}</p>
                      <p className="text-sm font-bold">
                        {formatCurrency(paidDebts.reduce((sum, d) => sum + d.amount, 0))}
                      </p>
                    </div>
                    <div className="border rounded-md p-3 text-center">
                      <p className="text-sm text-muted-foreground">Pendientes</p>
                      <p className="text-lg font-bold text-yellow-600">{pendingDebts.length}</p>
                      <p className="text-sm font-bold">
                        {formatCurrency(pendingDebts.reduce((sum, d) => sum + d.amount, 0))}
                      </p>
                    </div>
                    <div className="border rounded-md p-3 text-center">
                      <p className="text-sm text-muted-foreground">Vencidas</p>
                      <p className="text-lg font-bold text-red-600">{overdueDebts.length}</p>
                      <p className="text-sm font-bold">
                        {formatCurrency(overdueDebts.reduce((sum, d) => sum + d.amount, 0))}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Deudas recientes</h4>
                    {debts.slice(0, 3).map(debt => (
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
                            Vence: {formatDateEs(debt.dueDate, 'dd/MM/yyyy')}
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
                      <p className="text-lg font-bold text-green-600">{paidReceivables.length}</p>
                      <p className="text-sm font-bold">
                        {formatCurrency(paidReceivables.reduce((sum, r) => sum + r.amount, 0))}
                      </p>
                    </div>
                    <div className="border rounded-md p-3 text-center">
                      <p className="text-sm text-muted-foreground">Pendientes</p>
                      <p className="text-lg font-bold text-yellow-600">{pendingReceivables.length}</p>
                      <p className="text-sm font-bold">
                        {formatCurrency(pendingReceivables.reduce((sum, r) => sum + r.amount, 0))}
                      </p>
                    </div>
                    <div className="border rounded-md p-3 text-center">
                      <p className="text-sm text-muted-foreground">Vencidas</p>
                      <p className="text-lg font-bold text-red-600">{overdueReceivables.length}</p>
                      <p className="text-sm font-bold">
                        {formatCurrency(overdueReceivables.reduce((sum, r) => sum + r.amount, 0))}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Cuentas por cobrar recientes</h4>
                    {receivables.slice(0, 3).map(receivable => (
                      <div key={receivable.id} className="border rounded-md p-3">
                        <div className="flex justify-between">
                          <div>
                            <p className="font-medium">{receivable.description}</p>
                            <p className="text-sm text-muted-foreground">Cliente ID: {receivable.clientId}</p>
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
                            Vence: {formatDateEs(receivable.dueDate, 'dd/MM/yyyy')}
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
