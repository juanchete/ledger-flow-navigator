import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { mockClients, mockBankAccounts } from "@/data/mockData";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, Plus, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";

const EXCHANGE_RATE = 35.75; // Mock exchange rate USD to VES

// Define interface for bank accounts to resolve the TypeScript error
interface BankAccount {
  id: string;
  bank: string;
  accountNumber: string;
  currency: string;
}

export const TransactionForm = () => {
  const [isUSD, setIsUSD] = useState(true);
  const [amount, setAmount] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedBank, setSelectedBank] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [isNewClientDialogOpen, setIsNewClientDialogOpen] = useState(false);

  // Type assertion to inform TypeScript about the structure of mockBankAccounts
  const bankAccounts = (mockBankAccounts || []) as BankAccount[];

  const handleAmountChange = (value: string) => {
    setAmount(value);
  };

  const getConvertedAmount = () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return "0.00";
    
    if (isUSD) {
      return (numAmount * EXCHANGE_RATE).toFixed(2);
    }
    return (numAmount / EXCHANGE_RATE).toFixed(2);
  };

  const handleCreateClient = () => {
    toast.success("Client created successfully!");
    setIsNewClientDialogOpen(false);
  };

  // Ensure we have arrays even if the data is undefined or not iterable
  console.log('mockClients:', mockClients);
  let availableClients: typeof mockClients = [];
  try {
    availableClients = Array.isArray(mockClients) ? mockClients : [];
  } catch (e) {
    availableClients = [];
  }
  console.log('availableClients:', availableClients);

  // Get unique banks for the bank selection dropdown
  const availableBanks = Array.from(
    new Set(bankAccounts.map(account => account.bank))
  );

  return (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="transaction-type">Transaction Type</Label>
        <Select>
          <SelectTrigger id="transaction-type">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="purchase">Purchase</SelectItem>
            <SelectItem value="sale">Sale</SelectItem>
            <SelectItem value="banking">Banking</SelectItem>
            <SelectItem value="balance-change">Balance Change</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="amount">Amount</Label>
          <div className="flex items-center gap-2">
            <span className="text-sm">VES</span>
            <Switch
              checked={isUSD}
              onCheckedChange={setIsUSD}
            />
            <span className="text-sm">USD</span>
          </div>
        </div>
        <Input
          id="amount"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          value={amount}
          onChange={(e) => handleAmountChange(e.target.value)}
        />
        <div className="text-sm text-muted-foreground">
          Equivalent: {isUSD ? "VES " : "USD "}{getConvertedAmount()}
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="client">Cliente</Label>
        <div className="flex gap-2">
          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger id="client">
              <SelectValue placeholder="Selecciona un cliente" />
            </SelectTrigger>
            <SelectContent>
              {Array.isArray(mockClients) && mockClients.length > 0 ? (
                mockClients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="" disabled>No hay clientes disponibles</SelectItem>
              )}
            </SelectContent>
          </Select>
          <Dialog open={isNewClientDialogOpen} onOpenChange={setIsNewClientDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="shrink-0">
                <UserPlus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
              <DialogHeader>
                <DialogTitle>Agregar nuevo cliente</DialogTitle>
                <DialogDescription>
                  Completa el formulario para agregar un nuevo cliente al sistema.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nombre del cliente</Label>
                  <Input id="name" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input id="phone" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="category">Categoría</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona la categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="company">Empresa</SelectItem>
                      <SelectItem value="non-profit">ONG</SelectItem>
                      <SelectItem value="government">Gobierno</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Tipo de cliente</Label>
                  <RadioGroup defaultValue="direct" className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="direct" id="direct" />
                      <Label htmlFor="direct">Directo</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="indirect" id="indirect" />
                      <Label htmlFor="indirect">Indirecto</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsNewClientDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreateClient}>Crear cliente</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label>Bank</Label>
          <Select value={selectedBank} onValueChange={setSelectedBank}>
            <SelectTrigger>
              <SelectValue placeholder="Select bank" />
            </SelectTrigger>
            <SelectContent>
              {availableBanks.map(bank => (
                <SelectItem key={bank} value={bank}>{bank}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedBank && (
          <div className="grid gap-2">
            <Label>Account</Label>
            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts.filter(account => account.bank === selectedBank).map(account => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.accountNumber} ({account.currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="description">Description</Label>
        <Input id="description" placeholder="Enter transaction description" />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="category">Category</Label>
        <Input id="category" placeholder="e.g. Office supplies" />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" placeholder="Additional notes..." />
      </div>
    </div>
  );
};
