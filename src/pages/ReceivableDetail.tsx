
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Loader2, Plus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { DebtDetailsModal } from '@/components/operations/DebtDetailsModal';
import { cn } from "@/lib/utils";
import { ReceivableFormModal } from '@/components/receivables/ReceivableFormModal';
import { toast } from 'sonner';
import { getReceivableById, type Receivable as SupabaseReceivableType } from "@/integrations/supabase/receivableService";
import { getTransactionsByReceivableId, type Transaction as SupabaseTransactionType } from "@/integrations/supabase/transactionService";
import { getClientById, type Client as SupabaseClientType } from "@/integrations/supabase/clientService";
import { PaymentForm } from '@/components/payments/PaymentForm';
import { Transaction } from '@/types';

const ReceivableDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [receivable, setReceivable] = useState<SupabaseReceivableType | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [client, setClient] = useState<SupabaseClientType | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const receivableData = await getReceivableById(id);
        if (receivableData) {
          setReceivable(receivableData);
          const transactionsData = await getTransactionsByReceivableId(id);
          setTransactions(transactionsData.map(t => ({
            id: t.id,
            type: t.type as Transaction["type"],
            amount: t.amount,
            description: t.description || '',
            date: new Date(t.date),
            clientId: t.client_id,
            status: (t.status || 'pending') as Transaction["status"],
            receipt: t.receipt || '',
            invoice: t.invoice || '',
            deliveryNote: t.delivery_note || '',
            paymentMethod: t.payment_method || '',
            category: t.category || '',
            notes: t.notes || '',
            createdAt: new Date(t.created_at),
            updatedAt: new Date(t.updated_at),
            receivableId: t.receivable_id,
          })));
          const clientData = await getClientById(receivableData.client_id);
          setClient(clientData);
        }
      } catch (error) {
        console.error("Error fetching receivable details:", error);
        toast.error("Error al cargar los detalles de la cuenta por cobrar");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const totalPaid = transactions.filter(t => t.type === 'payment').reduce((sum, t) => sum + t.amount, 0);
  const remainingAmount = receivable ? Math.max(0, receivable.amount - totalPaid) : 0;
  const isPaid = receivable ? totalPaid >= receivable.amount : false;

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleCloseModal = () => {
    setIsDetailsModalOpen(false);
  };

  const handleOpenPaymentModal = () => {
    setIsPaymentModalOpen(true);
  };

  const handleClosePaymentModal = () => {
    setIsPaymentModalOpen(false);
  };

  const handleAddPayment = async (paymentData: {
    amount: number;
    date: Date;
    method: string;
    notes?: string;
    clientId?: string;
  }) => {
    if (!receivable) return;

    try {
      const newPayment: Transaction = {
        id: `temp-${Date.now()}`,
        type: 'payment',
        amount: paymentData.amount,
        description: `Pago para ${receivable.description}`,
        date: paymentData.date,
        clientId: paymentData.clientId || receivable.client_id,
        status: 'completed',
        receipt: '',
        invoice: '',
        deliveryNote: '',
        paymentMethod: paymentData.method,
        category: '',
        notes: paymentData.notes || '',
        createdAt: new Date(),
        updatedAt: new Date(),
        receivableId: receivable.id
      };

      setTransactions(prev => [...prev, newPayment]);
      setIsPaymentModalOpen(false);
      toast.success('Pago registrado exitosamente');
    } catch (error) {
      console.error('Error al registrar el pago:', error);
      toast.error('Error al registrar el pago');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild className="shrink-0">
            <Link to="/all-receivables">
              <ArrowLeft className="h-4 w-4" />
              <span className="ml-2 hidden sm:inline">Volver</span>
            </Link>
          </Button>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
            Detalle de Cuenta por Cobrar
          </h1>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : receivable ? (
        <>
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">{receivable.description}</CardTitle>
              <CardDescription>
                {client ? client.name : 'Cliente Desconocido'}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Monto Total:</span>
                <span className="font-medium">{formatCurrency(receivable.amount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Monto Pagado:</span>
                <span className="font-medium text-green-600">{formatCurrency(totalPaid)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Monto Restante:</span>
                <span className={cn("font-medium", remainingAmount > 0 ? "text-red-600" : "text-green-600")}>
                  {formatCurrency(remainingAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Fecha de Vencimiento:</span>
                <span className="font-medium">{formatDate(new Date(receivable.due_date))}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Estado:</span>
                <Badge variant={isPaid ? "secondary" : "default"}>
                  {isPaid ? "Pagado" : receivable.status}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Transactions Table */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Transacciones</CardTitle>
              <Button size="sm" onClick={handleOpenPaymentModal}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar Pago
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Método</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length > 0 ? (
                    transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>{formatDate(transaction.date)}</TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell>{formatCurrency(transaction.amount)}</TableCell>
                        <TableCell>{transaction.paymentMethod}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4">
                        No hay transacciones registradas para esta cuenta por cobrar.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <PaymentForm
            isOpen={isPaymentModalOpen}
            onClose={handleClosePaymentModal}
            onSubmit={handleAddPayment}
            clientId={receivable.client_id}
            maxAmount={remainingAmount}
          />
        </>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            No se encontró la cuenta por cobrar.
          </CardContent>
        </Card>
      )}

      <ReceivableFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        receivable={receivable}
        clients={client ? [client] : []}
        onSuccess={() => { }}
      />
    </div>
  );
};

export default ReceivableDetail;
