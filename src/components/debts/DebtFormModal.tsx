
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { toast } from "@/components/ui/sonner";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createDebt, updateDebt, type NewDebt, type UpdatedDebt, type Debt } from "@/integrations/supabase/debtService";

const debtSchema = z.object({
  creditor: z.string().min(1, "Acreedor es requerido"),
  client_id: z.string().optional(),
  amount: z.coerce.number().positive("El monto debe ser positivo"),
  due_date: z.date({ required_error: "Fecha de vencimiento es requerida" }),
  status: z.enum(["pending", "overdue", "paid"], { required_error: "Estado es requerido" }).default("pending"),
  category: z.string().optional(),
  notes: z.string().optional(),
  currency: z.string().default("USD"),
});

type DebtFormValues = z.infer<typeof debtSchema>;

interface DebtFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  debt?: Debt;
  clients: { id: string; name: string }[];
  onSuccess?: () => void;
}

export const DebtFormModal: React.FC<DebtFormModalProps> = ({ 
  isOpen, 
  onClose, 
  debt,
  clients,
  onSuccess
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!debt;

  const form = useForm<DebtFormValues>({
    resolver: zodResolver(debtSchema),
    defaultValues: {
      creditor: debt?.creditor || "",
      client_id: debt?.client_id || undefined,
      amount: debt?.amount || 0,
      due_date: debt?.due_date ? new Date(debt.due_date) : new Date(),
      status: (debt?.status as "pending" | "overdue" | "paid") || "pending",
      category: debt?.category || "",
      notes: debt?.notes || "",
      currency: debt?.currency || "USD",
    }
  });

  useEffect(() => {
    if (debt) {
      form.reset({
        creditor: debt.creditor || "",
        client_id: debt.client_id || undefined,
        amount: debt.amount || 0,
        due_date: debt.due_date ? new Date(debt.due_date) : new Date(),
        status: (debt.status as "pending" | "overdue" | "paid") || "pending",
        category: debt.category || "",
        notes: debt.notes || "",
        currency: debt.currency || "USD",
      });
    } else {
      form.reset({
        creditor: "",
        client_id: undefined,
        amount: 0,
        due_date: new Date(),
        status: "pending",
        category: "",
        notes: "",
        currency: "USD",
      });
    }
  }, [debt, form]);

  const onSubmit = async (data: DebtFormValues) => {
    setIsSubmitting(true);
    
    try {
      if (isEditing && debt) {
        // Update existing debt
        const updatedData: UpdatedDebt = {
          creditor: data.creditor,
          client_id: data.client_id,
          amount: data.amount,
          due_date: data.due_date.toISOString(),
          status: data.status,
          category: data.category,
          notes: data.notes,
          currency: data.currency
        };
        
        await updateDebt(debt.id, updatedData);
        toast.success("Deuda actualizada correctamente");
      } else {
        // Create new debt
        const newData: NewDebt = {
          creditor: data.creditor,
          client_id: data.client_id,
          amount: data.amount,
          due_date: data.due_date.toISOString(),
          status: data.status,
          category: data.category,
          notes: data.notes,
          currency: data.currency,
          id: crypto.randomUUID()
        };
        
        await createDebt(newData);
        toast.success("Deuda creada correctamente");
      }
      
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (error) {
      console.error("Error al guardar la deuda:", error);
      toast.error(`Error: ${isEditing ? 'No se pudo actualizar' : 'No se pudo crear'} la deuda`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar deuda" : "Agregar deuda"}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="creditor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Acreedor</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="client_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente (Opcional)</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar cliente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Sin cliente</SelectItem>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría (Opcional)</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="due_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de vencimiento</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "dd/MM/yyyy")
                          ) : (
                            <span>Seleccionar fecha</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar estado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pending">Pendiente</SelectItem>
                      <SelectItem value="overdue">Vencido</SelectItem>
                      <SelectItem value="paid">Pagado</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Moneda</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar moneda" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="BS">Bs.</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  isEditing ? "Actualizar" : "Crear"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
