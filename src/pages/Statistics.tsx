import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, subDays, subMonths, isWithinInterval, parseISO } from "date-fns";
import { FilterIcon, Download } from "lucide-react";
import { toast } from "sonner";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { getTransactions, Transaction } from "@/integrations/supabase/transactionService";
import { getDebts, Debt } from "@/integrations/supabase/debtService";
import { getReceivables, Receivable } from "@/integrations/supabase/receivableService";
import { getClients } from "@/integrations/supabase/clientService";
import { getExpensesByCategory, getExpenseSummary, categoryMapping } from "@/integrations/supabase/expenseStatsService";

// Interfaces para datos calculados
interface CalculatedFinancialStat {
  date: string;
  net_worth: number;
  receivables: number;
  debts: number;
}

interface CalculatedExpenseStat {
  category: string;
  amount: number;
  color: string;
}

// Función para calcular estadísticas financieras dinámicamente
const calculateFinancialStats = (debts: Debt[], receivables: Receivable[], transactions: Transaction[]): CalculatedFinancialStat[] => {
  const today = new Date();
  const stats: CalculatedFinancialStat[] = [];
  
  // Generar estadísticas para los últimos 30 días
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Calcular totales hasta esa fecha
    const totalDebts = debts
      .filter(debt => new Date(debt.due_date) <= date)
      .reduce((sum, debt) => sum + (debt.status === 'pending' ? debt.amount : 0), 0);
    
    const totalReceivables = receivables
      .filter(receivable => new Date(receivable.due_date) <= date)
      .reduce((sum, receivable) => sum + (receivable.status === 'pending' ? receivable.amount : 0), 0);
    
    const netWorth = totalReceivables - totalDebts;
    
    stats.push({
      date: date.toISOString(),
      net_worth: netWorth,
      receivables: totalReceivables,
      debts: totalDebts
    });
  }
  
  return stats;
};

// Esta función ya no es necesaria porque usamos el servicio expenseStatsService

const Statistics = () => {
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y' | 'all'>('30d');
  const [financialStats, setFinancialStats] = useState<CalculatedFinancialStat[]>([]);
  const [expenseStats, setExpenseStats] = useState<CalculatedExpenseStat[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [debts, receivables, transactions, clients, expenseSummary] = await Promise.all([
          getDebts(),
          getReceivables(),
          getTransactions(),
          getClients(),
          getExpenseSummary('month')
        ]);

        // Calcular estadísticas financieras dinámicamente
        const calculatedFinancialStats = calculateFinancialStats(debts, receivables, transactions);

        // Usar el servicio mejorado para estadísticas de gastos
        const expenseCategories = expenseSummary.categories.map(cat => ({
          category: cat.categoryLabel,
          amount: cat.amount,
          color: cat.color
        }));

        setFinancialStats(calculatedFinancialStats);
        setExpenseStats(expenseCategories);
        setTransactions(transactions);
      } catch (e) {
        console.error('Error cargando datos:', e);
        toast.error('Error al cargar las estadísticas');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };
  
  const getFilteredData = () => {
    const today = new Date();
    let startDate: Date;
    
    switch(dateRange) {
      case '7d':
        startDate = subDays(today, 7);
        break;
      case '30d':
        startDate = subDays(today, 30);
        break;
      case '90d':
        startDate = subDays(today, 90);
        break;
      case '1y':
        startDate = subDays(today, 365);
        break;
      default:
        startDate = new Date(0); // Beginning of time for 'all'
    }
    
    return financialStats.filter(stat => new Date(stat.date) >= startDate && new Date(stat.date) <= today);
  };
  
  const filteredData = getFilteredData();
  
  // Prepare data for charts
  const netWorthData = filteredData.map(stat => ({
    date: format(new Date(stat.date), 'MMM dd'),
    value: stat.net_worth
  }));
  
  const revenueData = transactions
    .filter(transaction => transaction.type === 'sale')
    .map(transaction => ({
      date: format(new Date(transaction.date), 'MMM dd'),
      value: transaction.amount
    }));
  
  const expenseData = transactions
    .filter(transaction => transaction.type === 'expense' || transaction.type === 'purchase')
    .map(transaction => ({
      date: format(new Date(transaction.date), 'MMM dd'),
      category: transaction.category || 'Uncategorized',
      value: transaction.amount
    }));
  
  const handleExportData = () => {
    toast.success("Statistics data would be exported in the full version");
  };
  
  if (loading) {
    return <div className="p-8 text-center">Cargando estadísticas...</div>;
  }
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Estadísticas Financieras</h1>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <FilterIcon size={16} className="text-muted-foreground" />
            <Select value={dateRange} onValueChange={(value) => setDateRange(value as '7d' | '30d' | '90d' | '1y' | 'all')}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Periodo de Tiempo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Últimos 7 días</SelectItem>
                <SelectItem value="30d">Últimos 30 días</SelectItem>
                <SelectItem value="90d">Últimos 90 días</SelectItem>
                <SelectItem value="1y">Último año</SelectItem>
                <SelectItem value="all">Todo el tiempo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button variant="outline" className="gap-2" onClick={handleExportData}>
            <Download size={16} />
            Exportar
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Summary Cards */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Patrimonio Neto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredData.length > 0
                ? formatCurrency(filteredData[filteredData.length - 1].net_worth)
                : "Sin datos"}
            </div>
            <div className="mt-4 h-10">
              <ResponsiveContainer width="100%" height="100%">
                {filteredData.length > 0 ? (
                  <LineChart data={netWorthData}>
                    <Line type="monotone" dataKey="value" stroke="#1A73E8" strokeWidth={2} dot={false} />
                  </LineChart>
                ) : (
                  <div className="text-center text-muted-foreground">Sin datos</div>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {revenueData.length > 0
                ? formatCurrency(revenueData.reduce((sum, item) => sum + item.value, 0))
                : "Sin datos"}
            </div>
            <div className="mt-4 h-10">
              <ResponsiveContainer width="100%" height="100%">
                {revenueData.length > 0 ? (
                  <LineChart data={revenueData}>
                    <Line type="monotone" dataKey="value" stroke="#34A853" strokeWidth={2} dot={false} />
                  </LineChart>
                ) : (
                  <div className="text-center text-muted-foreground">Sin datos</div>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Gastos Totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {expenseData.length > 0
                ? formatCurrency(expenseData.reduce((sum, item) => sum + item.value, 0))
                : "Sin datos"}
            </div>
            <div className="mt-4 h-10">
              <ResponsiveContainer width="100%" height="100%">
                {expenseData.length > 0 ? (
                  <LineChart data={expenseData}>
                    <Line type="monotone" dataKey="value" stroke="#EA4335" strokeWidth={2} dot={false} />
                  </LineChart>
                ) : (
                  <div className="text-center text-muted-foreground">Sin datos</div>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Net Worth Trends */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Tendencias de Patrimonio Neto</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              {filteredData.length > 0 ? (
                <AreaChart
                  data={filteredData.map(stat => ({
                    date: format(new Date(stat.date), 'MMM d'),
                    netWorth: stat.net_worth,
                    receivables: stat.receivables,
                    debts: -stat.debts // Negative to show below axis
                  }))}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1A73E8" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#1A73E8" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorReceivables" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34A853" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#34A853" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorDebts" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EA4335" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#EA4335" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <CartesianGrid strokeDasharray="3 3" />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Area type="monotone" dataKey="netWorth" name="Patrimonio Neto" stroke="#1A73E8" fillOpacity={1} fill="url(#colorNetWorth)" />
                  <Area type="monotone" dataKey="receivables" name="Cuentas por Cobrar" stroke="#34A853" fillOpacity={1} fill="url(#colorReceivables)" />
                  <Area type="monotone" dataKey="debts" name="Deudas" stroke="#EA4335" fillOpacity={1} fill="url(#colorDebts)" />
                </AreaChart>
              ) : (
                <div className="text-center text-muted-foreground">Sin datos</div>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        {/* Revenue & Expenses */}
        <Card>
          <CardHeader>
            <CardTitle>Ingresos vs Gastos</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              {revenueData.length > 0 && expenseData.length > 0 ? (
                <BarChart
                  data={[
                    { name: 'Actual', income: revenueData.reduce((sum, item) => sum + item.value, 0), expenses: expenseData.reduce((sum, item) => sum + item.value, 0) }
                  ]}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Bar dataKey="income" name="Ingresos" fill="#34A853" />
                  <Bar dataKey="expenses" name="Gastos" fill="#EA4335" />
                </BarChart>
              ) : (
                <div className="text-center text-muted-foreground absolute inset-0 flex items-center justify-center">Sin datos</div>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        {/* Expense Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Desglose de Gastos</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              {expenseStats.length > 0 ? (
                <PieChart>
                  <Pie
                    data={expenseStats}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="amount"
                    nameKey="category"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {expenseStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                </PieChart>
              ) : (
                <div className="text-center text-muted-foreground">Sin datos</div>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Statistics;
