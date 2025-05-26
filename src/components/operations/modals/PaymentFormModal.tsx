import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ClientSelectionSection } from '../transaction/ClientSelectionSection';
import { toast } from "sonner";
import { v4 as uuidv4 } from 'uuid';
import { getClients } from '@/integrations/supabase/clientService';
import { createTransaction } from '@/integrations/supabase/transactionService';
import { getBankAccounts } from '@/integrations/supabase/bankAccountService';
import { useTransactions } from '@/context/TransactionContext';
import type { Client } from '@/integrations/supabase/clientService';
import type { BankAccount } from '@/integrations/supabase/bankAccountService';

interface Payment {
  id: string;
  amount: number;
  date: Date;
  method: string;
  clientId?: string;
  clientName?: string;
  clientType?: 'direct' | 'indirect';
  notes?: string;
}

interface PaymentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentAdded: (payment: Payment) => void;
  receivableId?: string; // ID de la cuenta por cobrar para asociar el pago
  debtId?: string; // ID de la deuda para asociar el pago
  defaultClientId?: string; // Cliente predeterminado
  maxAmount?: number; // Monto máximo permitido (monto restante)
}

export const PaymentFormModal: React.FC<PaymentFormModalProps> = ({
  isOpen,
  onClose,
  onPaymentAdded,
  receivableId,
  debtId,
  defaultClientId,
  maxAmount
}) => {
  const [amount, setAmount] = useState(100);
  const [method, setMethod] = useState('credit_card');
  const [notes, setNotes] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedBankAccount, setSelectedBankAccount] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Usar el contexto de transacciones para actualizar automáticamente la lista
  const { refetchTransactions } = useTransactions();

  useEffect(() => {
    const fetchData = async () => {
      const [clientsData, bankAccountsData] = await Promise.all([
        getClients(),
        getBankAccounts()
      ]);
      setClients(clientsData);
      setBankAccounts(bankAccountsData);
    };
    fetchData();
  }, []);

  // Establecer cliente predeterminado cuando se proporciona
  useEffect(() => {
    if (defaultClientId && isOpen) {
      setSelectedClient(defaultClientId);
    }
  }, [defaultClientId, isOpen]);

  // Establecer monto máximo cuando se proporciona
  useEffect(() => {
    if (maxAmount && isOpen) {
      setAmount(Math.min(100, maxAmount));
    }
  }, [maxAmount, isOpen]);

  const handleSubmit = async () => {
    // Validar monto máximo si se proporciona
    if (maxAmount && amount > maxAmount) {
      toast.error(`El monto no puede exceder ${maxAmount.toFixed(2)}`);
      return;
    }

    // Validar que se haya seleccionado una cuenta bancaria
    if (!selectedBankAccount) {
      toast.error('Debe seleccionar una cuenta bancaria');
      return;
    }

    setLoading(true);
    const selectedClientData = clients.find(c => c.id === selectedClient);
    try {
      // Registrar el pago en Supabase
      const newTx = await createTransaction({
        id: uuidv4(),
        amount,
        date: new Date().toISOString(),
        description: notes || `Pago ${receivableId ? 'para cuenta por cobrar' : debtId ? 'para deuda' : ''}`,
        type: 'payment',
        client_id: selectedClient || null,
        payment_method: method,
        status: 'completed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // Asociar con la cuenta por cobrar o deuda si se proporciona
        receivable_id: receivableId || null,
        debt_id: debtId || null,
        // Asociar con la cuenta bancaria seleccionada
        bank_account_id: selectedBankAccount,
        // Otros campos opcionales en null
        category: null,
        currency: null,
        indirect_for_client_id: null,
        invoice: null,
        notes,
        receipt: null,
        delivery_note: null,
        exchange_rate_id: null,
      });
      
      // Llamar callback con el pago creado (adaptado al tipo Payment)
      onPaymentAdded({
        id: newTx.id,
        amount: newTx.amount,
        date: new Date(newTx.date),
        method: newTx.payment_method || '',
        notes: newTx.notes || '',
        clientId: newTx.client_id || undefined,
        clientName: selectedClientData?.name,
        clientType: selectedClientData?.client_type as 'direct' | 'indirect',
      });
      
      toast.success('Pago registrado exitosamente');
      
      // Actualizar el contexto de transacciones para refrescar automáticamente las listas
      await refetchTransactions();
      
      resetForm();
      onClose();
    } catch (e) {
      console.error('Error al registrar el pago:', e);
      toast.error('Error al registrar el pago');
    }
    setLoading(false);
  };

  const resetForm = () => {
    setAmount(maxAmount ? Math.min(100, maxAmount) : 100);
    setMethod('credit_card');
    setNotes('');
    setSelectedBankAccount('');
    if (!defaultClientId) {
      setSelectedClient('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        resetForm();
        onClose();
      }
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {receivableId ? 'Registrar Pago para Cuenta por Cobrar' : 
             debtId ? 'Registrar Pago para Deuda' : 
             'Registrar Nuevo Pago'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="amount">Monto</Label>
            <Input 
              id="amount"
              type="number" 
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              max={maxAmount}
            />
            {maxAmount && (
              <p className="text-sm text-muted-foreground">
                Monto máximo: {maxAmount.toFixed(2)}
              </p>
            )}
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="method">Método de Pago</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger id="method">
                <SelectValue placeholder="Selecciona un método" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="credit_card">Tarjeta de Crédito</SelectItem>
                <SelectItem value="debit_card">Tarjeta de Débito</SelectItem>
                <SelectItem value="cash">Efectivo</SelectItem>
                <SelectItem value="transfer">Transferencia</SelectItem>
                <SelectItem value="check">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="bankAccount">Cuenta Bancaria *</Label>
            <Select value={selectedBankAccount} onValueChange={setSelectedBankAccount}>
              <SelectTrigger id="bankAccount">
                <SelectValue placeholder="Selecciona la cuenta donde se depositará" />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.bank} - {account.account_number} ({account.currency})
                    <span className="ml-2 text-muted-foreground">
                      Saldo: {account.currency === 'USD' 
                        ? `$${account.amount.toLocaleString()}` 
                        : `Bs. ${account.amount.toLocaleString()}`}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              El pago se depositará en la cuenta seleccionada y se actualizará automáticamente el saldo.
            </p>
          </div>
          
          <ClientSelectionSection 
            selectedClient={selectedClient}
            onClientChange={setSelectedClient}
          />
          
          <div className="grid gap-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea 
              id="notes" 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Información adicional sobre el pago"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Registrando...' : 'Registrar Pago'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
