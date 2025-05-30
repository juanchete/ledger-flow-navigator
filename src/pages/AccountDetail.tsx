import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { getTransactionsByBankAccountId } from "@/integrations/supabase/transactionService";
import type { Transaction } from "@/integrations/supabase/transactionService";

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
        <h1 className="text-3xl font-bold tracking-tight">Detalle de Cuenta</h1>
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
                  <TableHead>Descripción</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  let runningBalance = 0;
                  return transactions.map((transaction, idx) => {
                    // Si la transacción tiene balance, úsalo; si no, calcula acumulando
                    if (typeof transaction.balance === 'number') {
                      runningBalance = transaction.balance;
                    } else {
                      runningBalance += transaction.amount;
                    }
                    return (
                      <TableRow key={transaction.id}>
                        <TableCell>{format(new Date(transaction.date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell className={transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'}>
                          {transaction.type === 'credit' ? '+' : '-'} {formatCurrency(Math.abs(transaction.amount))}
                        </TableCell>
                        <TableCell>{formatCurrency(runningBalance)}</TableCell>
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
