import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, BadgeDollarSign, Clock, Info, User, AlertTriangle, Edit, HelpCircle, Calculator, Landmark, CreditCard, Receipt, Percent, FileText, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTransactions } from "@/context/TransactionContext";
import { useClients } from "@/context/ClientContext";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import { Transaction, Client } from "@/types";
import { TransactionFormOptimized } from "@/components/operations/TransactionFormOptimized";
import { TransactionIndicators, getAmountColorClass } from "@/components/operations/TransactionIndicators";
import { getBankAccounts } from "@/integrations/supabase/bankAccountService";
import { getDebtById } from "@/integrations/supabase/debtService";
import { getReceivableById } from "@/integrations/supabase/receivableService";
import { getInvoices, getInvoice } from "@/integrations/supabase/invoiceService";
import { InvoiceGenerator } from "@/components/invoice/InvoiceGenerator";
import { GeneratedInvoice } from "@/types/invoice";

const TransactionDetail = () => {
  const { transactionId } = useParams();
  const navigate = useNavigate();
  const { fetchTransactionById } = useTransactions();
  const { clients } = useClients();
  const { convertVESToUSD } = useExchangeRate();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [bankAccount, setBankAccount] = useState<any>(null);
  const [destinationBankAccount, setDestinationBankAccount] = useState<any>(null);
  const [debt, setDebt] = useState<any>(null);
  const [receivable, setReceivable] = useState<any>(null);
  const [invoice, setInvoice] = useState<GeneratedInvoice | null>(null);
  const [rawTransactionData, setRawTransactionData] = useState<any>(null); // Para campos adicionales
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
        
        // Guardar los datos crudos para campos adicionales
        setRawTransactionData(data);
        
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
          exchangeRateId: data.exchange_rate_id,
        };
        setTransaction(mappedTransaction);
        
        // Si la transacción tiene un clientId, buscar los datos del cliente
        if (data.client_id) {
          const clientData = clients.find(client => client.id === data.client_id);
          if (clientData) {
            setClient(clientData);
          }
        }
        
        // Cargar información adicional
        const loadAdditionalData = async () => {
          try {
            // Cargar cuentas bancarias
            if (data.bank_account_id || data.destination_bank_account_id) {
              const accounts = await getBankAccounts();
              if (data.bank_account_id) {
                const account = accounts.find(acc => acc.id === data.bank_account_id);
                setBankAccount(account);
              }
              if (data.destination_bank_account_id) {
                const destAccount = accounts.find(acc => acc.id === data.destination_bank_account_id);
                setDestinationBankAccount(destAccount);
              }
            }
            
            // Cargar deuda si existe
            if (data.debt_id) {
              const debtData = await getDebtById(data.debt_id);
              setDebt(debtData);
            }
            
            // Cargar cuenta por cobrar si existe
            if (data.receivable_id) {
              const receivableData = await getReceivableById(data.receivable_id);
              setReceivable(receivableData);
            }
            
            // Cargar factura si existe
            try {
              const invoices = await getInvoices();
              const transactionInvoice = invoices.find(inv => inv.transactionId === data.id);
              if (transactionInvoice) {
                const fullInvoice = await getInvoice(transactionInvoice.id);
                setInvoice(fullInvoice);
              }
            } catch (err) {
              console.error("Error loading invoice:", err);
            }
          } catch (err) {
            console.error("Error loading additional data:", err);
          }
        };
        
        loadAdditionalData();
        
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
            exchangeRateId: data.exchange_rate_id,
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
  
  const formatCurrency = (amount: number, currency: string = 'USD') => {
    if (currency === 'VES') {
      return `Bs. ${new Intl.NumberFormat('es-VE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount)}`;
    }
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
            {/* Sección de Montos y Cálculos */}
            <div className="bg-muted/30 p-4 rounded-lg space-y-3">
              <h4 className="font-medium flex items-center gap-2 mb-3">
                <Calculator className="h-4 w-4" />
                Desglose de Montos
              </h4>
              
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Monto Original:</span>
                <div className="flex items-center gap-1">
                  <span className={`font-medium ${getAmountColorClass(transaction.type)}`}>
                    {formatCurrency(transaction.amount, transaction.currency || 'USD')}
                  </span>
                  {transaction.currency === 'VES' && convertVESToUSD && (
                    <Tooltip>
                      <TooltipTrigger>
                        <span className="cursor-help text-muted-foreground/70 hover:text-muted-foreground transition-colors">
                          <HelpCircle className="h-3.5 w-3.5" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-sm">
                          <p className="font-medium">Equivalente en USD</p>
                          <p>≈ {formatCurrency(convertVESToUSD(transaction.amount, 'parallel') || 0, 'USD')}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Tasa paralela: 1 USD = {new Intl.NumberFormat('es-VE').format(convertVESToUSD(1, 'parallel', true) || 0)} VES
                          </p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>

              {transaction.commission && transaction.commission > 0 && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Percent className="h-3 w-3" />
                      Comisión Bancaria ({transaction.commission}%):
                    </span>
                    <span className="text-red-600 font-medium">
                      + {formatCurrency((transaction.amount * transaction.commission) / 100, transaction.currency || 'USD')}
                    </span>
                  </div>
                  
                  <div className="border-t pt-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Total Debitado de la Cuenta:</span>
                      <span className="font-bold text-lg text-red-600">
                        {formatCurrency(transaction.amount + (transaction.amount * transaction.commission) / 100, transaction.currency || 'USD')}
                      </span>
                    </div>
                    {transaction.currency === 'VES' && convertVESToUSD && (
                      <div className="flex justify-between items-center text-sm text-muted-foreground mt-1">
                        <span>Total Debitado en USD:</span>
                        <span>
                          ≈ {formatCurrency(convertVESToUSD(transaction.amount + (transaction.amount * transaction.commission) / 100, 'parallel') || 0, 'USD')}
                        </span>
                      </div>
                    )}
                  </div>
                </>
              )}
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

            {transaction.currency && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Moneda:</span>
                <Badge variant="outline">
                  {transaction.currency === 'VES' ? '🇻🇪 VES' : '💵 USD'}
                </Badge>
              </div>
            )}

            {transaction.paymentMethod && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Método de Pago:</span>
                <span>{transaction.paymentMethod}</span>
              </div>
            )}

            {transaction.installments && transaction.installments > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Número de Cuotas:</span>
                <Badge variant="secondary">{transaction.installments} cuotas</Badge>
              </div>
            )}

            {rawTransactionData?.transfer_count && rawTransactionData.transfer_count > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Número de Transferencias:</span>
                <Badge variant="secondary">{rawTransactionData.transfer_count} {rawTransactionData.transfer_count === 1 ? 'transferencia' : 'transferencias'}</Badge>
              </div>
            )}

            {rawTransactionData?.exchange_rate_id && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Tasa de Cambio:</span>
                <Badge variant="outline">
                  {rawTransactionData.exchange_rate ? `Bs. ${rawTransactionData.exchange_rate}/USD` : 'Aplicada'}
                </Badge>
              </div>
            )}

            {transaction.category && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Categoría:</span>
                <span>{transaction.category}</span>
              </div>
            )}

            {/* Información de Cuentas Bancarias */}
            {(bankAccount || destinationBankAccount) && (
              <div className="pt-4 border-t space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Landmark className="h-4 w-4" />
                  Cuentas Bancarias
                </h4>
                
                {bankAccount && (
                  <div className="bg-muted/30 p-3 rounded-md">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium">Cuenta Origen:</p>
                        <p className="text-sm text-muted-foreground">{bankAccount.bank}</p>
                        <p className="text-xs text-muted-foreground">{bankAccount.account_number}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {bankAccount.currency === 'VES' ? '🇻🇪 VES' : '💵 USD'}
                      </Badge>
                    </div>
                  </div>
                )}
                
                {destinationBankAccount && (
                  <div className="bg-muted/30 p-3 rounded-md">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium">Cuenta Destino:</p>
                        <p className="text-sm text-muted-foreground">{destinationBankAccount.bank}</p>
                        <p className="text-xs text-muted-foreground">{destinationBankAccount.account_number}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {destinationBankAccount.currency === 'VES' ? '🇻🇪 VES' : '💵 USD'}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Información de Deuda */}
            {debt && (
              <div className="pt-4 border-t">
                <h4 className="font-medium flex items-center gap-2 mb-3">
                  <Receipt className="h-4 w-4" />
                  Deuda Relacionada
                </h4>
                <div className="bg-red-50 p-3 rounded-md space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Acreedor:</span>
                    <span className="text-sm font-medium">{debt.creditor}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Monto Original:</span>
                    <span className="text-sm font-medium">
                      {formatCurrency(debt.amount, debt.currency || 'USD')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Estado:</span>
                    <Badge variant={debt.status === 'pending' ? 'destructive' : 'default'} className="text-xs">
                      {debt.status === 'pending' ? 'Pendiente' : 'Pagado'}
                    </Badge>
                  </div>
                  {debt.due_date && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Vencimiento:</span>
                      <span className="text-sm">{format(new Date(debt.due_date), 'dd/MM/yyyy')}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Información de Cuenta por Cobrar */}
            {receivable && (
              <div className="pt-4 border-t">
                <h4 className="font-medium flex items-center gap-2 mb-3">
                  <CreditCard className="h-4 w-4" />
                  Cuenta por Cobrar Relacionada
                </h4>
                <div className="bg-green-50 p-3 rounded-md space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Deudor:</span>
                    <span className="text-sm font-medium">{receivable.debtor}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Monto Original:</span>
                    <span className="text-sm font-medium">
                      {formatCurrency(receivable.amount, receivable.currency || 'USD')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Estado:</span>
                    <Badge variant={receivable.status === 'pending' ? 'destructive' : 'default'} className="text-xs">
                      {receivable.status === 'pending' ? 'Pendiente' : 'Cobrado'}
                    </Badge>
                  </div>
                  {receivable.due_date && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Vencimiento:</span>
                      <span className="text-sm">{format(new Date(receivable.due_date), 'dd/MM/yyyy')}</span>
                    </div>
                  )}
                </div>
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

            {rawTransactionData?.denominations && (
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2">Denominaciones</h4>
                <div className="bg-muted/30 p-3 rounded-md">
                  <pre className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {JSON.stringify(rawTransactionData.denominations, null, 2)}
                  </pre>
                </div>
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

        {invoice && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText size={20} />
                Factura Generada
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/30 p-4 rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Número de Factura:</span>
                  <span className="font-mono font-medium">{invoice.invoiceNumber}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Fecha de Emisión:</span>
                  <span>{format(new Date(invoice.invoiceDate), 'dd/MM/yyyy')}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Fecha de Vencimiento:</span>
                  <span>{format(new Date(invoice.dueDate), 'dd/MM/yyyy')}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Cliente:</span>
                  <span>{invoice.clientName}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Monto Total:</span>
                  <span className="font-medium text-lg">
                    {invoice.currency} {invoice.totalAmount.toLocaleString('es-VE', { 
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2 
                    })}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Estado:</span>
                  <Badge variant={
                    invoice.status === 'paid' ? 'success' : 
                    invoice.status === 'sent' ? 'default' : 
                    invoice.status === 'cancelled' ? 'destructive' : 'secondary'
                  }>
                    {invoice.status === 'draft' ? 'Borrador' :
                     invoice.status === 'sent' ? 'Enviada' :
                     invoice.status === 'paid' ? 'Pagada' : 'Cancelada'}
                  </Badge>
                </div>
              </div>
              
              <div className="flex justify-center pt-2">
                {invoice.company && invoice.lineItems && (
                  <InvoiceGenerator
                    invoice={invoice}
                    company={invoice.company}
                    lineItems={invoice.lineItems}
                    fileName={`factura-${invoice.invoiceNumber}.pdf`}
                  />
                )}
              </div>
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
