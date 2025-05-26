
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface BankAccount {
  id: string;
  bank: string;
  accountNumber: string;
  amount: number;
  currency: "USD" | "VES";
}

interface BankAccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency: "USD" | "VES";
  accounts: BankAccount[];
}

const formatCurrency = (amount: number, currency: "USD" | "VES") => {
  return currency === "USD"
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
    : `Bs. ${new Intl.NumberFormat('es-VE').format(amount)}`;
};

export function BankAccountsModal({ isOpen, onClose, currency, accounts }: BankAccountsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Cuentas en {currency === "USD" ? "Dólares" : "Bolívares"}</span>
            <Button variant="outline" size="sm" asChild>
              <Link to="/accounts">Gestionar Cuentas</Link>
            </Button>
          </DialogTitle>
        </DialogHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Banco</TableHead>
              <TableHead>Cuenta</TableHead>
              <TableHead>Monto Disponible</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account) => (
              <TableRow key={account.id}>
                <TableCell className="font-medium">{account.bank}</TableCell>
                <TableCell>{account.accountNumber}</TableCell>
                <TableCell>{formatCurrency(account.amount, account.currency)}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/accounts/${account.id}`}>Ver detalle</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}
