
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
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

const EXCHANGE_RATE = 35.75; // Mock exchange rate USD to VES

export const TransactionForm = () => {
  const [isUSD, setIsUSD] = useState(true);
  const [amount, setAmount] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedBank, setSelectedBank] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("");

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

  const filteredBankAccounts = selectedBank 
    ? mockBankAccounts.filter(account => account.bank === selectedBank)
    : [];

  const availableClients = mockClients || [];

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
        <Label htmlFor="client">Client</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="justify-between"
            >
              {selectedClient
                ? availableClients.find((client) => client.id === selectedClient)?.name || "Select client..."
                : "Select client..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0">
            <Command>
              <CommandInput placeholder="Search clients..." />
              <CommandEmpty>No client found.</CommandEmpty>
              <CommandGroup>
                {availableClients.map((client) => (
                  <CommandItem
                    key={client.id}
                    value={client.id}
                    onSelect={(currentValue) => {
                      setSelectedClient(currentValue === selectedClient ? "" : currentValue);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedClient === client.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {client.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label>Bank Account</Label>
          <Select value={selectedBank} onValueChange={setSelectedBank}>
            <SelectTrigger>
              <SelectValue placeholder="Select bank" />
            </SelectTrigger>
            <SelectContent>
              {Array.from(new Set((mockBankAccounts || []).map(account => account.bank))).map(bank => (
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
                {filteredBankAccounts.map(account => (
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
