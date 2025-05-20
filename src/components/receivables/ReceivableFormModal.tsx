
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
import { createReceivable, updateReceivable, type NewReceivable, type UpdatedReceivable, type Receivable } from "@/integrations/supabase/receivableService";

const receivableSchema = z.object({
  client_id: z.string({ required_error: "Cliente es requerido" }),
  amount: z.coerce.number().positive("El monto debe ser positivo"),
  description: z.string().min(1, "La descripción es requerida"),
  due_date: z.date({ required_error: "Fecha de vencimiento es requerida" }),
  status: z.enum(["pending", "overdue", "paid"], { required_error: "Estado es requerido" }).default("pending"),
  notes: z.string().optional(),
  currency: z.string().default("USD"),
});

type ReceivableFormValues = z.infer<typeof receivableSchema>;

interface ReceivableFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  receivable?: Receivable;
  clients: { id: string; name: string }[];
  onSuccess?: () => void;
}

export const ReceivableFormModal: React.FC<ReceivableFormModalProps> = ({ 
  isOpen, 
  onClose, 
  receivable,
  clients,
  onSuccess
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!receivable;

  const form = useForm<ReceivableFormValues>({
    resolver: zodResolver(receivableSchema),
    defaultValues: {
      client_id: receivable?.client_id || "",
      amount: receivable?.amount || 0,
      description: receivable?.description || "",
      due_date: receivable?.due_date ? new Date(receivable.due_date) : new Date(),
      status: (receivable?.status as "pending" | "overdue" | "paid") || "pending",
      notes: receivable?.notes || "",
      currency: receivable?.currency || "USD",
    }
  });

  useEffect(() => {
    if (receivable) {
      form.reset({
        client_id: receivable.client_id || "",
        amount: receivable.amount || 0,
        description: receivable.description || "",
        due_date: receivable.due_date ? new Date(receivable.due_date) : new Date(),
        status: (receivable.status as "pending" | "overdue" | "paid") || "pending",
        notes: receivable.notes || "",
        currency: receivable.currency || "USD",
      });
    } else {
      form.reset({
        client_id: "",
        amount: 0,
        description: "",
        due_date: new Date(),
        status: "pending",
        notes: "",
        currency: "USD",
      });
    }
  }, [receivable, form]);

  const onSubmit = async (data: ReceivableFormValues) => {
    setIsSubmitting(true);
    
    try {
      if (isEditing && receivable) {
        // Update existing receivable
        const updatedData: UpdatedReceivable = {
          client_id: data.client_id,
          amount: data.amount,
          description: data.description,
          due_date: data.due_date,
          status: data.status,
          notes: data.notes,
          currency: data.currency
        };
        
        await updateReceivable(receivable.id, updatedData);
        toast.success("Cuenta por cobrar actualizada correctamente");
      } else {
        // Create new receivable
        const newData: NewReceivable = {
          client_id: data.client_id,
          amount: data.amount,
          description: data.description,
          due_date: data.due_date,
          status: data.status,
          notes: data.notes,
          currency: data.currency,
          id: crypto.randomUUID()
        };
        
        await createReceivable(newData);
        toast.success("Cuenta por cobrar creada correctamente");
      }
      
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (error) {
      console.error("Error al guardar la cuenta por cobrar:", error);
      toast.error(`Error: ${isEditing ? 'No se pudo actualizar' : 'No se pudo crear'} la cuenta por cobrar`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar cuenta por cobrar" : "Agregar cuenta por cobrar"}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="client_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente</FormLabel>
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
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
