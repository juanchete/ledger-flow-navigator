
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Calendar, BadgeDollarSign, Info, User, FileText, Users } from "lucide-react";
import { format } from "date-fns";
import { mockDetailedReceivables, mockTransactions, mockClients } from '@/data/mockData';
import { formatCurrency } from '@/lib/utils';
import { StatusBadge } from "@/components/operations/common/StatusBadge";
import { PaymentsList } from "@/components/operations/payments/PaymentsList";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const ReceivableDetail = () => {
  const { receivableId } = useParams();
  const [receivable, setReceivable] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<any>(null);
  
  useEffect(() => {
    // Simulamos la carga de datos
    setTimeout(() => {
      const foundReceivable = mockDetailedReceivables.find(r => r.id === receivableId);
      
      if (foundReceivable) {
        // Encontrar los pagos asociados a esta cuenta por cobrar
        const receivablePayments = mockTransactions
          .filter(t => t.type === 'payment' && t.receivableId === foundReceivable.id && t.status === 'completed')
          .map(payment => {
            // Si el pago tiene un clientId, buscamos el cliente
            const client = payment.clientId ? mockClients.find(c => c.id === payment.clientId) : null;
            
            return {
              ...payment,
              clientName: client?.name,
              clientType: client?.clientType
            };
          });
        
        // Encontrar el cliente asociado
        const associatedClient = mockClients.find(c => c.id === foundReceivable.clientId);
        
        setReceivable(foundReceivable);
        setPayments(receivablePayments);
        setClient(associatedClient);
      }
      
      setLoading(false);
    }, 500);
  }, [receivableId]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!receivable) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <h2 className="text-2xl font-bold mb-2">Cuenta por Cobrar No Encontrada</h2>
        <p className="text-muted-foreground mb-4">La cuenta por cobrar que buscas no existe.</p>
        <Button asChild>
          <Link to="/all-receivables">Volver a Cuentas por Cobrar</Link>
        </Button>
      </div>
    );
  }
  
  // Calcular totales
  const totalAmount = receivable.amount;
  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const remainingAmount = totalAmount - totalPaid;
  
  // Estado calculado
  const calculatedStatus = totalPaid >= totalAmount ? 'paid' : receivable.status;
  
  const formatDate = (date: Date) => {
    return format(new Date(date), 'dd/MM/yyyy');
  };
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild className="gap-1">
          <Link to="/all-receivables">
            <ArrowLeft size={16} />
            Volver a Cuentas por Cobrar
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Detalle de Cuenta por Cobrar</h1>
        <StatusBadge status={calculatedStatus} />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tarjeta Principal */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BadgeDollarSign size={20} />
              Información de la Cuenta por Cobrar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Descripción:</span>
              <span className="font-semibold">{receivable.description}</span>
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
                <span>{formatDate(receivable.dueDate)}</span>
              </div>
            </div>
            
            <Separator className="my-4" />
            
            {receivable.notes && (
              <div>
                <h4 className="font-medium mb-2">Notas</h4>
                <p className="text-muted-foreground bg-muted/50 p-3 rounded-md">{receivable.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Tarjeta de Cliente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User size={20} />
              Información del Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {client ? (
              <div className="bg-muted/50 p-3 rounded-md">
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
                <div className="mt-2 flex flex-col gap-2">
                  <Badge variant="outline" className={client.clientType === 'direct' ? 'bg-slate-50' : 'bg-yellow-50'}>
                    {client.clientType === 'direct' ? 'Cliente Directo' : 'Cliente Indirecto'}
                  </Badge>
                  <Badge variant="outline">
                    {client.category}
                  </Badge>
                  <div className="text-sm text-muted-foreground mt-2">
                    <span className="font-medium">Email:</span> {client.email}
                  </div>
                  {client.phone && (
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Teléfono:</span> {client.phone}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No hay cliente asociado.</p>
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
                <p className="text-muted-foreground">No hay pagos registrados para esta cuenta por cobrar.</p>
                <Button variant="outline" className="mt-4">Registrar Pago</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReceivableDetail;
