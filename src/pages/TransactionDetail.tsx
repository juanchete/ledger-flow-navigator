import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, BadgeDollarSign, Clock, Info, User, AlertTriangle, Edit } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTransactions } from "@/context/TransactionContext";
import { useClients } from "@/context/ClientContext";
import { Transaction, Client } from "@/types";
import { TransactionFormOptimized } from "@/components/operations/TransactionFormOptimized";

const TransactionDetail = () => {
  const { transactionId } = useParams();
  const navigate = useNavigate();
  const { fetchTransactionById } = useTransactions();
  const { clients } = useClients();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    const fetchTransaction = async () => {
      setIsLoading(true);
      try {
        if (!transactionId) {
          throw new Error("ID de transacción no proporcionado");
        }
        
        const data = await fetchTransactionById(transactionId);
        if (!data) {
          throw new Error("Transacción no encontrada");
        }
        
        // Mapeo de campos snake_case a camelCase y conversión de fechas
        const mappedTransaction: Transaction = {
          id: data.id,
          type: data.type as Transaction["type"],
          amount: data.amount,
          description: data.description,
          date: data.date ? new Date(data.date) : undefined,
          clientId: data.client_id,
          status: data.status as Transaction["status"],
          receipt: data.receipt,
          invoice: data.invoice,
          deliveryNote: data.delivery_note,
          paymentMethod: data.payment_method,
          category: data.category,
          notes: data.notes,
          createdAt: data.created_at ? new Date(data.created_at) : undefined,
          updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
          indirectForClientId: data.indirect_for_client_id,
          debtId: data.debt_id,
          receivableId: data.receivable_id,
          bankAccountId: data.bank_account_id,
          currency: data.currency,
          commission: data.commission,
        };
        setTransaction(mappedTransaction);
        
        // Si la transacción tiene un clientId, buscar los datos del cliente
        if (data.client_id) {
          const clientData = clients.find(client => client.id === data.client_id);
          if (clientData) {
            setClient(clientData);
          }
        }
        
        setError(null);
      } catch (err) {
        console.error("Error al obtener la transacción:", err);
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransaction();
  }, []);

  const handleEditSuccess = () => {
    setIsEditModalOpen(false);
    // Recargar la transacción después de editar
    if (transactionId) {
      fetchTransactionById(transactionId).then(data => {
        if (data) {
          setTransaction({
            id: data.id,
            type: data.type as Transaction["type"],
            amount: data.amount,
            description: data.description,
            date: data.date ? new Date(data.date) : undefined,
            clientId: data.client_id,
            status: data.status as Transaction["status"],
            receipt: data.receipt,
            invoice: data.invoice,
            deliveryNote: data.delivery_note,
            paymentMethod: data.payment_method,
            category: data.category,
            notes: data.notes,
            createdAt: data.created_at ? new Date(data.created_at) : undefined,
            updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
            indirectForClientId: data.indirect_for_client_id,
            debtId: data.debt_id,
            receivableId: data.receivable_id,
            bankAccountId: data.bank_account_id,
            currency: data.currency,
            commission: data.commission,
          });
        }
      });
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <h2 className="text-2xl font-bold mb-2">Cargando transacción...</h2>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <h2 className="text-2xl font-bold mb-2">Transacción No Encontrada</h2>
        <p className="text-muted-foreground mb-4">{error || "La transacción que buscas no existe."}</p>
        <Button asChild>
          <Link to="/operations">Volver a Operaciones</Link>
        </Button>
      </div>
    );
  }
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getTransactionTypeDisplay = (type: string) => {
    switch (type) {
      case 'purchase':
        return { label: 'Compra', color: 'text-red-600', bgColor: 'bg-red-50' };
      case 'sale':
        return { label: 'Venta', color: 'text-green-600', bgColor: 'bg-green-50' };
      case 'cash':
        return { label: 'Efectivo', color: 'text-blue-600', bgColor: 'bg-blue-50' };
      case 'balance-change':
        return { label: 'Cambio de Saldo', color: 'text-purple-600', bgColor: 'bg-purple-50' };
      case 'expense':
        return { label: 'Gasto', color: 'text-orange-600', bgColor: 'bg-orange-50' };
      case 'payment':
        return { label: 'Pago', color: 'text-indigo-600', bgColor: 'bg-indigo-50' };
      default:
        return { label: type, color: 'text-gray-600', bgColor: 'bg-gray-50' };
    }
  };

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'completed':
        return 'Completado';
      case 'pending':
        return 'Pendiente';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status || 'Sin estado';
    }
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
      case 'cash':
        return 'bg-finance-blue text-white';
      case 'balance-change':
        return 'bg-finance-yellow text-finance-gray-dark';
      case 'expense':
        return 'bg-finance-gray text-white';
      case 'payment':
        return 'bg-finance-purple text-white';
      default:
        return '';
    }
  };

  const getAmountColor = (type: string, amount: number) => {
    switch (type) {
      case 'sale':
      case 'cash':
      case 'payment':
        return 'text-green-600'; // Ingresos
      case 'purchase':
      case 'expense':
        return 'text-red-600'; // Egresos
      case 'balance-change':
        return 'text-blue-600'; // Transferencias
      default:
        return amount > 0 ? 'text-green-600' : 'text-red-600';
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
        <div className="flex items-center gap-2">
          <Badge className={getTypeColor(transaction.type)}>
            {getTransactionTypeDisplay(transaction.type).label}
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsEditModalOpen(true)}
            className="gap-1"
          >
            <Edit size={16} />
            Editar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BadgeDollarSign size={20} />
              Información de la Transacción
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Monto:</span>
              <span className={getAmountColor(transaction.type, transaction.amount)}>{formatCurrency(transaction.amount)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Estado:</span>
              <Badge className={getStatusColor(transaction.status)}>
                {getStatusLabel(transaction.status)}
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

            {transaction.commission && transaction.commission > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Comisión:</span>
                <span>{transaction.commission}%</span>
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
                Información del Cliente
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
              Información Adicional
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
            
            {transaction.invoice && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Factura:</span>
                <Button variant="outline" size="sm" asChild>
                  <a href={transaction.invoice} target="_blank" rel="noopener noreferrer">
                    Ver Factura
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

      {/* Modal de edición */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Transacción</DialogTitle>
          </DialogHeader>
          <TransactionFormOptimized
            transaction={transaction}
            isEditing={true}
            onSuccess={handleEditSuccess}
            showCancelButton={true}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TransactionDetail;
