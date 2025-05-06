
import { useState } from "react";
import { mockClients, mockBankAccounts } from "@/data/mockData";
import { TransactionTypeSection } from "./transaction/TransactionTypeSection";
import { AmountInputSection } from "./transaction/AmountInputSection";
import { ClientSelectionSection } from "./transaction/ClientSelectionSection";
import { BankAccountSection } from "./transaction/BankAccountSection";
import { AdditionalFieldsSection } from "./transaction/AdditionalFieldsSection";

const EXCHANGE_RATE = 35.75; // Mock exchange rate USD to VES

// Define interface for bank accounts to resolve the TypeScript error
interface BankAccount {
  id: string;
  bank: string;
  accountNumber: string;
  currency: string;
}

export const TransactionForm = () => {
  const [transactionType, setTransactionType] = useState("");
  const [isUSD, setIsUSD] = useState(true);
  const [amount, setAmount] = useState("");
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedBank, setSelectedBank] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");

  // Type assertion to inform TypeScript about the structure of mockBankAccounts
  const bankAccounts = (mockBankAccounts || []) as BankAccount[];

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
      <TransactionTypeSection 
        selectedType={transactionType}
        onTypeChange={setTransactionType}
      />

      <AmountInputSection 
        amount={amount}
        isUSD={isUSD}
        onAmountChange={setAmount}
        onCurrencyChange={setIsUSD}
        exchangeRate={EXCHANGE_RATE}
      />

      <ClientSelectionSection 
        selectedClient={selectedClient}
        onClientChange={setSelectedClient}
        clients={availableClients}
      />

      <BankAccountSection 
        selectedBank={selectedBank}
        selectedAccount={selectedAccount}
        onBankChange={setSelectedBank}
        onAccountChange={setSelectedAccount}
        availableBanks={availableBanks}
        bankAccounts={bankAccounts}
      />

      <AdditionalFieldsSection 
        description={description}
        category={category}
        notes={notes}
        onDescriptionChange={setDescription}
        onCategoryChange={setCategory}
        onNotesChange={setNotes}
      />
    </div>
  );
};
