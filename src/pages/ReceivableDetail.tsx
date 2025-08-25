import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Calendar, BadgeDollarSign, Info, User, FileText, Users } from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from '@/lib/utils';
import { StatusBadge } from "@/components/operations/common/StatusBadge";
import { PaymentsList } from "@/components/operations/payments/PaymentsList";
import { PaymentFormModalOptimized } from "@/components/operations/modals/PaymentFormModalOptimized";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getReceivableById, type Receivable as SupabaseReceivable } from "@/integrations/supabase/receivableService";
import { getTransactions, type Transaction as SupabaseTransaction } from "@/integrations/supabase/transactionService";
import type { Transaction as AppTransaction } from "@/types";
import { getClients, type Client as SupabaseClient } from "@/integrations/supabase/clientService";
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { useHistoricalExchangeRates } from '@/hooks/useHistoricalExchangeRates';

interface Receivable {
  id: string;
  clientId: string;
  amount: number;
  dueDate: Date;
  status: string;
  description: string;
  notes: string;
  currency?: string;
}

interface Transaction {
  id: string;
  type: string;
  receivableId?: string;
  clientId?: string;
  amount: number;
  date: string | Date;
  status: string;
  clientName?: string;
  clientType?: string;
  paymentMethod?: string;
  notes?: string;
  currency?: string;
}

interface Client {
  id: string;
  name: string;
  clientType: string;
  category?: string;
  email?: string;
  phone?: string;
}

const ReceivableDetail = () => {
  const { receivableId } = useParams();
  const [receivable, setReceivable] = useState<Receivable | null>(null);
  const [payments, setPayments] = useState<Transaction[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  const { convertVESToUSD } = useExchangeRates();

  // Obtener IDs de pagos en VES para cargar tasas históricas
  const vesPaymentIds = useMemo(() => {
    return payments
      .filter(p => p.currency === 'VES')
      .map(p => p.id);
  }, [payments]);

  const { convertVESToUSDWithHistoricalRate } = useHistoricalExchangeRates(vesPaymentIds);
  
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [receivableData, transactionsData, clientsData] = await Promise.all([
          receivableId ? getReceivableById(receivableId) : null,
          getTransactions(),
          getClients()
        ]);
        if (receivableData) {
          // Mapeo de datos de Supabase a la interfaz Receivable
          const mappedReceivable: Receivable = {
            id: receivableData.id,
            clientId: receivableData.client_id,
            amount: receivableData.amount,
            dueDate: new Date(receivableData.due_date),
            status: receivableData.status || 'pending',
            description: receivableData.description || '',
            notes: receivableData.notes || '',
            currency: receivableData.currency
          };
          setReceivable(mappedReceivable);
          // Pagos asociados
          const receivablePayments = transactionsData
            .filter((t: SupabaseTransaction) => t.type === 'payment' && t.receivable_id === receivableData.id && t.status === 'completed')
            .map((payment: SupabaseTransaction) => {
              const client = payment.client_id ? clientsData.find((c: SupabaseClient) => c.id === payment.client_id) : null;
              return {
                id: payment.id,
                type: payment.type,
                receivableId: payment.receivable_id,
                clientId: payment.client_id,
                amount: payment.amount,
                date: payment.date,
                status: payment.status,
                clientName: client?.name,
                clientType: client?.client_type,
                currency: payment.currency
              };
            });
          setPayments(receivablePayments);
          // Cliente asociado
          const associatedClient = clientsData.find((c: SupabaseClient) => c.id === receivableData.client_id);
          if (associatedClient) {
            setClient({
              id: associatedClient.id,
              name: associatedClient.name,
              clientType: associatedClient.client_type
            });
          }
        }
      } catch (err) {
        console.error("Error al cargar datos de Supabase:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [receivableId]);
  
  // Calcular totales usando tasas históricas (antes de early returns)
  const { totalAmountUSD, totalPaidUSD, remainingAmount, calculatedStatus } = useMemo(() => {
    if (!receivable) return { totalAmountUSD: 0, totalPaidUSD: 0, remainingAmount: 0, calculatedStatus: 'pending' };
    
    // El monto ya está guardado en USD en la base de datos
    const totalAmountUSD = receivable.amount;
      
    let totalPaidUSD = 0;
    payments.reduce((sum, payment) => {
      sum += payment.amount;
      
      // Convertir a USD usando tasa histórica si el pago fue en VES
      if (payment.currency === 'VES') {
        const fallbackRate = convertVESToUSD ? convertVESToUSD(1, 'parallel') : undefined;
        totalPaidUSD += convertVESToUSDWithHistoricalRate(payment.amount, payment.id, fallbackRate);
      } else {
        // Asumir que es USD si no se especifica moneda o si es USD
        totalPaidUSD += payment.amount;
      }
      
      return sum;
    }, 0);
    
    const remainingAmount = Math.max(0, totalAmountUSD - totalPaidUSD);
    const calculatedStatus = totalPaidUSD >= totalAmountUSD ? 'paid' : receivable.status;

    return { totalAmountUSD, totalPaidUSD, remainingAmount, calculatedStatus };
  }, [receivable, payments, convertVESToUSD, convertVESToUSDWithHistoricalRate]);
  
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
  
  const formatDate = (date: Date) => {
    return format(new Date(date), 'dd/MM/yyyy');
  };

  const handlePaymentAdded = (newPayment: AppTransaction) => {
    // Recargar los datos completos para mantener consistencia
    const fetchData = async () => {
      try {
        const [transactionsData, clientsData] = await Promise.all([
          getTransactions(),
          getClients()
        ]);
        
        const receivablePayments = transactionsData
          .filter((t: SupabaseTransaction) => t.type === 'payment' && t.receivable_id === receivableId && t.status === 'completed')
          .map((payment: SupabaseTransaction) => {
            const client = payment.client_id ? clientsData.find((c: SupabaseClient) => c.id === payment.client_id) : null;
            return {
              id: payment.id,
              type: payment.type,
              receivableId: payment.receivable_id,
              clientId: payment.client_id,
              amount: payment.amount,
              date: payment.date,
              status: payment.status,
              clientName: client?.name,
              clientType: client?.client_type,
              currency: payment.currency
            };
          });
        setPayments(receivablePayments);
      } catch (error) {
        console.error('Error al recargar pagos:', error);
      }
    };
    fetchData();
    setShowPaymentModal(false);
  };
  
  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in p-4 sm:p-0">
      {/* Header with back button and title */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Button variant="ghost" size="sm" asChild className="gap-1 self-start">
          <Link to="/all-receivables">
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Volver a Cuentas por Cobrar</span>
            <span className="sm:hidden">Volver</span>
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Detalle Cuenta Cobrar</h1>
          <StatusBadge status={calculatedStatus} />
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Tarjeta Principal - Responsiva */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <BadgeDollarSign size={20} />
              Información de la Cuenta por Cobrar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                  <span className="text-sm text-muted-foreground">Descripción:</span>
                  <span className="font-semibold text-sm sm:text-base break-words">{receivable.description}</span>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                  <span className="text-sm text-muted-foreground">Monto Total:</span>
                  <span className="text-lg sm:text-xl font-bold">{formatCurrency(totalAmountUSD)}</span>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                  <span className="text-sm text-muted-foreground">Monto Pagado:</span>
                  <span className="font-medium text-green-600">{formatCurrency(totalPaidUSD)}</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                  <span className="text-sm text-muted-foreground">Monto Restante:</span>
                  <span className="font-medium text-amber-600">{formatCurrency(remainingAmount)}</span>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                  <span className="text-sm text-muted-foreground">Fecha de Vencimiento:</span>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{formatDate(receivable.dueDate)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <Separator className="my-4" />
            
            {receivable.notes && (
              <div>
                <h4 className="font-medium mb-2 text-sm">Notas</h4>
                <ScrollArea className="max-h-24 sm:max-h-none">
                  <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md break-words">
                    {receivable.notes}
                  </p>
                </ScrollArea>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Tarjeta de Cliente - Responsiva */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <User size={20} />
              Información del Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {client ? (
              <div className="bg-muted/50 p-3 rounded-md">
                <div className="flex items-center gap-2 mb-2">
                  {client.clientType === 'direct' ? (
                    <User className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <Users className="h-4 w-4 flex-shrink-0" />
                  )}
                  <Link to={`/clients/${client.id}`} className="font-medium hover:underline text-sm break-words">
                    {client.name}
                  </Link>
                </div>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className={`text-xs ${client.clientType === 'direct' ? 'bg-slate-50' : 'bg-yellow-50'}`}>
                      {client.clientType === 'direct' ? 'Cliente Directo' : 'Cliente Indirecto'}
                    </Badge>
                    {client.category && (
                      <Badge variant="outline" className="text-xs">
                        {client.category}
                      </Badge>
                    )}
                  </div>
                  {client.email && (
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">Email:</span>
                      <div className="break-all">{client.email}</div>
                    </div>
                  )}
                  {client.phone && (
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">Teléfono:</span> {client.phone}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No hay cliente asociado.</p>
            )}
          </CardContent>
        </Card>
        
        {/* Tarjeta de Pagos - Responsiva */}
        <Card className="col-span-1 lg:col-span-3">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <FileText size={20} />
                Historial de Pagos
              </CardTitle>
              {remainingAmount > 0 && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowPaymentModal(true)}
                  className="flex items-center gap-1 self-start sm:self-auto"
                >
                  <BadgeDollarSign size={16} />
                  <span className="hidden sm:inline">Registrar Pago</span>
                  <span className="sm:hidden">Pago</span>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {payments.length > 0 ? (
              <div className="overflow-hidden">
                {/* Tabla responsive para pantallas grandes */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Moneda</TableHead>
                        <TableHead>Equivalente USD</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Notas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map(payment => {
                        const amountUSD = payment.currency === 'VES' ? 
                          convertVESToUSDWithHistoricalRate(payment.amount, payment.id, convertVESToUSD ? convertVESToUSD(1, 'parallel') : undefined) :
                          payment.amount;
                        
                        return (
                          <TableRow key={payment.id}>
                            <TableCell className="text-sm">{formatDate(new Date(payment.date))}</TableCell>
                            <TableCell className="font-medium text-sm">
                              {payment.currency === 'VES' ? 
                                `Bs. ${new Intl.NumberFormat('es-VE').format(payment.amount)}` : 
                                formatCurrency(payment.amount)
                              }
                            </TableCell>
                            <TableCell>
                              <Badge variant={payment.currency === 'VES' ? 'secondary' : 'default'} className="text-xs">
                                {payment.currency || 'USD'}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium text-green-600 text-sm">
                              {formatCurrency(amountUSD)}
                              {payment.currency === 'VES' && (
                                <span className="text-xs text-muted-foreground block">
                                  (Tasa histórica)
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">{payment.paymentMethod || 'No especificado'}</TableCell>
                            <TableCell>
                              {payment.clientName ? (
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-1">
                                    {payment.clientType === 'indirect' ? (
                                      <Users size={14} className="text-muted-foreground" />
                                    ) : (
                                      <User size={14} className="text-muted-foreground" />
                                    )}
                                    <Link to={`/clients/${payment.clientId}`} className="hover:underline text-sm">
                                      {payment.clientName}
                                    </Link>
                                  </div>
                                  <Badge variant="outline" className="mt-1 text-xs w-fit">
                                    {payment.clientType === 'indirect' ? 'Indirecto' : 'Directo'}
                                  </Badge>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">No especificado</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">{payment.notes || '-'}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Vista de cards para pantallas pequeñas */}
                <div className="md:hidden space-y-4">
                  {payments.map(payment => {
                    const amountUSD = payment.currency === 'VES' ? 
                      convertVESToUSDWithHistoricalRate(payment.amount, payment.id, convertVESToUSD ? convertVESToUSD(1, 'parallel') : undefined) :
                      payment.amount;
                    
                    return (
                      <Card key={payment.id} className="p-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium text-sm">
                                {payment.currency === 'VES' ? 
                                  `Bs. ${new Intl.NumberFormat('es-VE').format(payment.amount)}` : 
                                  formatCurrency(payment.amount)
                                }
                              </div>
                              <div className="text-xs text-green-600 font-medium">
                                {formatCurrency(amountUSD)}
                                {payment.currency === 'VES' && " (Tasa histórica)"}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <Badge variant={payment.currency === 'VES' ? 'secondary' : 'default'} className="text-xs">
                                {payment.currency || 'USD'}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(new Date(payment.date))}
                              </span>
                            </div>
                          </div>
                          
                          <Separator />
                          
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">Método:</span>
                              <div className="font-medium">{payment.paymentMethod || 'No especificado'}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Cliente:</span>
                              {payment.clientName ? (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1">
                                    {payment.clientType === 'indirect' ? (
                                      <Users size={12} className="text-muted-foreground" />
                                    ) : (
                                      <User size={12} className="text-muted-foreground" />
                                    )}
                                    <Link to={`/clients/${payment.clientId}`} className="hover:underline font-medium break-words">
                                      {payment.clientName}
                                    </Link>
                                  </div>
                                  <Badge variant="outline" className="text-xs w-fit">
                                    {payment.clientType === 'indirect' ? 'Indirecto' : 'Directo'}
                                  </Badge>
                                </div>
                              ) : (
                                <div className="text-muted-foreground">No especificado</div>
                              )}
                            </div>
                          </div>
                          
                          {payment.notes && (
                            <>
                              <Separator />
                              <div className="text-xs">
                                <span className="text-muted-foreground">Notas:</span>
                                <div className="mt-1 break-words">{payment.notes}</div>
                              </div>
                            </>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground mb-4">No hay pagos registrados para esta cuenta por cobrar.</p>
                <Button 
                  variant="outline" 
                  className="gap-1"
                  onClick={() => setShowPaymentModal(true)}
                >
                  <BadgeDollarSign size={16} />
                  Registrar Pago
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de registro de pago */}
      <PaymentFormModalOptimized
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onPaymentAdded={handlePaymentAdded}
        receivableId={receivableId}
        defaultClientId={receivable?.clientId}
        maxAmount={remainingAmount > 0 ? remainingAmount : undefined}
      />
    </div>
  );
};

export default ReceivableDetail;
