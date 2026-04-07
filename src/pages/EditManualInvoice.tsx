import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ManualInvoiceForm } from '@/components/invoice/ManualInvoiceForm';
import { getInvoice } from '@/integrations/supabase/invoiceService';
import { GeneratedInvoice, InvoiceCompany, InvoiceLineItem } from '@/types/invoice';
import { toast } from '@/components/ui/use-toast';

type InvoiceWithRelations = GeneratedInvoice & {
  company?: InvoiceCompany;
  lineItems?: InvoiceLineItem[];
};

export default function EditManualInvoice(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<InvoiceWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async (): Promise<void> => {
      if (!id) {
        setError('ID de factura no especificado');
        setLoading(false);
        return;
      }
      try {
        const data = await getInvoice(id);
        if (!data) {
          setError('Factura no encontrada');
        } else {
          setInvoice(data as InvoiceWithRelations);
        }
      } catch (err) {
        console.error('Error loading invoice:', err);
        setError('Error cargando la factura');
        toast({
          title: 'Error',
          description: 'No se pudo cargar la factura',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/invoices">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {invoice ? `Editar Factura ${invoice.invoiceNumber}` : 'Editar Factura'}
          </h1>
          <p className="text-muted-foreground">
            Modifique los datos del cliente, las líneas o la fecha. La empresa emisora y el
            número de factura no se pueden cambiar.
          </p>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : error || !invoice ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            {error ?? 'Factura no encontrada'}
          </CardContent>
        </Card>
      ) : (
        <ManualInvoiceForm mode="edit" initialInvoice={invoice} />
      )}
    </div>
  );
}
