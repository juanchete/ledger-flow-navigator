import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { getTransactionsByBankAccountId } from "@/integrations/supabase/transactionService";
import { getBankAccountById } from "@/integrations/supabase/bankAccountService";
import type { Transaction } from "@/integrations/supabase/transactionService";
import type { BankAccount } from "@/integrations/supabase/bankAccountService";
import { TransactionIndicators, getAmountColorClass, getAmountBackgroundClass } from "@/components/operations/TransactionIndicators";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { ArrowLeft, Landmark, HelpCircle } from "lucide-react";

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
  }).format(amount);
};

export default function AccountDetail() {
  const { accountId } = useParams();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const { convertVESToUSD, rates } = useExchangeRates();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      if (!accountId) return;
      try {
        // Obtener información de la cuenta
        const account = await getBankAccountById(accountId);
        setBankAccount(account);
        
        // Obtener transacciones
        const txs = await getTransactionsByBankAccountId(accountId);
        setTransactions(txs);
      } catch (e) {
        console.error('Error fetching data:', e);
        setTransactions([]);
      }
      setLoading(false);
    };
    fetchData();
  }, [accountId]);

  return (
    <div className="space-y-6 p-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/accounts">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Volver
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Detalle de Cuenta</h1>
        </div>
      </div>

      {bankAccount && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Landmark className="h-5 w-5" />
              Información de la Cuenta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Banco</p>
                <p className="font-medium">{bankAccount.bank}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Número de Cuenta</p>
                <p className="font-medium">{bankAccount.account_number}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Moneda</p>
                <Badge variant="outline" className="mt-1">
                  {bankAccount.currency === 'VES' ? '🇻🇪 VES' : '💵 USD'}
                </Badge>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">Saldo Actual</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">
                  {formatCurrency(bankAccount.amount, bankAccount.currency)}
                </p>
                {bankAccount.currency === 'VES' && convertVESToUSD && (
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground">
                      ≈ {formatCurrency(convertVESToUSD(bankAccount.amount, 'parallel') || 0, 'USD')}
                    </span>
                    <Tooltip>
                      <TooltipTrigger>
                        <span className="cursor-help text-muted-foreground/70 hover:text-muted-foreground transition-colors">
                          <HelpCircle className="h-3 w-3" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-sm">
                          <p className="font-medium">Conversión VES → USD</p>
                          <p>Tasa paralela actual</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            1 USD = {rates ? new Intl.NumberFormat('es-VE').format(rates.usd_to_ves_parallel) : 'N/A'} VES
                          </p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Historial de Transacciones</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Cargando transacciones...</div>
          ) : (
            <>
              {transactions.some(t => t.currency && t.currency !== bankAccount?.currency) && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    <strong>Nota:</strong> Algunas transacciones están en una moneda diferente a la de la cuenta. 
                    Los montos se muestran en su moneda original con el símbolo de conversión cuando aplica.
                  </p>
                </div>
              )}
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Comisión</TableHead>
                  <TableHead>Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  // Primero ordenar transacciones por fecha (más antiguas primero) para calcular balances
                  const sortedTransactionsAsc = [...transactions].sort((a, b) => 
                    new Date(a.date).getTime() - new Date(b.date).getTime()
                  );
                  
                  // Calcular el balance inicial: balance actual - suma de todas las transacciones
                  let totalChange = 0;
                  sortedTransactionsAsc.forEach(transaction => {
                    if (transaction.type === 'balance-change') {
                      totalChange += transaction.amount;
                    } else if (['sale', 'payment', 'cash', 'ingreso'].includes(transaction.type || '')) {
                      totalChange += transaction.amount;
                    } else {
                      totalChange -= transaction.amount;
                    }
                  });
                  
                  // El balance inicial es el balance actual menos el cambio total
                  let runningBalance = (bankAccount?.amount || 0) - totalChange;
                  
                  // Calcular el balance después de cada transacción (en orden cronológico)
                  const transactionsWithBalance = sortedTransactionsAsc.map(transaction => {
                    const isIncome = ['sale', 'payment', 'cash', 'ingreso'].includes(transaction.type || '');
                    
                    // Calcular el balance acumulativo
                    if (transaction.type === 'balance-change') {
                      runningBalance += transaction.amount;
                    } else if (isIncome) {
                      runningBalance += transaction.amount;
                    } else {
                      runningBalance -= transaction.amount;
                    }
                    
                    return {
                      ...transaction,
                      balanceAfter: runningBalance
                    };
                  });
                  
                  // Ahora invertir el orden para mostrar las más recientes primero
                  const sortedTransactionsDesc = transactionsWithBalance.reverse();
                  
                  return sortedTransactionsDesc.map((transaction, idx) => {
                    const isIncome = ['sale', 'payment', 'cash', 'ingreso'].includes(transaction.type || '');

                    const getTransactionTypeLabel = (type: string) => {
                      const labels: Record<string, string> = {
                        'purchase': 'Compra',
                        'sale': 'Venta',
                        'cash': 'Efectivo',
                        'balance-change': 'Transferencia',
                        'expense': 'Gasto',
                        'payment': 'Pago',
                        'ingreso': 'Ingreso'
                      };
                      return labels[type] || type;
                    };

                    return (
                      <TableRow key={transaction.id} className={getAmountBackgroundClass(transaction.type || '', true)}>
                        <TableCell>{format(new Date(transaction.date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell className="font-medium">
                          {getTransactionTypeLabel(transaction.type || '')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {transaction.description}
                            {transaction.currency && transaction.currency !== bankAccount?.currency && (
                              <Badge variant="outline" className="text-xs">
                                {transaction.currency}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className={getAmountColorClass(transaction.type || '')}>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <span className="font-medium">
                                {isIncome ? '+' : '-'} {formatCurrency(Math.abs(transaction.amount), transaction.currency || bankAccount?.currency || 'USD')}
                              </span>
                              {((transaction.currency === 'VES' && bankAccount?.currency === 'USD') || 
                                (transaction.currency === 'USD' && bankAccount?.currency === 'VES') ||
                                (transaction.currency === 'VES' && !bankAccount?.currency)) && convertVESToUSD && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <span className="cursor-help text-muted-foreground/70 hover:text-muted-foreground transition-colors">
                                      <HelpCircle className="h-3 w-3" />
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="text-sm">
                                      <p className="font-medium">
                                        {transaction.currency === 'VES' ? 'Equivalente en USD' : 'Equivalente en VES'}
                                      </p>
                                      <p>
                                        ≈ {transaction.currency === 'VES' 
                                          ? formatCurrency(convertVESToUSD(transaction.amount, 'parallel') || 0, 'USD')
                                          : formatCurrency((transaction.amount * (rates?.usd_to_ves_parallel || 0)), 'VES')
                                        }
                                      </p>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Tasa paralela: 1 USD = {rates ? new Intl.NumberFormat('es-VE').format(rates.usd_to_ves_parallel) : 'N/A'} VES
                                      </p>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                            <TransactionIndicators
                              transactionType={transaction.type}
                              commission={transaction.commission}
                              amount={transaction.amount}
                              size="sm"
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          {transaction.commission && transaction.commission > 0 ? (
                            <span className="text-sm text-muted-foreground">
                              {transaction.commission}% ({formatCurrency((transaction.amount * transaction.commission) / 100, transaction.currency || bankAccount?.currency || 'USD')})
                            </span>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div>
                            {formatCurrency(transaction.balanceAfter, bankAccount?.currency || 'USD')}
                            {bankAccount?.currency === 'VES' && convertVESToUSD && (
                              <div className="text-xs text-muted-foreground">
                                ≈ {formatCurrency(convertVESToUSD(transaction.balanceAfter, 'parallel') || 0, 'USD')}
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  });
                })()}
              </TableBody>
            </Table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
