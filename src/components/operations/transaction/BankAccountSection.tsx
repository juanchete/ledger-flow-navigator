
import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface BankAccountSectionProps {
  selectedBank: string;
  selectedAccount: string;
  onBankChange: (bankId: string) => void;
  onAccountChange: (accountId: string) => void;
  availableBanks: string[];
  bankAccounts: any[];
}

export const BankAccountSection: React.FC<BankAccountSectionProps> = ({
  selectedBank,
  selectedAccount,
  onBankChange,
  onAccountChange,
  availableBanks,
  bankAccounts
}) => {
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label>Bank</Label>
        <Select value={selectedBank} onValueChange={onBankChange}>
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
          <Select value={selectedAccount} onValueChange={onAccountChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              {bankAccounts
                .filter(account => account.bank === selectedBank)
                .map(account => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.accountNumber} ({account.currency})
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
};
