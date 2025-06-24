import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Calendar, BadgeDollarSign, Info, User, AlertTriangle, FileText, Users } from "lucide-react";
import { format } from "date-fns";
import { getDebtById } from "@/integrations/supabase/debtService";
import { getPaymentsByDebtId } from "@/integrations/supabase/transactionService";
import { getClientById } from "@/integrations/supabase/clientService";
import { formatCurrency } from '@/lib/utils';
import { StatusBadge } from "@/components/operations/common/StatusBadge";
import { PaymentsList } from "@/components/operations/payments/PaymentsList";
import { PaymentFormModalOptimized } from "@/components/operations/modals/PaymentFormModalOptimized";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { useHistoricalExchangeRates } from '@/hooks/useHistoricalExchangeRates';
import type { Debt } from "@/integrations/supabase/debtService";
import type { Transaction as DBTransaction } from "@/integrations/supabase/transactionService";
import type { Transaction as AppTransaction } from "@/types";
import type { Client } from "@/integrations/supabase/clientService";

// Defino tipos para la UI
interface PaymentWithClientInfo extends DBTransaction {
  clientName?: string;
  clientType?: 'direct' | 'indirect';
  amountUSD?: number; // Monto convertido a USD si el pago fue en VES
}

const DebtDetail = () => {
  const { debtId } = useParams<{ debtId: string }>();
  const [debt, setDebt] = useState<Debt | null>(null);
  const [payments, setPayments] = useState<DBTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [primaryClient, setPrimaryClient] = useState<Client | null>(null);
  const [payingClients, setPayingClients] = useState<Client[]>([]);
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
        // Obtener deuda
        const foundDebt = await getDebtById(debtId!);
        setDebt(foundDebt || null);
        // Obtener pagos
        const debtPayments = await getPaymentsByDebtId(debtId!);
        setPayments(debtPayments);
        // Obtener clientes pagadores y enriquecer pagos
        const uniqueClientIds = Array.from(new Set(debtPayments.map(p => p.client_id).filter(Boolean)));
        const clientsPagadores: Client[] = [];
        const clientMap: Record<string, Client> = {};
        for (const clientId of uniqueClientIds) {
          const c = await getClientById(clientId);
          if (c) {
            clientsPagadores.push(c);
            clientMap[clientId] = c;
          }
        }
        setPayingClients(clientsPagadores);
        // Cliente principal
        let client: Client | null = null;
        if (foundDebt?.client_id) {
          client = await getClientById(foundDebt.client_id);
        }
        setPrimaryClient(client);
      } catch (e) {
        setDebt(null);
        setPayments([]);
        setPrimaryClient(null);
        setPayingClients([]);
      }
      setLoading(false);
    };
    fetchData();
  }, [debtId]);

  // Calcular totales usando tasas históricas (antes de early returns)
  const { totalAmountUSD, totalPaidUSD, remainingAmount, calculatedStatus } = useMemo(() => {
    if (!debt) return { totalAmountUSD: 0, totalPaidUSD: 0, remainingAmount: 0, calculatedStatus: 'pending' };
    
    const totalAmountUSD = debt.currency === 'VES' && convertVESToUSD ? 
      convertVESToUSD(debt.amount, 'parallel') || debt.amount : 
      debt.amount;
      
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
    const calculatedStatus = totalPaidUSD >= totalAmountUSD ? 'paid' : debt.status;

    return { totalAmountUSD, totalPaidUSD, remainingAmount, calculatedStatus };
  }, [debt, payments, convertVESToUSD, convertVESToUSDWithHistoricalRate]);
  
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
  
  const formatDate = (date: Date) => {
    return format(new Date(date), 'dd/MM/yyyy');
  };

  const handlePaymentAdded = (newPayment: AppTransaction) => {
    // Recargar los pagos desde la base de datos para mantener consistencia
    const fetchPayments = async () => {
      try {
        const updatedPayments = await getPaymentsByDebtId(debtId!);
        setPayments(updatedPayments);
      } catch (error) {
        console.error('Error al recargar pagos:', error);
      }
    };
    fetchPayments();
    setShowPaymentModal(false);
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
              <span className="text-xl font-bold">{formatCurrency(totalAmountUSD)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Monto Pagado:</span>
              <span className="font-medium text-green-600">{formatCurrency(totalPaidUSD)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Monto Restante:</span>
              <span className="font-medium text-amber-600">{formatCurrency(remainingAmount)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Fecha de Vencimiento:</span>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{formatDate(new Date(debt.due_date))}</span>
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
                      {primaryClient.client_type === 'direct' ? 'Cliente Directo' : 'Cliente Indirecto'}
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
                        {client.client_type === 'direct' ? (
                          <User className="h-4 w-4" />
                        ) : (
                          <Users className="h-4 w-4" />
                        )}
                        <Link to={`/clients/${client.id}`} className="font-medium hover:underline">
                          {client.name}
                        </Link>
                      </div>
                      <div className="mt-1 flex gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline" className={client.client_type === 'direct' ? 'bg-slate-50' : 'bg-yellow-50'}>
                          {client.client_type === 'direct' ? 'Cliente Directo' : 'Cliente Indirecto'}
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
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText size={20} />
                Historial de Pagos
              </CardTitle>
              {remainingAmount > 0 && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowPaymentModal(true)}
                  className="flex items-center gap-1"
                >
                  <BadgeDollarSign size={16} />
                  Registrar Pago
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {payments.length > 0 ? (
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
                        <TableCell>{formatDate(new Date(payment.date))}</TableCell>
                        <TableCell className="font-medium">
                          {payment.currency === 'VES' ? 
                            `Bs. ${new Intl.NumberFormat('es-VE').format(payment.amount)}` : 
                            formatCurrency(payment.amount)
                          }
                        </TableCell>
                        <TableCell>
                          <Badge variant={payment.currency === 'VES' ? 'secondary' : 'default'}>
                            {payment.currency || 'USD'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-green-600">
                          {formatCurrency(amountUSD)}
                          {payment.currency === 'VES' && (
                            <span className="text-xs text-muted-foreground block">
                              {payment.exchange_rate_id ? '(Tasa histórica)' : '(Tasa actual)'}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{payment.payment_method || 'No especificado'}</TableCell>
                        <TableCell>
                          {payment.client_id && payingClients.find(c => c.id === payment.client_id) ? (
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1">
                                {payingClients.find(c => c.id === payment.client_id)?.client_type === 'indirect' ? (
                                  <Users size={14} className="text-muted-foreground" />
                                ) : (
                                  <User size={14} className="text-muted-foreground" />
                                )}
                                <Link to={`/clients/${payment.client_id}`} className="hover:underline">
                                  {payingClients.find(c => c.id === payment.client_id)?.name}
                                </Link>
                              </div>
                              <Badge variant="outline" className="mt-1 text-xs w-fit">
                                {payingClients.find(c => c.id === payment.client_id)?.client_type === 'indirect' ? 'Indirecto' : 'Directo'}
                              </Badge>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">No especificado</span>
                          )}
                        </TableCell>
                        <TableCell>{payment.notes || '-'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No hay pagos registrados para esta deuda.</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setShowPaymentModal(true)}
                >
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
        debtId={debtId}
        defaultClientId={primaryClient?.id}
        maxAmount={remainingAmount > 0 ? remainingAmount : undefined}
      />
    </div>
  );
};

export default DebtDetail;
