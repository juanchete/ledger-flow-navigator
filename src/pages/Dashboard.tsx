
import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { mockTransactions, mockClients, mockFinancialStats, mockExpenseStats, mockInvoices, mockCalendarEvents } from "@/data/mockData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Client, Transaction, Invoice, CalendarEvent } from "@/types";
import { 
  Calendar, 
  File, 
  PieChart, 
  Receipt, 
  Users,
  Wallet,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { Link } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Legend } from "recharts";
import { format } from "date-fns";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);
};

const Dashboard = () => {
  const currentStats = mockFinancialStats[mockFinancialStats.length - 1];
  const previousStats = mockFinancialStats[mockFinancialStats.length - 2];
  
  const netWorthChange = currentStats.netWorth - previousStats.netWorth;
  const netWorthPercentChange = (netWorthChange / previousStats.netWorth * 100).toFixed(1);
  
  const receivablesChange = currentStats.receivables - previousStats.receivables;
  const receivablesPercentChange = (receivablesChange / previousStats.receivables * 100).toFixed(1);
  
  const debtsChange = currentStats.debts - previousStats.debts;
  const debtsPercentChange = (debtsChange / previousStats.debts * 100).toFixed(1);

  const overdueInvoices = mockInvoices.filter(i => i.status === 'overdue');
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
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="hidden md:flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/operations/transaction/new">New Transaction</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/invoices/new">New Invoice</Link>
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Financial Summary Cards */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Net Worth</CardTitle>
            <CardDescription className="text-2xl font-bold">{formatCurrency(currentStats.netWorth)}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-xs">
              <span className={`inline-flex items-center ${netWorthChange >= 0 ? 'text-finance-green' : 'text-finance-red'}`}>
                {netWorthChange >= 0 ? <ArrowUp size={14} className="mr-1" /> : <ArrowDown size={14} className="mr-1" />}
                {Math.abs(Number(netWorthPercentChange))}%
              </span>
              <span className="text-muted-foreground ml-2">vs previous month</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Receivables</CardTitle>
            <CardDescription className="text-2xl font-bold">{formatCurrency(currentStats.receivables)}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-xs">
              <span className={`inline-flex items-center ${receivablesChange >= 0 ? 'text-finance-green' : 'text-finance-red'}`}>
                {receivablesChange >= 0 ? <ArrowUp size={14} className="mr-1" /> : <ArrowDown size={14} className="mr-1" />}
                {Math.abs(Number(receivablesPercentChange))}%
              </span>
              <span className="text-muted-foreground ml-2">vs previous month</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Debts</CardTitle>
            <CardDescription className="text-2xl font-bold">{formatCurrency(currentStats.debts)}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-xs">
              <span className={`inline-flex items-center ${debtsChange <= 0 ? 'text-finance-green' : 'text-finance-red'}`}>
                {debtsChange <= 0 ? <ArrowDown size={14} className="mr-1" /> : <ArrowUp size={14} className="mr-1" />}
                {Math.abs(Number(debtsPercentChange))}%
              </span>
              <span className="text-muted-foreground ml-2">vs previous month</span>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Charts */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Financial Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
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
                  <Area type="monotone" dataKey="netWorth" stroke="#1A73E8" fillOpacity={1} fill="url(#colorNetWorth)" />
                  <Area type="monotone" dataKey="receivables" stroke="#34A853" fillOpacity={1} fill="url(#colorReceivables)" />
                  <Area type="monotone" dataKey="debts" stroke="#EA4335" fillOpacity={1} fill="url(#colorDebts)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Expense Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie 
                    data={mockExpenseStats} 
                    cx="50%" 
                    cy="50%" 
                    labelLine={false}
                    outerRadius={80} 
                    fill="#8884d8" 
                    dataKey="amount"
                    nameKey="category"
                  >
                    {mockExpenseStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Access Cards */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Alerts</CardTitle>
            <Link to="/clients" className="text-sm text-muted-foreground hover:underline">View all</Link>
          </CardHeader>
          <CardContent>
            {alertClients.length > 0 ? (
              <div className="space-y-3">
                {alertClients.map((client) => (
                  <div key={client.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div className="flex items-center gap-2">
                      <Badge variant={client.alertStatus === 'red' ? 'destructive' : 'outline'} className={client.alertStatus === 'yellow' ? 'bg-finance-yellow text-black border-finance-yellow' : ''}>
                        {client.alertStatus}
                      </Badge>
                      <span className="font-medium">{client.name}</span>
                    </div>
                    <Button variant="ghost" size="sm" asChild className="h-6">
                      <Link to={`/clients/${client.id}`}>View</Link>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No client alerts</p>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Overdue Invoices</CardTitle>
            <Link to="/invoices" className="text-sm text-muted-foreground hover:underline">View all</Link>
          </CardHeader>
          <CardContent>
            {overdueInvoices.length > 0 ? (
              <div className="space-y-3">
                {overdueInvoices.map((invoice) => {
                  const client = mockClients.find(c => c.id === invoice.clientId);
                  return (
                    <div key={invoice.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <div>
                        <p className="font-medium">{client?.name}</p>
                        <p className="text-sm text-muted-foreground">{formatCurrency(invoice.amount)} - Due: {format(new Date(invoice.dueDate), 'MMM d, yyyy')}</p>
                      </div>
                      <Button variant="ghost" size="sm" asChild className="h-6">
                        <Link to={`/invoices/${invoice.id}`}>View</Link>
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No overdue invoices</p>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Upcoming Events</CardTitle>
            <Link to="/calendar" className="text-sm text-muted-foreground hover:underline">View all</Link>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length > 0 ? (
              <div className="space-y-3">
                {upcomingEvents.slice(0, 3).map((event) => {
                  const client = event.clientId ? mockClients.find(c => c.id === event.clientId) : null;
                  return (
                    <div key={event.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <div>
                        <p className="font-medium">{event.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(event.startDate), 'MMM d, h:mm a')}
                          {client && ` - ${client.name}`}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" asChild className="h-6">
                        <Link to={`/calendar?event=${event.id}`}>View</Link>
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No upcoming events</p>
            )}
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        {/* Quick Access Menu */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Access</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              <Link to="/clients" className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-secondary transition-colors">
                <Users className="h-8 w-8 text-finance-blue mb-2" />
                <span className="text-sm font-medium">Clients</span>
              </Link>
              
              <Link to="/operations" className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-secondary transition-colors">
                <Wallet className="h-8 w-8 text-finance-green mb-2" />
                <span className="text-sm font-medium">Operations</span>
              </Link>
              
              <Link to="/calendar" className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-secondary transition-colors">
                <Calendar className="h-8 w-8 text-finance-yellow-dark mb-2" />
                <span className="text-sm font-medium">Calendar</span>
              </Link>
              
              <Link to="/invoices" className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-secondary transition-colors">
                <Receipt className="h-8 w-8 text-finance-red mb-2" />
                <span className="text-sm font-medium">Invoices</span>
              </Link>
              
              <Link to="/statistics" className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-secondary transition-colors">
                <PieChart className="h-8 w-8 text-finance-blue-dark mb-2" />
                <span className="text-sm font-medium">Statistics</span>
              </Link>
              
              <Link to="/reports" className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-secondary transition-colors">
                <File className="h-8 w-8 text-finance-gray mb-2" />
                <span className="text-sm font-medium">Reports</span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
