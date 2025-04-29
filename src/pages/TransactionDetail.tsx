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
        <h2 className="text-2xl font-bold mb-2">Transacción No Encontrada</h2>
        <p className="text-muted-foreground mb-4">La transacción que buscas no existe.</p>
        <Button asChild>
          <Link to="/operations">Volver a Operaciones</Link>
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
            Volver
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Detalle de Transacción</h1>
        <Badge className={getTypeColor(transaction.type)}>
          {transaction.type === 'sale' ? 'Venta' : transaction.type === 'purchase' ? 'Compra' : transaction.type === 'banking' ? 'Bancario' : transaction.type === 'balance-change' ? 'Ajuste de Saldo' : transaction.type === 'expense' ? 'Gasto' : transaction.type}
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
              <span className="text-muted-foreground">Monto:</span>
              <span className="text-xl font-bold">{formatCurrency(transaction.amount)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Estado:</span>
              <Badge className={getStatusColor(transaction.status)}>
                {transaction.status === 'completed' ? 'Completado' : transaction.status === 'pending' ? 'Pendiente' : transaction.status === 'cancelled' ? 'Cancelado' : transaction.status}
              </Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Fecha:</span>
              <span>{format(new Date(transaction.date), 'PPP')}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Creado:</span>
              <span>{format(new Date(transaction.createdAt), 'PPP')}</span>
            </div>

            {transaction.paymentMethod && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Método de Pago:</span>
                <span>{transaction.paymentMethod}</span>
              </div>
            )}

            {transaction.category && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Categoría:</span>
                <span>{transaction.category}</span>
              </div>
            )}

            <div className="pt-4 border-t">
              <h4 className="font-medium mb-2">Descripción</h4>
              <p className="text-muted-foreground">{transaction.description}</p>
            </div>

            {transaction.notes && (
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2">Notas Adicionales</h4>
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
                <span className="text-muted-foreground">Nombre:</span>
                <Link to={`/clients/${client.id}`} className="hover:underline">
                  {client.name}
                </Link>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Categoría:</span>
                <Badge variant="outline">{client.category}</Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Tipo:</span>
                <span className="capitalize">{client.clientType}</span>
              </div>

              {client.alertStatus && client.alertStatus !== 'none' && (
                <div className="bg-muted/50 p-4 rounded-lg mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={16} className="text-finance-red" />
                    <span className="font-medium">Estado de Alerta: {client.alertStatus}</span>
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
                <span className="text-muted-foreground">Recibo:</span>
                <Button variant="outline" size="sm" asChild>
                  <a href={transaction.receipt} target="_blank" rel="noopener noreferrer">
                    Ver Recibo
                  </a>
                </Button>
              </div>
            )}
            
            {transaction.deliveryNote && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Nota de Entrega:</span>
                <Button variant="outline" size="sm" asChild>
                  <a href={transaction.deliveryNote} target="_blank" rel="noopener noreferrer">
                    Ver Nota
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
