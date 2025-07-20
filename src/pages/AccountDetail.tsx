import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { getTransactionsByBankAccountId } from "@/integrations/supabase/transactionService";
import type { Transaction } from "@/integrations/supabase/transactionService";
import { TransactionIndicators, getAmountColorClass, getAmountBackgroundClass } from "@/components/operations/TransactionIndicators";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export default function AccountDetail() {
  const { accountId } = useParams();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      if (!accountId) return;
      try {
        const txs = await getTransactionsByBankAccountId(accountId);
        setTransactions(txs);
      } catch (e) {
        setTransactions([]);
      }
      setLoading(false);
    };
    fetchTransactions();
  }, [accountId]);

  return (
    <div className="space-y-6 p-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Detalle Cuenta</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Transacciones</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Cargando transacciones...</div>
          ) : (
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
                  let runningBalance = 0;
                  return transactions.map((transaction, idx) => {
                    // Calculate running balance based on transaction type
                    const isIncome = ['sale', 'payment', 'cash', 'ingreso'].includes(transaction.type || '');
                    if (isIncome) {
                      runningBalance += transaction.amount;
                    } else if (transaction.type !== 'balance-change') {
                      runningBalance -= transaction.amount;
                    }
                    
                    // For balance-change, the amount is already adjusted by the trigger
                    if (transaction.type === 'balance-change') {
                      // For balance changes, the trigger handles the amount adjustment
                      // so we just add/subtract the amount as stored
                      runningBalance += transaction.amount;
                    }

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
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell className={getAmountColorClass(transaction.type || '')}>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {isIncome ? '+' : '-'} {formatCurrency(Math.abs(transaction.amount))}
                            </span>
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
                              {transaction.commission}% ({formatCurrency((transaction.amount * transaction.commission) / 100)})
                            </span>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{formatCurrency(runningBalance)}</TableCell>
                      </TableRow>
                    );
                  });
                })()}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
