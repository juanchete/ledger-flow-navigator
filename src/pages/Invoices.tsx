
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { mockInvoices, mockClients } from "@/data/mockData";
import { format, isAfter } from "date-fns";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { PlusCircle, Search, ExternalLink, Download, Printer } from "lucide-react";

const Invoices = () => {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  const filteredInvoices = mockInvoices.filter(invoice => {
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    const client = mockClients.find(c => c.id === invoice.clientId);
    const matchesSearch = client?.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         invoice.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesStatus && (searchQuery === "" || matchesSearch);
  });
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };
  
  const handleCreateInvoice = () => {
    toast.success("Invoice created! This is a mock action in the MVP.");
  };
  
  const getStatusColor = (status: string): string => {
    switch(status) {
      case 'paid':
        return 'bg-finance-green text-white';
      case 'overdue':
        return 'bg-finance-red text-white';
      case 'sent':
        return 'bg-finance-blue-light text-white';
      case 'draft':
        return 'bg-finance-gray-light text-finance-gray-dark';
      default:
        return 'bg-muted';
    }
  };

  const handleInvoiceHomeIntegration = () => {
    toast.success("InvoiceHome integration would be set up in the full version");
  };
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
        
        <div className="flex items-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <ExternalLink size={16} />
                InvoiceHome
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>InvoiceHome Integration</DialogTitle>
                <DialogDescription>
                  Connect your account with InvoiceHome to sync invoices.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="api-key">API Key</Label>
                  <Input id="api-key" placeholder="Enter your InvoiceHome API key" />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="account-email">Account Email</Label>
                  <Input id="account-email" type="email" placeholder="Email associated with your account" />
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline">Cancel</Button>
                <Button onClick={handleInvoiceHomeIntegration}>Connect</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <PlusCircle size={16} />
                New Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Create New Invoice</DialogTitle>
                <DialogDescription>
                  Create a new invoice for your client.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-6 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="client">Client</Label>
                    <Select>
                      <SelectTrigger id="client">
                        <SelectValue placeholder="Select client" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockClients.map(client => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="invoice-number">Invoice Number</Label>
                    <Input id="invoice-number" placeholder="INV-0001" />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="issue-date">Issue Date</Label>
                    <Input id="issue-date" type="date" defaultValue={format(new Date(), 'yyyy-MM-dd')} />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="due-date">Due Date</Label>
                    <Input id="due-date" type="date" defaultValue={format(new Date(new Date().setDate(new Date().getDate() + 30)), 'yyyy-MM-dd')} />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="status">Status</Label>
                    <Select defaultValue="draft">
                      <SelectTrigger id="status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label className="mb-2 block">Invoice Items</Label>
                  <div className="rounded-md border">
                    <div className="grid grid-cols-12 p-3 bg-muted/50 text-sm font-medium">
                      <div className="col-span-5">Description</div>
                      <div className="col-span-2">Quantity</div>
                      <div className="col-span-2">Price</div>
                      <div className="col-span-2">Total</div>
                      <div className="col-span-1"></div>
                    </div>
                    
                    <div className="p-3 border-t">
                      <div className="grid grid-cols-12 gap-2 mb-2">
                        <Input className="col-span-5" placeholder="Item description" />
                        <Input className="col-span-2" type="number" placeholder="Qty" defaultValue="1" />
                        <Input className="col-span-2" type="number" step="0.01" placeholder="0.00" />
                        <div className="col-span-2 flex items-center">$0.00</div>
                        <Button variant="ghost" size="sm" className="col-span-1">×</Button>
                      </div>
                      
                      <Button variant="outline" size="sm" className="mt-2">+ Add Item</Button>
                    </div>
                  </div>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input id="notes" placeholder="Additional notes for the client..." />
                </div>
              </div>
              
              <DialogFooter className="sm:justify-between">
                <div className="flex flex-col items-start text-sm">
                  <div className="flex justify-between w-48 mb-1">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span>$0.00</span>
                  </div>
                  <div className="flex justify-between w-48 mb-1">
                    <span className="text-muted-foreground">Tax:</span>
                    <span>$0.00</span>
                  </div>
                  <div className="flex justify-between w-48 font-bold">
                    <span>Total:</span>
                    <span>$0.00</span>
                  </div>
                </div>
                <div>
                  <Button variant="outline" className="mr-2">Cancel</Button>
                  <Button onClick={handleCreateInvoice}>Create Invoice</Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="relative w-full sm:w-72">
              <Search size={18} className="absolute left-2 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Tabs defaultValue="all" value={statusFilter} onValueChange={setStatusFilter}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="draft">Draft</TabsTrigger>
                <TabsTrigger value="sent">Sent</TabsTrigger>
                <TabsTrigger value="paid">Paid</TabsTrigger>
                <TabsTrigger value="overdue">Overdue</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="grid grid-cols-1 md:grid-cols-12 p-4 bg-muted/50 text-sm font-medium">
              <div className="hidden md:block md:col-span-2">Invoice #</div>
              <div className="hidden md:block md:col-span-3">Client</div>
              <div className="hidden md:block md:col-span-2">Issue Date</div>
              <div className="hidden md:block md:col-span-2">Due Date</div>
              <div className="hidden md:block md:col-span-1">Status</div>
              <div className="hidden md:block md:col-span-1">Amount</div>
              <div className="hidden md:block md:col-span-1 text-right">Actions</div>
            </div>
            
            <div className="divide-y">
              {filteredInvoices.length > 0 ? (
                filteredInvoices.map((invoice) => {
                  const client = mockClients.find(c => c.id === invoice.clientId);
                  const isOverdue = isAfter(new Date(), new Date(invoice.dueDate)) && invoice.status !== 'paid';
                  
                  return (
                    <div key={invoice.id} className="grid grid-cols-1 md:grid-cols-12 p-4 items-center">
                      <div className="md:col-span-2 font-medium mb-2 md:mb-0">
                        {invoice.id}
                      </div>
                      
                      <div className="md:col-span-3 mb-2 md:mb-0">
                        <div>{client?.name}</div>
                        <div className="text-sm text-muted-foreground md:hidden">
                          {format(new Date(invoice.issueDate), 'MMM d, yyyy')}
                        </div>
                      </div>
                      
                      <div className="hidden md:block md:col-span-2">
                        {format(new Date(invoice.issueDate), 'MMM d, yyyy')}
                      </div>
                      
                      <div className="md:col-span-2 mb-2 md:mb-0">
                        {format(new Date(invoice.dueDate), 'MMM d, yyyy')}
                        {isOverdue && invoice.status !== 'overdue' && (
                          <span className="ml-2 text-finance-red text-xs">Overdue</span>
                        )}
                      </div>
                      
                      <div className="md:col-span-1 mb-2 md:mb-0">
                        <Badge className={getStatusColor(invoice.status)}>
                          {invoice.status}
                        </Badge>
                      </div>
                      
                      <div className="md:col-span-1 font-medium mb-2 md:mb-0">
                        {formatCurrency(invoice.amount)}
                      </div>
                      
                      <div className="md:col-span-1 flex justify-start md:justify-end gap-1">
                        <Button variant="ghost" size="icon" title="View">
                          <ExternalLink size={16} />
                        </Button>
                        <Button variant="ghost" size="icon" title="Download PDF">
                          <Download size={16} />
                        </Button>
                        <Button variant="ghost" size="icon" title="Print">
                          <Printer size={16} />
                        </Button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-6 text-center text-muted-foreground">
                  No invoices found matching your criteria
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Invoices;
