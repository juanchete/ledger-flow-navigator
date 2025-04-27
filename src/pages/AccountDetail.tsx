
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

interface Transaction {
  id: string;
  date: Date;
  description: string;
  amount: number;
  type: "credit" | "debit";
  balance: number;
}

// Mock data - replace with real data later
const mockTransactions: Transaction[] = [
  {
    id: "1",
    date: new Date("2025-04-26"),
    description: "Depósito en efectivo",
    amount: 1000,
    type: "credit",
    balance: 5000
  },
  {
    id: "2",
    date: new Date("2025-04-25"),
    description: "Transferencia saliente",
    amount: -500,
    type: "debit",
    balance: 4000
  },
  // Add more mock transactions as needed
];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export default function AccountDetail() {
  const { accountId } = useParams();
  
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
              {mockTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>{format(transaction.date, 'dd/MM/yyyy')}</TableCell>
                  <TableCell>{transaction.description}</TableCell>
                  <TableCell className={transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'}>
                    {transaction.type === 'credit' ? '+' : '-'} {formatCurrency(Math.abs(transaction.amount))}
                  </TableCell>
                  <TableCell>{formatCurrency(transaction.balance)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
