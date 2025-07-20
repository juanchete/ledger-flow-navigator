
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { HelpCircle } from "lucide-react";
import { useExchangeRate } from "@/hooks/useExchangeRate";

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
  const { convertVESToUSD } = useExchangeRate();
  
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
              {currency === 'VES' && <TableHead>En USD</TableHead>}
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account) => (
              <TableRow key={account.id}>
                <TableCell className="font-medium">{account.bank}</TableCell>
                <TableCell>{account.accountNumber}</TableCell>
                <TableCell>{formatCurrency(account.amount, account.currency)}</TableCell>
                {currency === 'VES' && (
                  <TableCell>
                    {convertVESToUSD && account.amount > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-sm">
                          ≈ {formatCurrency(convertVESToUSD(account.amount, 'parallel') || 0, 'USD')}
                        </span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help text-muted-foreground/70 hover:text-muted-foreground transition-colors">
                              <HelpCircle className="h-3 w-3" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-sm">
                              <p className="font-medium">Conversión VES → USD</p>
                              <p>Tasa paralela actual</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                1 USD = {new Intl.NumberFormat('es-VE').format(convertVESToUSD(1, 'parallel', true) || 0)} VES
                              </p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    )}
                  </TableCell>
                )}
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
