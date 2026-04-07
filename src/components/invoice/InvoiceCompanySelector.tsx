import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Building2, Wrench, FileText, Zap } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { InvoiceCompany, InvoiceCompanyType } from '@/types/invoice';
import {
  getInvoiceCompanies,
  createInvoiceCompany,
  updateInvoiceCompany,
} from '@/integrations/supabase/invoiceService';
import { InvoiceCompanyForm } from './InvoiceCompanyForm';

interface InvoiceCompanySelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const companyTypeIcons: Record<InvoiceCompanyType, React.ReactNode> = {
  construction: <Building2 className="h-4 w-4" />,
  electronics: <Zap className="h-4 w-4" />,
  papers: <FileText className="h-4 w-4" />,
  electricity: <Wrench className="h-4 w-4" />,
};

const companyTypeLabels: Record<InvoiceCompanyType, string> = {
  construction: 'Construcción',
  electronics: 'Electrónica',
  papers: 'Papelería',
  electricity: 'Electricidad',
};

export const InvoiceCompanySelector: React.FC<InvoiceCompanySelectorProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const [companies, setCompanies] = useState<InvoiceCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async (): Promise<void> => {
    try {
      const data = await getInvoiceCompanies();
      setCompanies(data.filter(c => c.isActive));
    } catch (error) {
      console.error('Error loading companies:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las empresas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedCompany = companies.find(c => c.id === value);

  const handleCreateCompany = async (
    data: Omit<InvoiceCompany, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<void> => {
    setSubmitting(true);
    try {
      const created = await createInvoiceCompany(data);
      setCompanies([...companies, created]);
      onChange(created.id);
      setShowCreateDialog(false);
      toast({
        title: 'Éxito',
        description: 'Empresa creada correctamente',
      });
    } catch (error) {
      console.error('Error creating company:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear la empresa',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateCompany = async (
    data: Omit<InvoiceCompany, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<void> => {
    if (!selectedCompany) return;
    setSubmitting(true);
    try {
      const updated = await updateInvoiceCompany(selectedCompany.id, data);
      setCompanies(companies.map(c => (c.id === updated.id ? updated : c)));
      setShowEditDialog(false);
      toast({
        title: 'Éxito',
        description: 'Empresa actualizada correctamente',
      });
    } catch (error) {
      console.error('Error updating company:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la empresa',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor="invoice-company">Empresa Facturadora</Label>
        <div className="flex gap-2">
          <Select value={value} onValueChange={onChange} disabled={disabled || loading}>
            <SelectTrigger id="invoice-company" className="flex-1">
              <SelectValue placeholder="Seleccionar empresa..." />
            </SelectTrigger>
            <SelectContent>
              {companies.map(company => (
                <SelectItem key={company.id} value={company.id}>
                  <div className="flex items-center gap-2">
                    {companyTypeIcons[company.type]}
                    <span>{company.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({companyTypeLabels[company.type]})
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setShowCreateDialog(true)}
            disabled={disabled || loading}
            aria-label="Crear empresa"
          >
            <Plus className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setShowEditDialog(true)}
            disabled={disabled || loading || !selectedCompany}
            aria-label="Editar empresa"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear Nueva Empresa</DialogTitle>
          </DialogHeader>
          <InvoiceCompanyForm
            mode="create"
            isSubmitting={submitting}
            onSubmit={handleCreateCompany}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Empresa</DialogTitle>
          </DialogHeader>
          {selectedCompany && (
            <InvoiceCompanyForm
              mode="edit"
              initialValue={selectedCompany}
              isSubmitting={submitting}
              onSubmit={handleUpdateCompany}
              onCancel={() => setShowEditDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
