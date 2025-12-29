import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowUp, ArrowDown, Clock, ExternalLink, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "react-router-dom";

interface TransactionUI {
  id: string;
  type: string;
  amount: number;
  description?: string;
  date: Date;
  clientId?: string;
  status?: string;
  receipt?: string;
  invoice?: string;
  deliveryNote?: string;
  paymentMethod?: string;
  category?: string;
  notes?: string;
  currency?: string;
  exchange_rate?: number;
}

interface ClientUI {
  id: string;
  name: string;
}

interface OperationsListProps {
  transactions: TransactionUI[];
  clients: ClientUI[];
  onRefresh?: () => void;
  lastUpdate?: number;
}

const formatCurrency = (amount: number, currency?: string) => {
  if (currency === 'VES') {
    return `Bs. ${new Intl.NumberFormat('es-VE').format(amount)}`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);
};

const getTransactionTypeLabel = (type: string) => {
  const types: Record<string, string> = {
    'sale': 'Venta',
    'purchase': 'Compra',
    'payment': 'Pago',
    'expense': 'Gasto',
    'cash': 'Efectivo',
    'balance-change': 'Cambio Balance',
    'ingreso': 'Ingreso',
    'outcome': 'Egreso'
  };
  return types[type] || type;
};

const getTransactionIcon = (type: string) => {
  const incomeTypes = ['sale', 'ingreso'];
  const outcomeTypes = ['purchase', 'expense', 'payment', 'outcome'];
  
  if (incomeTypes.includes(type)) {
    return <ArrowUp className="h-4 w-4 text-green-500 flex-shrink-0" />;
  } else if (outcomeTypes.includes(type)) {
    return <ArrowDown className="h-4 w-4 text-red-500 flex-shrink-0" />;
  } else {
    return <Clock className="h-4 w-4 text-blue-500 flex-shrink-0" />;
  }
};

const getAmountColor = (type: string) => {
  const incomeTypes = ['sale', 'ingreso'];
  const outcomeTypes = ['purchase', 'expense', 'payment', 'outcome'];
  
  if (incomeTypes.includes(type)) {
    return 'text-green-600';
  } else if (outcomeTypes.includes(type)) {
    return 'text-red-600';
  } else {
    return 'text-blue-600';
  }
};

export const OperationsList = ({ transactions, clients, onRefresh, lastUpdate }: OperationsListProps) => {
  const getClientName = (clientId: string | undefined) => {
    if (!clientId) return 'N/A';
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : 'Cliente no encontrado';
  };

  // Obtener las últimas 20 transacciones ordenadas por fecha
  const recentTransactions = transactions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 20);

  const formatRelativeDate = (date: Date) => {
    const now = new Date();
    const transactionDate = new Date(date);
    const diffInHours = Math.abs(now.getTime() - transactionDate.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return `Hoy ${format(transactionDate, 'HH:mm')}`;
    } else if (diffInHours < 48) {
      return `Ayer ${format(transactionDate, 'HH:mm')}`;
    } else {
      return format(transactionDate, 'dd MMM yyyy HH:mm', { locale: es });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Operaciones Recientes</CardTitle>
            <CardDescription>
              Últimas {recentTransactions.length} operaciones registradas
              {lastUpdate && (
                <span className="text-xs block mt-1">
                  Actualizado: {format(new Date(lastUpdate), 'HH:mm:ss')}
                </span>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onRefresh}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Actualizar
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link to="/operations" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Ver todas
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {recentTransactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground px-6">
            <Clock className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>No hay operaciones registradas</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] w-full">
            <div className="space-y-1 p-4">
              {recentTransactions.map((transaction, index) => (
                <Link
                  key={transaction.id}
                  to={`/operations/transaction/${transaction.id}`}
                  className={`flex items-center justify-between py-3 px-4 rounded-lg border transition-colors hover:bg-muted/50 cursor-pointer ${
                    index === 0 ? 'bg-primary/5 border-primary/20' : 'border-border'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {getTransactionIcon(transaction.type)}
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">
                          {getTransactionTypeLabel(transaction.type)}
                        </span>
                        <Badge 
                          variant={
                            transaction.status === 'completed' ? 'default' :
                            transaction.status === 'pending' ? 'secondary' :
                            transaction.status === 'cancelled' ? 'destructive' :
                            'outline'
                          } 
                          className="text-xs"
                        >
                          {transaction.status === 'completed' ? 'Completado' :
                           transaction.status === 'pending' ? 'Pendiente' :
                           transaction.status === 'cancelled' ? 'Cancelado' :
                           transaction.status || 'Sin estado'}
                        </Badge>
                      </div>
                      
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <div className="truncate">
                          <span className="font-medium">Desc:</span> {transaction.description || 'Sin descripción'}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="truncate">
                            <span className="font-medium">Cliente:</span> {getClientName(transaction.clientId)}
                          </div>
                          <div className="flex-shrink-0 ml-2">
                            {transaction.paymentMethod && (
                              <Badge variant="outline" className="text-xs">
                                {transaction.paymentMethod === 'cash' ? 'Efectivo' :
                                 transaction.paymentMethod === 'transfer' ? 'Transferencia' :
                                 transaction.paymentMethod === 'card' ? 'Tarjeta' :
                                 transaction.paymentMethod}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right flex-shrink-0 ml-4">
                    <div className={`font-bold text-sm ${getAmountColor(transaction.type)}`}>
                      {formatCurrency(transaction.amount, transaction.currency)}
                    </div>
                    {transaction.exchange_rate && (
                      <div className="text-xs text-muted-foreground">
                        Tasa: {transaction.exchange_rate.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {formatRelativeDate(transaction.date)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            
            {transactions.length > 20 && (
              <div className="border-t bg-muted/30 px-4 py-3">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Mostrando las últimas 20 de {transactions.length} operaciones
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/operations">
                      Ver todas las operaciones
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}; 