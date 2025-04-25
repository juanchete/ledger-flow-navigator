
import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { mockClients, mockTransactions, mockInvoices } from "@/data/mockData";
import { format } from "date-fns";
import { AlertTriangle, ChevronLeft, FileText, Receipt } from "lucide-react";

const ClientDetail = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const client = mockClients.find(c => c.id === clientId);
  
  const clientTransactions = mockTransactions.filter(t => t.clientId === clientId);
  const clientInvoices = mockInvoices.filter(i => i.clientId === clientId);
  
  const [isActive, setIsActive] = useState(client?.active || false);
  const [alertStatus, setAlertStatus] = useState<'none' | 'yellow' | 'red'>(client?.alertStatus || 'none');
  const [alertNote, setAlertNote] = useState(client?.alertNote || '');
  
  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <h2 className="text-2xl font-bold mb-2">Client Not Found</h2>
        <p className="text-muted-foreground mb-4">The client you are looking for does not exist.</p>
        <Button asChild>
          <Link to="/clients">Back to Clients</Link>
        </Button>
      </div>
    );
  }

  const handleStatusChange = (checked: boolean) => {
    setIsActive(checked);
    toast.success(`Client status ${checked ? 'activated' : 'deactivated'}`);
  };

  const handleAlertChange = (value: string) => {
    setAlertStatus(value as 'none' | 'yellow' | 'red');
    toast.success(`Client alert status updated to ${value}`);
  };
  
  const handleDocumentUpload = () => {
    toast.success("Document would be uploaded in the full version");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild className="gap-1">
          <Link to="/clients">
            <ChevronLeft size={16} />
            Back
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">{client.name}</h1>
        <Badge variant="outline" className="capitalize ml-2">{client.category}</Badge>
        {alertStatus !== 'none' && (
          <Badge className={
            alertStatus === 'red' ? 'bg-finance-red text-white' : 
            'bg-finance-yellow text-finance-gray-dark'
          }>
            <AlertTriangle size={12} className="mr-1" />
            {alertStatus}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-[100px_1fr] gap-1">
                <span className="font-medium text-muted-foreground">Email:</span>
                <span>{client.email}</span>
              </div>
              
              <div className="grid grid-cols-[100px_1fr] gap-1">
                <span className="font-medium text-muted-foreground">Phone:</span>
                <span>{client.phone}</span>
              </div>
              
              <div className="grid grid-cols-[100px_1fr] gap-1">
                <span className="font-medium text-muted-foreground">Address:</span>
                <span>{client.address}</span>
              </div>
              
              {client.contactPerson && (
                <div className="grid grid-cols-[100px_1fr] gap-1">
                  <span className="font-medium text-muted-foreground">Contact:</span>
                  <span>{client.contactPerson}</span>
                </div>
              )}
              
              <div className="grid grid-cols-[100px_1fr] gap-1">
                <span className="font-medium text-muted-foreground">Added:</span>
                <span>{format(new Date(client.createdAt), 'MMM d, yyyy')}</span>
              </div>
              
              <div className="pt-2 border-t flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="client-status" className="font-medium">Client Status</Label>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${isActive ? 'text-finance-green' : 'text-muted-foreground'}`}>
                      {isActive ? 'Active' : 'Inactive'}
                    </span>
                    <Switch 
                      id="client-status" 
                      checked={isActive} 
                      onCheckedChange={handleStatusChange}
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="alert-status" className="font-medium">Alert Status</Label>
                  <Select value={alertStatus} onValueChange={handleAlertChange}>
                    <SelectTrigger id="alert-status" className="w-40">
                      <SelectValue placeholder="Set alert status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="yellow">Yellow</SelectItem>
                      <SelectItem value="red">Red</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {alertStatus !== 'none' && (
                  <div>
                    <Label htmlFor="alert-note" className="mb-2 block font-medium">Alert Note</Label>
                    <Textarea 
                      id="alert-note" 
                      value={alertNote} 
                      onChange={(e) => setAlertNote(e.target.value)} 
                      placeholder="Describe the alert reason..."
                      className="resize-none"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Documents</CardTitle>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">Upload</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Upload Document</DialogTitle>
                    <DialogDescription>
                      Upload documents related to this client.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="doc-name">Document Name</Label>
                      <Input id="doc-name" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="doc-type">Document Type</Label>
                      <Select>
                        <SelectTrigger id="doc-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="contract">Contract</SelectItem>
                          <SelectItem value="invoice">Invoice</SelectItem>
                          <SelectItem value="receipt">Receipt</SelectItem>
                          <SelectItem value="id">Identification</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="doc-file">File</Label>
                      <Input id="doc-file" type="file" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline">Cancel</Button>
                    <Button onClick={handleDocumentUpload}>Upload</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {client.documents.length > 0 ? (
                <div className="space-y-3">
                  {client.documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-muted-foreground" />
                        <div>
                          <p className="font-medium">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(doc.uploadedAt), 'MMM d, yyyy')} • {formatFileSize(doc.size)}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">View</Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Client Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="transactions">
                <TabsList className="grid grid-cols-2 w-[300px]">
                  <TabsTrigger value="transactions">Transactions</TabsTrigger>
                  <TabsTrigger value="invoices">Invoices</TabsTrigger>
                </TabsList>
                
                <TabsContent value="transactions" className="mt-4">
                  {clientTransactions.length > 0 ? (
                    <div className="rounded-md border">
                      <div className="grid grid-cols-12 p-3 bg-muted/50 text-sm font-medium">
                        <div className="col-span-5">Description</div>
                        <div className="col-span-2">Date</div>
                        <div className="col-span-2">Amount</div>
                        <div className="col-span-2">Status</div>
                        <div className="col-span-1">Action</div>
                      </div>
                      
                      <div className="divide-y">
                        {clientTransactions.map((transaction) => (
                          <div key={transaction.id} className="grid grid-cols-12 p-3 items-center text-sm">
                            <div className="col-span-5">
                              <span className="capitalize">{transaction.description}</span>
                              <span className="inline-block text-xs bg-muted rounded px-1 ml-2 capitalize">
                                {transaction.type}
                              </span>
                            </div>
                            
                            <div className="col-span-2">
                              {format(new Date(transaction.date), 'MMM d, yyyy')}
                            </div>
                            
                            <div className="col-span-2 font-medium">
                              {formatCurrency(transaction.amount)}
                            </div>
                            
                            <div className="col-span-2">
                              <Badge variant="outline" className={
                                transaction.status === 'completed' ? 'bg-finance-green text-white border-finance-green' :
                                transaction.status === 'pending' ? 'bg-finance-yellow text-finance-gray-dark border-finance-yellow' : 
                                'bg-muted'
                              }>
                                {transaction.status}
                              </Badge>
                            </div>
                            
                            <div className="col-span-1">
                              <Button size="sm" variant="ghost">View</Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No transactions for this client.</p>
                      <Button variant="outline" className="mt-4" asChild>
                        <Link to="/operations/transaction/new">Add Transaction</Link>
                      </Button>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="invoices" className="mt-4">
                  {clientInvoices.length > 0 ? (
                    <div className="rounded-md border">
                      <div className="grid grid-cols-12 p-3 bg-muted/50 text-sm font-medium">
                        <div className="col-span-2">Invoice #</div>
                        <div className="col-span-3">Issue Date</div>
                        <div className="col-span-3">Due Date</div>
                        <div className="col-span-2">Amount</div>
                        <div className="col-span-1">Status</div>
                        <div className="col-span-1">Action</div>
                      </div>
                      
                      <div className="divide-y">
                        {clientInvoices.map((invoice) => (
                          <div key={invoice.id} className="grid grid-cols-12 p-3 items-center text-sm">
                            <div className="col-span-2">
                              <div className="flex items-center gap-1">
                                <Receipt size={14} className="text-muted-foreground" />
                                <span>{invoice.id.substring(3)}</span>
                              </div>
                            </div>
                            
                            <div className="col-span-3">
                              {format(new Date(invoice.issueDate), 'MMM d, yyyy')}
                            </div>
                            
                            <div className="col-span-3">
                              {format(new Date(invoice.dueDate), 'MMM d, yyyy')}
                            </div>
                            
                            <div className="col-span-2 font-medium">
                              {formatCurrency(invoice.amount)}
                            </div>
                            
                            <div className="col-span-1">
                              <Badge variant="outline" className={
                                invoice.status === 'paid' ? 'bg-finance-green text-white border-finance-green' :
                                invoice.status === 'overdue' ? 'bg-finance-red text-white border-finance-red' :
                                invoice.status === 'sent' ? 'bg-finance-blue-light text-white border-finance-blue-light' :
                                'bg-muted'
                              }>
                                {invoice.status}
                              </Badge>
                            </div>
                            
                            <div className="col-span-1">
                              <Button size="sm" variant="ghost">View</Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No invoices for this client.</p>
                      <Button variant="outline" className="mt-4" asChild>
                        <Link to="/invoices/new">Create Invoice</Link>
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" asChild>
              <Link to={`/clients/edit/${clientId}`}>Edit Client</Link>
            </Button>
            <Button variant="default" asChild>
              <Link to={`/operations/transaction/new?clientId=${clientId}`}>Add Transaction</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDetail;
