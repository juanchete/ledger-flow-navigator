import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import { Building2, User, Package, Calculator, FileText, Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { InvoiceCompanySelector } from './InvoiceCompanySelector';
import { InvoiceLineItemsTable, IInvoiceLineItemInput } from './InvoiceLineItemsTable';
import { createManualInvoice } from '@/integrations/supabase/invoiceService';
import { getInvoiceCompany } from '@/integrations/supabase/invoiceService';
import { InvoiceGenerator } from './InvoiceGenerator';
import { GeneratedInvoice, InvoiceCompany, InvoiceLineItem } from '@/types/invoice';

const TAX_RATE = 16; // 16% IVA

const formSchema = z.object({
  clientName: z.string().min(1, 'El nombre del cliente es obligatorio'),
  clientTaxId: z.string().optional(),
  clientAddress: z.string().optional(),
  clientPhone: z.string().optional(),
  clientEmail: z.string().email('Email inválido').optional().or(z.literal('')),
  notes: z.string().optional(),
  invoiceDate: z.date({ required_error: 'La fecha de factura es obligatoria' }),
  dueInDays: z.number().min(0).max(365),
});

type FormData = z.infer<typeof formSchema>;

const generateLineId = (): string => {
  return `line_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const ManualInvoiceForm: React.FC = () => {
  const navigate = useNavigate();
  const [companyId, setCompanyId] = useState<string>('');
  const [currency, setCurrency] = useState<'USD' | 'VES'>('VES');
  const [lineItems, setLineItems] = useState<IInvoiceLineItemInput[]>([
    {
      id: generateLineId(),
      description: '',
      quantity: 1,
      unit: 'unidad',
      unitPrice: 0,
      subtotal: 0,
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedInvoice, setGeneratedInvoice] = useState<{
    invoice: GeneratedInvoice;
    company: InvoiceCompany;
    lineItems: InvoiceLineItem[];
  } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    control,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientName: '',
      clientTaxId: '',
      clientAddress: '',
      clientPhone: '',
      clientEmail: '',
      notes: '',
      invoiceDate: new Date(),
      dueInDays: 30,
    },
  });

  // Calculate totals
  const totals = useMemo(() => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.subtotal, 0);
    const taxAmount = (subtotal * TAX_RATE) / 100;
    const total = subtotal + taxAmount;

    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      taxAmount: parseFloat(taxAmount.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
    };
  }, [lineItems]);

  const formatCurrency = (amount: number): string => {
    const symbol = currency === 'USD' ? '$' : 'Bs.';
    return `${symbol} ${amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const validateLineItems = (): boolean => {
    if (lineItems.length === 0) {
      toast({
        title: 'Error',
        description: 'Debe agregar al menos una línea de producto',
        variant: 'destructive',
      });
      return false;
    }

    const invalidItems = lineItems.filter(
      item => !item.description.trim() || item.quantity <= 0 || item.unitPrice <= 0
    );

    if (invalidItems.length > 0) {
      toast({
        title: 'Error',
        description: 'Todas las líneas deben tener descripción, cantidad y precio válidos',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const onSubmit = async (data: FormData): Promise<void> => {
    if (!companyId) {
      toast({
        title: 'Error',
        description: 'Debe seleccionar una empresa emisora',
        variant: 'destructive',
      });
      return;
    }

    if (!validateLineItems()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Get company details for PDF generation
      const company = await getInvoiceCompany(companyId);
      if (!company) {
        throw new Error('Empresa no encontrada');
      }

      const result = await createManualInvoice({
        companyId,
        clientName: data.clientName,
        clientTaxId: data.clientTaxId,
        clientAddress: data.clientAddress,
        clientPhone: data.clientPhone,
        clientEmail: data.clientEmail || undefined,
        currency,
        invoiceDate: data.invoiceDate,
        dueInDays: data.dueInDays,
        notes: data.notes,
        lineItems: lineItems.map((item, index) => ({
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
          taxRate: TAX_RATE,
          taxAmount: parseFloat(((item.subtotal * TAX_RATE) / 100).toFixed(2)),
          total: parseFloat((item.subtotal + (item.subtotal * TAX_RATE) / 100).toFixed(2)),
          sortOrder: index,
        })),
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        totalAmount: totals.total,
      });

      // Set the generated invoice for PDF download
      setGeneratedInvoice({
        invoice: result.invoice,
        company,
        lineItems: result.lineItems,
      });

      toast({
        title: 'Factura creada',
        description: `Factura ${result.invoice.invoiceNumber} creada exitosamente`,
      });
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear la factura',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // If invoice was generated, show success view with download option
  if (generatedInvoice) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
            <FileText className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Factura Creada Exitosamente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Número de Factura:</span>
              <span className="font-medium">{generatedInvoice.invoice.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cliente:</span>
              <span className="font-medium">{generatedInvoice.invoice.clientName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-bold text-lg">
                {formatCurrency(generatedInvoice.invoice.totalAmount)}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <InvoiceGenerator
              invoice={generatedInvoice.invoice}
              company={generatedInvoice.company}
              lineItems={generatedInvoice.lineItems}
            />
            <InvoiceGenerator
              invoice={generatedInvoice.invoice}
              company={generatedInvoice.company}
              lineItems={generatedInvoice.lineItems}
              isCopy
            />

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => navigate('/invoices')}
              >
                Ver Lista de Facturas
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setGeneratedInvoice(null);
                  setLineItems([
                    {
                      id: generateLineId(),
                      description: '',
                      quantity: 1,
                      unit: 'unidad',
                      unitPrice: 0,
                      subtotal: 0,
                    },
                  ]);
                }}
              >
                Crear Otra Factura
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Empresa Emisora */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5" />
            Empresa Emisora
          </CardTitle>
        </CardHeader>
        <CardContent>
          <InvoiceCompanySelector
            value={companyId}
            onChange={setCompanyId}
            disabled={isSubmitting}
          />
        </CardContent>
      </Card>

      {/* Datos del Cliente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5" />
            Datos del Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clientName">Nombre / Razón Social *</Label>
              <Input
                id="clientName"
                {...register('clientName')}
                placeholder="Nombre del cliente"
                disabled={isSubmitting}
              />
              {errors.clientName && (
                <p className="text-sm text-destructive">{errors.clientName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientTaxId">RIF / CI</Label>
              <Input
                id="clientTaxId"
                {...register('clientTaxId')}
                placeholder="J-12345678-9"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientAddress">Dirección</Label>
            <Input
              id="clientAddress"
              {...register('clientAddress')}
              placeholder="Dirección del cliente"
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clientPhone">Teléfono</Label>
              <Input
                id="clientPhone"
                {...register('clientPhone')}
                placeholder="0212-1234567"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientEmail">Email</Label>
              <Input
                id="clientEmail"
                type="email"
                {...register('clientEmail')}
                placeholder="cliente@ejemplo.com"
                disabled={isSubmitting}
              />
              {errors.clientEmail && (
                <p className="text-sm text-destructive">{errors.clientEmail.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Productos / Servicios */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5" />
            Productos / Servicios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <InvoiceLineItemsTable
            items={lineItems}
            onChange={setLineItems}
            currency={currency}
            disabled={isSubmitting}
          />
        </CardContent>
      </Card>

      {/* Totales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calculator className="h-5 w-5" />
            Totales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-end space-y-2">
            <div className="flex justify-between w-64">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between w-64">
              <span className="text-muted-foreground">IVA ({TAX_RATE}%):</span>
              <span className="font-medium">{formatCurrency(totals.taxAmount)}</span>
            </div>
            <Separator className="w-64" />
            <div className="flex justify-between w-64">
              <span className="font-bold text-lg">TOTAL:</span>
              <span className="font-bold text-lg">{formatCurrency(totals.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Opciones Adicionales */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Opciones Adicionales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Fecha de Factura *</Label>
              <Controller
                control={control}
                name="invoiceDate"
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                        disabled={isSubmitting}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value
                          ? format(field.value, 'dd/MM/yyyy', { locale: es })
                          : 'Seleccione una fecha'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => date && field.onChange(date)}
                        initialFocus
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
              {errors.invoiceDate && (
                <p className="text-sm text-destructive">{errors.invoiceDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Moneda</Label>
              <Select
                value={currency}
                onValueChange={(value: 'USD' | 'VES') => setCurrency(value)}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VES">Bolívares (VES)</SelectItem>
                  <SelectItem value="USD">Dólares (USD)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueInDays">Vence en (días)</Label>
              <Input
                id="dueInDays"
                type="number"
                min="0"
                max="365"
                {...register('dueInDays', { valueAsNumber: true })}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Notas adicionales para la factura..."
              rows={3}
              disabled={isSubmitting}
            />
          </div>
        </CardContent>
      </Card>

      {/* Botones de Acción */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate('/invoices')}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <FileText className="h-4 w-4 mr-2" />
              Guardar y Generar PDF
            </>
          )}
        </Button>
      </div>
    </form>
  );
};
