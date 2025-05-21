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
import type { Client } from '@/integrations/supabase/clientService';

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
}

export const PaymentFormModal: React.FC<PaymentFormModalProps> = ({
  isOpen,
  onClose,
  onPaymentAdded
}) => {
  const [amount, setAmount] = useState(100);
  const [method, setMethod] = useState('credit_card');
  const [notes, setNotes] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchClients = async () => {
      const data = await getClients();
      setClients(data);
    };
    fetchClients();
  }, []);

  const handleSubmit = async () => {
    setLoading(true);
    const selectedClientData = clients.find(c => c.id === selectedClient);
    try {
      // Registrar el pago en Supabase
      const newTx = await createTransaction({
        id: uuidv4(),
        amount,
        date: new Date().toISOString(),
        description: notes,
        type: 'payment',
        client_id: selectedClient || null,
        payment_method: method,
        status: 'completed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // Otros campos opcionales en null
        category: null,
        currency: null,
        debt_id: null,
        receivable_id: null,
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
      resetForm();
    } catch (e) {
      toast.error('Error al registrar el pago');
    }
    setLoading(false);
  };

  const resetForm = () => {
    setAmount(100);
    setMethod('credit_card');
    setNotes('');
    setSelectedClient('');
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
          <DialogTitle>Registrar Nuevo Pago</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="amount">Monto</Label>
            <Input 
              id="amount"
              type="number" 
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
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
