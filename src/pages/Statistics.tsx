import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { mockFinancialStats, mockTransactions, mockExpenseStats } from "@/data/mockData";
import { format, subDays, subMonths, isWithinInterval, parseISO } from "date-fns";
import { FilterIcon, Download } from "lucide-react";
import { toast } from "sonner";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";

const Statistics = () => {
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y' | 'all'>('30d');
  
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
    
    // For the mock data, we'll return a subset
    return mockFinancialStats;
  };
  
  const filteredData = getFilteredData();
  
  // Prepare data for charts
  const netWorthData = filteredData.map(stat => ({
    date: format(new Date(stat.date), 'MMM dd'),
    value: stat.netWorth
  }));
  
  const revenueData = mockTransactions
    .filter(transaction => transaction.type === 'sale')
    .map(transaction => ({
      date: format(new Date(transaction.date), 'MMM dd'),
      value: transaction.amount
    }));
  
  const expenseData = mockTransactions
    .filter(transaction => transaction.type === 'expense' || transaction.type === 'purchase')
    .map(transaction => ({
      date: format(new Date(transaction.date), 'MMM dd'),
      category: transaction.category || 'Uncategorized',
      value: transaction.amount
    }));
  
  const handleExportData = () => {
    toast.success("Statistics data would be exported in the full version");
  };
  
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
            <div className="text-2xl font-bold">{formatCurrency(filteredData[filteredData.length - 1].netWorth)}</div>
            <div className="mt-4 h-10">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={netWorthData}>
                  <Line type="monotone" dataKey="value" stroke="#1A73E8" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(revenueData.reduce((sum, item) => sum + item.value, 0))}</div>
            <div className="mt-4 h-10">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
                  <Line type="monotone" dataKey="value" stroke="#34A853" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Gastos Totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(expenseData.reduce((sum, item) => sum + item.value, 0))}</div>
            <div className="mt-4 h-10">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={expenseData}>
                  <Line type="monotone" dataKey="value" stroke="#EA4335" strokeWidth={2} dot={false} />
                </LineChart>
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
              <AreaChart
                data={filteredData.map(stat => ({
                  date: format(new Date(stat.date), 'MMM d'),
                  netWorth: stat.netWorth,
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
              <BarChart
                data={[
                  { name: 'January', income: 4000, expenses: 2400 },
                  { name: 'February', income: 3000, expenses: 1398 },
                  { name: 'March', income: 2000, expenses: 9800 }
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
              <PieChart>
                <Pie
                  data={mockExpenseStats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="amount"
                  nameKey="category"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {mockExpenseStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Statistics;
