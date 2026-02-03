import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ManualInvoiceForm } from '@/components/invoice/ManualInvoiceForm';

export default function CreateManualInvoice(): React.ReactElement {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/invoices">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Crear Factura Manual</h1>
          <p className="text-muted-foreground">
            Ingrese los datos del cliente y los productos para generar una nueva factura
          </p>
        </div>
      </div>

      {/* Form */}
      <ManualInvoiceForm />
    </div>
  );
}
