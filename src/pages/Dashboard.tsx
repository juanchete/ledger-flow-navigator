import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { mockTransactions, mockClients, mockFinancialStats, mockExpenseStats, mockInvoices, mockCalendarEvents } from "@/data/mockData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Calendar, 
  File, 
  Receipt, 
  Users,
  Wallet,
  ArrowUp,
  ArrowDown,
  CircleAlert,
  PieChart,
  DollarSign,
  Coins
} from "lucide-react";
import { Link } from "react-router-dom";
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
  
  const receivables = mockInvoices
    .filter(invoice => invoice.status !== 'paid')
    .map(invoice => ({
      ...invoice,
      client: mockClients.find(c => c.id === invoice.clientId)
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
      
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Receivables</CardTitle>
            <CardDescription>People who owe you money</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receivables.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {invoice.client?.alertStatus && (
                            <CircleAlert 
                              className={`h-4 w-4 ${
                                invoice.client.alertStatus === 'red' 
                                  ? 'text-destructive' 
                                  : 'text-yellow-500'
                              }`}
                            />
                          )}
                          {invoice.client?.name}
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                      <TableCell>{format(new Date(invoice.dueDate), 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={invoice.status === 'overdue' ? 'destructive' : 'secondary'}
                        >
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/invoices/${invoice.id}`}>View</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {receivables.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No pending receivables
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Debts</CardTitle>
            <CardDescription>Money you owe to others</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Category</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockTransactions
                    .filter(t => t.type === 'expense' && t.status === 'pending')
                    .map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium">{transaction.description}</TableCell>
                        <TableCell>{formatCurrency(transaction.amount)}</TableCell>
                        <TableCell>{transaction.category}</TableCell>
                      </TableRow>
                  ))}
                  {mockTransactions.filter(t => t.type === 'expense' && t.status === 'pending').length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No pending debts
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Disponible en USD</CardTitle>
            <CardDescription className="text-2xl font-bold">{formatCurrency(75420.50)}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center">
                <DollarSign size={16} className="mr-2 text-finance-blue" />
                <span>Balance total en dólares</span>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/balance/details">Ver detalles</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Disponible en VES</CardTitle>
            <CardDescription className="text-2xl font-bold">Bs. 3,425,750.00</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center">
                <Coins size={16} className="mr-2 text-finance-green" />
                <span>Balance total en bolívares</span>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/balance/details">Ver detalles</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
