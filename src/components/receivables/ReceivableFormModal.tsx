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
  description: z.string().min(1, "La referencia es requerida"),
  receipt: z.any().optional(),
  due_date: z.date({ required_error: "Fecha de vencimiento es requerida" }),
  status: z.enum(["pending", "overdue", "paid"], { required_error: "Estado es requerido" }).default("pending"),
  notes: z.string().optional(),
  currency: z.string().default("USD"),
  interest_rate: z.coerce.number().min(0, "La tasa de interés debe ser positiva").max(100, "La tasa de interés no puede ser mayor a 100%").optional(),
  installments: z.coerce.number().int().min(1, "El número de cuotas debe ser al menos 1").max(360, "El número de cuotas no puede ser mayor a 360").default(1),
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
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
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
      interest_rate: receivable?.interest_rate || undefined,
      installments: receivable?.installments || 1,
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
        interest_rate: receivable.interest_rate || undefined,
        installments: receivable.installments || 1,
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
        interest_rate: undefined,
        installments: 1,
      });
    }
    setReceiptFile(null);
  }, [receivable, form]);

  const onSubmit = async (data: ReceivableFormValues) => {
    setIsSubmitting(true);
    
    try {
      // TODO: Subir archivo de comprobante a Supabase Storage si existe
      const receiptUrl: string | undefined = receiptFile ? undefined : undefined;
      if (receiptFile) {
        // Aquí se implementará la subida del archivo
        // receiptUrl = await uploadReceipt(receiptFile);
        console.log('Archivo de comprobante seleccionado:', receiptFile.name);
      }

      if (isEditing && receivable) {
        // Update existing receivable
        const updatedData: UpdatedReceivable = {
          client_id: data.client_id,
          amount: data.amount,
          description: data.description,
          due_date: data.due_date.toISOString(),
          status: data.status as "pending" | "overdue" | "paid",
          notes: data.notes,
          currency: data.currency,
          interest_rate: data.interest_rate || null,
          installments: data.installments || 1
        };
        
        await updateReceivable(receivable.id, updatedData);
        toast.success("Cuenta por cobrar actualizada correctamente");
      } else {
        // Create new receivable
        const newData: NewReceivable = {
          client_id: data.client_id,
          amount: data.amount,
          description: data.description,
          due_date: data.due_date.toISOString(),
          status: data.status as "pending" | "overdue" | "paid",
          notes: data.notes,
          currency: data.currency,
          interest_rate: data.interest_rate || null,
          installments: data.installments || 1,
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
      <DialogContent className="w-full max-w-[95vw] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">
            {isEditing ? "Editar cuenta por cobrar" : "Agregar cuenta por cobrar"}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
            <FormField
              control={form.control}
              name="client_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base">Cliente</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="h-10 sm:h-11">
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
                  <FormLabel className="text-sm sm:text-base">Monto</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01" 
                      {...field} 
                      className="h-10 sm:h-11 text-base"
                    />
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
                  <FormLabel className="text-sm sm:text-base">Referencia *</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="Referencia de la cuenta por cobrar"
                      className="h-10 sm:h-11 text-base"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Comprobante */}
            <div className="grid gap-2">
              <FormLabel className="text-sm sm:text-base">Comprobante</FormLabel>
              <Input
                type="file"
                accept="image/*,.pdf,.doc,.docx"
                onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                className="h-10 sm:h-11 text-base cursor-pointer"
              />
              {receiptFile && (
                <p className="text-xs text-muted-foreground">
                  Archivo seleccionado: {receiptFile.name}
                </p>
              )}
            </div>

            <FormField
              control={form.control}
              name="interest_rate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base">Tasa de Interés Anual (%) - Opcional</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01" 
                      placeholder="Ej: 12.5"
                      {...field} 
                      className="h-10 sm:h-11 text-base"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="installments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base">Número de Cuotas</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="1" 
                      max="360"
                      placeholder="1"
                      {...field} 
                      className="h-10 sm:h-11 text-base"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm sm:text-base">Estado</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="h-10 sm:h-11">
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
                  <FormLabel className="text-sm sm:text-base">Notas (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      className="min-h-[80px] sm:min-h-[100px] text-base resize-none"
                      placeholder="Información adicional..."
                    />
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
                  <FormLabel className="text-sm sm:text-base">Moneda</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="h-10 sm:h-11">
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

            <DialogFooter className="pt-4 sm:pt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                className="h-10 sm:h-11 text-sm sm:text-base"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="h-10 sm:h-11 text-sm sm:text-base"
              >
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
