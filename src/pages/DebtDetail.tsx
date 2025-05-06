import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Calendar, BadgeDollarSign, Info, User, AlertTriangle, FileText, Users } from "lucide-react";
import { format } from "date-fns";
import { mockDetailedDebts, mockTransactions, mockClients } from '@/data/mockData';
import { formatCurrency } from '@/lib/utils';
import { StatusBadge } from "@/components/operations/common/StatusBadge";
import { PaymentsList } from "@/components/operations/payments/PaymentsList";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Transaction, Client } from '@/types';

// Define Debt locally if it's not in @/types
interface Debt {
  id: string;
  creditor: string;
  amount: number;
  dueDate: Date;
  status: string;
  category: string;
  notes: string;
  clientId?: string;
}

// Ensure this interface is defined
interface PaymentWithClientInfo extends Transaction {
  clientName?: string;
  clientType?: 'direct' | 'indirect';
}

const DebtDetail = () => {
  const { debtId } = useParams<{ debtId: string }>();
  const [debt, setDebt] = useState<Debt | null>(null);
  const [payments, setPayments] = useState<PaymentWithClientInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [primaryClient, setPrimaryClient] = useState<Client | null>(null);
  const [payingClients, setPayingClients] = useState<Client[]>([]);
  
  useEffect(() => {
    // Simulamos la carga de datos
    setTimeout(() => {
      const foundDebt = mockDetailedDebts.find(d => d.id === debtId);
      
      if (foundDebt) {
        // Map payments and add client info
        const debtPayments: PaymentWithClientInfo[] = mockTransactions
          .filter(t => t.type === 'payment' && t.debtId === foundDebt.id && t.status === 'completed')
          .map(payment => {
            const client = payment.clientId ? mockClients.find(c => c.id === payment.clientId) : null;
            // No need for type assertion here, the returned object matches PaymentWithClientInfo
            return {
              ...payment,
              clientName: client?.name,
              clientType: client?.clientType
            };
          });
        const totalPaid = debtPayments.reduce((sum, t) => sum + t.amount, 0);
        const remainingAmount = Math.max(0, foundDebt.amount - totalPaid);
        
        // Encontrar el cliente primario (relacionado directamente con la deuda)
        const client = foundDebt.clientId ? mockClients.find(c => c.id === foundDebt.clientId) : null;
        
        // Clientes que han pagado esta deuda (sin duplicados)
        const uniquePayingClients = debtPayments
          .map(p => p.clientId)
          .filter((clientId, index, self) => clientId && self.indexOf(clientId) === index)
          .map(clientId => mockClients.find(c => c.id === clientId))
          .filter(Boolean);
        
        setDebt(foundDebt);
        setPayments(debtPayments);
        setPrimaryClient(client);
        setPayingClients(uniquePayingClients);
      }
      
      setLoading(false);
    }, 500);
  }, [debtId]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!debt) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <h2 className="text-2xl font-bold mb-2">Deuda No Encontrada</h2>
        <p className="text-muted-foreground mb-4">La deuda que buscas no existe.</p>
        <Button asChild>
          <Link to="/all-debts">Volver a Deudas</Link>
        </Button>
      </div>
    );
  }
  
  // Calcular totales
  const totalAmount = debt.amount;
  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const remainingAmount = Math.max(0, totalAmount - totalPaid);
  
  // Estado calculado
  const calculatedStatus = totalPaid >= totalAmount ? 'paid' : debt.status;
  
  const formatDate = (date: Date) => {
    return format(new Date(date), 'dd/MM/yyyy');
  };
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild className="gap-1">
          <Link to="/all-debts">
            <ArrowLeft size={16} />
            Volver a Deudas
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Detalle de Deuda</h1>
        <StatusBadge status={calculatedStatus} />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tarjeta Principal */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BadgeDollarSign size={20} />
              Información de la Deuda
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Acreedor:</span>
              <span className="font-semibold">{debt.creditor}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Categoría:</span>
              <Badge variant="outline">{debt.category}</Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Monto Total:</span>
              <span className="text-xl font-bold">{formatCurrency(totalAmount)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Monto Pagado:</span>
              <span className="font-medium text-green-600">{formatCurrency(totalPaid)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Monto Restante:</span>
              <span className="font-medium text-amber-600">{formatCurrency(remainingAmount)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Fecha de Vencimiento:</span>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{formatDate(debt.dueDate)}</span>
              </div>
            </div>
            
            <Separator className="my-4" />
            
            {debt.notes && (
              <div>
                <h4 className="font-medium mb-2">Notas</h4>
                <p className="text-muted-foreground bg-muted/50 p-3 rounded-md">{debt.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Tarjeta de Clientes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User size={20} />
              Información de Clientes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {primaryClient ? (
              <div>
                <h4 className="font-medium mb-2">Cliente Principal</h4>
                <div className="bg-muted/50 p-3 rounded-md">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <Link to={`/clients/${primaryClient.id}`} className="font-medium hover:underline">
                      {primaryClient.name}
                    </Link>
                  </div>
                  <div className="mt-1 flex gap-2 text-sm text-muted-foreground">
                    <Badge variant="outline" className="bg-slate-50">
                      {primaryClient.clientType === 'direct' ? 'Cliente Directo' : 'Cliente Indirecto'}
                    </Badge>
                    <Badge variant="outline">
                      {primaryClient.category}
                    </Badge>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No hay cliente primario asociado.</p>
            )}
            
            {payingClients.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">Clientes que han pagado</h4>
                <div className="space-y-2">
                  {payingClients.map(client => (
                    <div key={client.id} className="bg-muted/50 p-3 rounded-md">
                      <div className="flex items-center gap-2">
                        {client.clientType === 'direct' ? (
                          <User className="h-4 w-4" />
                        ) : (
                          <Users className="h-4 w-4" />
                        )}
                        <Link to={`/clients/${client.id}`} className="font-medium hover:underline">
                          {client.name}
                        </Link>
                      </div>
                      <div className="mt-1 flex gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline" className={client.clientType === 'direct' ? 'bg-slate-50' : 'bg-yellow-50'}>
                          {client.clientType === 'direct' ? 'Cliente Directo' : 'Cliente Indirecto'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Tarjeta de Pagos */}
        <Card className="col-span-1 lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText size={20} />
              Historial de Pagos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Notas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map(payment => (
                    <TableRow key={payment.id}>
                      <TableCell>{formatDate(payment.date)}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(payment.amount)}</TableCell>
                      <TableCell>{payment.paymentMethod || 'No especificado'}</TableCell>
                      <TableCell>
                        {payment.clientName ? (
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1">
                              {payment.clientType === 'indirect' ? (
                                <Users size={14} className="text-muted-foreground" />
                              ) : (
                                <User size={14} className="text-muted-foreground" />
                              )}
                              <Link to={`/clients/${payment.clientId}`} className="hover:underline">
                                {payment.clientName}
                              </Link>
                            </div>
                            <Badge variant="outline" className="mt-1 text-xs w-fit">
                              {payment.clientType === 'indirect' ? 'Indirecto' : 'Directo'}
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No especificado</span>
                        )}
                      </TableCell>
                      <TableCell>{payment.notes || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No hay pagos registrados para esta deuda.</p>
                <Button variant="outline" className="mt-4">Registrar Pago</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DebtDetail;
