import { useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, BadgeDollarSign, Clock, Info, User, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockTransactions, mockClients, mockBankAccounts } from "@/data/mockData";

const TransactionDetail = () => {
  const { transactionId } = useParams();
  const transaction = mockTransactions.find(t => t.id === transactionId);
  
  if (!transaction) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <h2 className="text-2xl font-bold mb-2">Transaction Not Found</h2>
        <p className="text-muted-foreground mb-4">The transaction you are looking for does not exist.</p>
        <Button asChild>
          <Link to="/operations">Back to Operations</Link>
        </Button>
      </div>
    );
  }

  const client = transaction.clientId ? mockClients.find(c => c.id === transaction.clientId) : null;
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'completed':
        return 'bg-finance-green text-white';
      case 'pending':
        return 'bg-finance-yellow text-finance-gray-dark';
      case 'cancelled':
        return 'bg-finance-red text-white';
      default:
        return 'bg-muted';
    }
  };

  const getTypeColor = (type: string) => {
    switch(type) {
      case 'purchase':
        return 'bg-finance-red-light text-white';
      case 'sale':
        return 'bg-finance-green text-white';
      case 'banking':
        return 'bg-finance-blue text-white';
      case 'balance-change':
        return 'bg-finance-yellow text-finance-gray-dark';
      case 'expense':
        return 'bg-finance-gray text-white';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild className="gap-1">
          <Link to="/operations">
            <ArrowLeft size={16} />
            Back
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Transaction Details</h1>
        <Badge className={getTypeColor(transaction.type)}>
          {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BadgeDollarSign size={20} />
              Transaction Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Amount:</span>
              <span className="text-xl font-bold">{formatCurrency(transaction.amount)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Status:</span>
              <Badge className={getStatusColor(transaction.status)}>
                {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
              </Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Date:</span>
              <span>{format(new Date(transaction.date), 'PPP')}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Created:</span>
              <span>{format(new Date(transaction.createdAt), 'PPP')}</span>
            </div>

            {transaction.paymentMethod && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Payment Method:</span>
                <span>{transaction.paymentMethod}</span>
              </div>
            )}

            {transaction.category && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Category:</span>
                <span>{transaction.category}</span>
              </div>
            )}

            <div className="pt-4 border-t">
              <h4 className="font-medium mb-2">Description</h4>
              <p className="text-muted-foreground">{transaction.description}</p>
            </div>

            {transaction.notes && (
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2">Additional Notes</h4>
                <p className="text-muted-foreground">{transaction.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {client && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User size={20} />
                Client Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Name:</span>
                <Link to={`/clients/${client.id}`} className="hover:underline">
                  {client.name}
                </Link>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Category:</span>
                <Badge variant="outline">{client.category}</Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Type:</span>
                <span className="capitalize">{client.clientType}</span>
              </div>

              {client.alertStatus && client.alertStatus !== 'none' && (
                <div className="bg-muted/50 p-4 rounded-lg mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={16} className="text-finance-red" />
                    <span className="font-medium">Alert Status: {client.alertStatus}</span>
                  </div>
                  {client.alertNote && (
                    <p className="text-sm text-muted-foreground">{client.alertNote}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info size={20} />
              Additional Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {transaction.receipt && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Receipt:</span>
                <Button variant="outline" size="sm" asChild>
                  <a href={transaction.receipt} target="_blank" rel="noopener noreferrer">
                    View Receipt
                  </a>
                </Button>
              </div>
            )}
            
            {transaction.deliveryNote && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Delivery Note:</span>
                <Button variant="outline" size="sm" asChild>
                  <a href={transaction.deliveryNote} target="_blank" rel="noopener noreferrer">
                    View Note
                  </a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TransactionDetail;
