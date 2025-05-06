
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDateEs } from "@/lib/utils";
import { toast } from "sonner";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { TransactionForm } from './TransactionForm';

interface Debt {
  id: string;
  creditor: string;
  amount: number;
  dueDate: Date;
  status: string;
  category: string;
  notes: string;
}

interface Receivable {
  id: string;
  clientId: string;
  amount: number;
  dueDate: Date;
  status: string;
  description: string;
  notes: string;
}

interface Payment {
  id: string;
  amount: number;
  date: Date;
  method: string;
  notes?: string;
}

interface DebtDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Debt | Receivable;
  type: 'debt' | 'receivable';
}

export const DebtDetailsModal: React.FC<DebtDetailsModalProps> = ({ 
  isOpen, 
  onClose,
  item,
  type
}) => {
  const [status, setStatus] = useState(item.status);
  const [notes, setNotes] = useState(item.notes);
  
  // Estado para los pagos asociados (en una aplicación real, estos vendrían de la base de datos)
  const [payments, setPayments] = useState<Payment[]>([]);
  
  // Estado para el formulario de nuevo pago
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [newPayment, setNewPayment] = useState<{
    amount: string;
    date: Date;
    method: string;
    notes: string;
  }>({
    amount: '',
    date: new Date(),
    method: 'efectivo',
    notes: ''
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-400 text-yellow-900';
      case 'paid': return 'bg-green-500 text-white';
      case 'overdue': return 'bg-red-500 text-white';
      default: return 'bg-gray-300 text-gray-800';
    }
  };

  const handleSave = () => {
    // En una app real, esto actualizaría la base de datos
    toast.success(`${type === 'debt' ? 'Deuda' : 'Cuenta por cobrar'} actualizada exitosamente`);
    onClose();
  };

  const isDebt = (item: Debt | Receivable): item is Debt => {
    return 'creditor' in item;
  };

  const formatDate = (date: Date) => {
    return formatDateEs(date, 'dd/MM/yyyy');
  };

  const addPayment = () => {
    if (!newPayment.amount || parseFloat(newPayment.amount) <= 0) {
      toast.error("Ingrese un monto válido");
      return;
    }

    const payment: Payment = {
      id: Math.random().toString(36).substr(2, 9), // ID temporal (en una app real sería generado por la base de datos)
      amount: parseFloat(newPayment.amount),
      date: newPayment.date,
      method: newPayment.method,
      notes: newPayment.notes
    };

    setPayments([...payments, payment]);
    
    // Resetear el formulario
    setNewPayment({
      amount: '',
      date: new Date(),
      method: 'efectivo',
      notes: ''
    });
    
    setShowPaymentForm(false);
    
    // En una app real, aquí se actualizaría también el estado de la deuda si está completamente pagada
    toast.success("Pago registrado exitosamente");
  };

  const removePayment = (paymentId: string) => {
    setPayments(payments.filter(p => p.id !== paymentId));
    toast.success("Pago eliminado exitosamente");
  };

  // Calcular totales
  const totalAmount = item.amount;
  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const remainingAmount = totalAmount - totalPaid;

  // Actualizar estado automáticamente basado en pagos
  const updateStatusBasedOnPayments = () => {
    if (totalPaid >= totalAmount) {
      return 'paid';
    } else if (status === 'overdue') {
      return 'overdue';
    } else {
      return 'pending';
    }
  };

  // Estado calculado
  const calculatedStatus = updateStatusBasedOnPayments();
  const [showTransactionModal, setShowTransactionModal] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {type === 'debt' ? 'Detalle de Deuda' : 'Detalle de Cuenta por Cobrar'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-medium">
                {isDebt(item) ? item.creditor : item.description}
              </p>
              <p className="text-sm text-muted-foreground">
                {isDebt(item) ? `Categoría: ${item.category}` : `Cliente ID: ${item.clientId}`}
              </p>
            </div>
            <Badge className={`${getStatusColor(calculatedStatus)} text-sm py-1 px-3`}>
              {calculatedStatus === 'pending' ? 'Pendiente' : 
               calculatedStatus === 'paid' ? 'Pagado' : 
               calculatedStatus === 'overdue' ? 'Vencido' : calculatedStatus}
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Monto Total</Label>
              <p className="text-xl font-bold">{formatCurrency(totalAmount)}</p>
            </div>
            <div>
              <Label>Pagado</Label>
              <p className="text-xl font-semibold text-green-600">{formatCurrency(totalPaid)}</p>
            </div>
            <div>
              <Label>Pendiente</Label>
              <p className="text-xl font-semibold text-amber-600">{formatCurrency(remainingAmount)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Fecha de Vencimiento</Label>
              <p>{formatDate(item.dueDate)}</p>
            </div>
            <div>
              <Label htmlFor="status">Estado</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="paid">Pagado</SelectItem>
                  <SelectItem value="overdue">Vencido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notas</Label>
            <Textarea 
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Sección de pagos asociados */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-4">
              <Label className="text-lg font-medium">Pagos Asociados</Label>
              <Dialog open={showTransactionModal} onOpenChange={setShowTransactionModal}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    <Plus size={16} />
                    Registrar Pago
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Registrar Nuevo Pago</DialogTitle>
                  </DialogHeader>
                  <TransactionForm />
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowTransactionModal(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={() => {
                      toast.success("Pago registrado exitosamente");
                      setShowTransactionModal(false);
                    }}>
                      Registrar Pago
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {payments.length > 0 ? (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {payments.map((payment) => (
                  <div 
                    key={payment.id} 
                    className="flex items-center justify-between bg-background p-3 rounded-md border"
                  >
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{formatCurrency(payment.amount)}</span>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(payment.date), 'dd/MM/yyyy')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-sm capitalize">{payment.method}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-destructive" 
                          onClick={() => removePayment(payment.id)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                      {payment.notes && (
                        <p className="text-xs text-muted-foreground mt-1">{payment.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay pagos registrados. Haga clic en "Registrar Pago" para añadir uno.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Guardar Cambios</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
