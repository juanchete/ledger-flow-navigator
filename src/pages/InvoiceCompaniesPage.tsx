import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Building2, Plus, Pencil, Trash2, Loader2, ImageIcon } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { InvoiceCompany, InvoiceCompanyType } from '@/types/invoice';
import {
  getInvoiceCompanies,
  createInvoiceCompany,
  updateInvoiceCompany,
} from '@/integrations/supabase/invoiceService';
import { InvoiceCompanyForm } from '@/components/invoice/InvoiceCompanyForm';

const companyTypeLabels: Record<InvoiceCompanyType, string> = {
  construction: 'Construcción',
  electronics: 'Electrónica',
  papers: 'Papelería',
  electricity: 'Electricidad',
};

export default function InvoiceCompaniesPage(): React.ReactElement {
  const [companies, setCompanies] = useState<InvoiceCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<InvoiceCompany | null>(null);
  const [deactivating, setDeactivating] = useState<InvoiceCompany | null>(null);

  const load = async (): Promise<void> => {
    setLoading(true);
    try {
      const data = await getInvoiceCompanies();
      setCompanies(data);
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

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (
    data: Omit<InvoiceCompany, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<void> => {
    setSubmitting(true);
    try {
      const created = await createInvoiceCompany(data);
      setCompanies(prev => [created, ...prev]);
      setShowCreate(false);
      toast({ title: 'Éxito', description: 'Empresa creada correctamente' });
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

  const handleUpdate = async (
    data: Omit<InvoiceCompany, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<void> => {
    if (!editing) return;
    setSubmitting(true);
    try {
      const updated = await updateInvoiceCompany(editing.id, data);
      setCompanies(prev => prev.map(c => (c.id === updated.id ? updated : c)));
      setEditing(null);
      toast({ title: 'Éxito', description: 'Empresa actualizada correctamente' });
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

  const handleDeactivate = async (): Promise<void> => {
    if (!deactivating) return;
    setSubmitting(true);
    try {
      const updated = await updateInvoiceCompany(deactivating.id, {
        isActive: !deactivating.isActive,
      });
      setCompanies(prev => prev.map(c => (c.id === updated.id ? updated : c)));
      toast({
        title: 'Éxito',
        description: updated.isActive
          ? 'Empresa reactivada'
          : 'Empresa deshabilitada',
      });
    } catch (error) {
      console.error('Error toggling company:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cambiar el estado de la empresa',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
      setDeactivating(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            Empresas
          </h1>
          <p className="text-muted-foreground">
            Gestiona las empresas emisoras de facturas. Estos datos aparecen en el PDF
            generado.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Empresa
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {loading
              ? 'Cargando...'
              : `${companies.length} empresa${companies.length === 1 ? '' : 's'} registrada${
                  companies.length === 1 ? '' : 's'
                }`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : companies.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              No hay empresas registradas. Crea la primera con "Nueva Empresa".
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Logo</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Razón Social</TableHead>
                  <TableHead>RIF</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map(company => (
                  <TableRow key={company.id}>
                    <TableCell>
                      {company.logoUrl ? (
                        <img
                          src={company.logoUrl}
                          alt={company.name}
                          className="h-12 w-12 rounded border object-contain bg-white"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded border border-dashed flex items-center justify-center text-muted-foreground">
                          <ImageIcon className="h-4 w-4" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{company.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {company.legalName}
                    </TableCell>
                    <TableCell>{company.taxId}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {companyTypeLabels[company.type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{company.email || '—'}</TableCell>
                    <TableCell className="text-sm">{company.phone || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={company.isActive ? 'default' : 'outline'}>
                        {company.isActive ? 'Activa' : 'Deshabilitada'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditing(company)}
                          aria-label="Editar empresa"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeactivating(company)}
                          aria-label={
                            company.isActive ? 'Deshabilitar empresa' : 'Reactivar empresa'
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear Nueva Empresa</DialogTitle>
          </DialogHeader>
          <InvoiceCompanyForm
            mode="create"
            isSubmitting={submitting}
            onSubmit={handleCreate}
            onCancel={() => setShowCreate(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editing} onOpenChange={open => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Empresa</DialogTitle>
          </DialogHeader>
          {editing && (
            <InvoiceCompanyForm
              mode="edit"
              initialValue={editing}
              isSubmitting={submitting}
              onSubmit={handleUpdate}
              onCancel={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Deactivate confirmation */}
      <AlertDialog
        open={!!deactivating}
        onOpenChange={open => !open && setDeactivating(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deactivating?.isActive ? '¿Deshabilitar empresa?' : '¿Reactivar empresa?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deactivating?.isActive
                ? `La empresa "${deactivating?.name}" dejará de aparecer en el selector al crear facturas. Las facturas existentes no se verán afectadas. Puedes reactivarla más tarde.`
                : `La empresa "${deactivating?.name}" volverá a estar disponible para seleccionar en nuevas facturas.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivate} disabled={submitting}>
              {deactivating?.isActive ? 'Deshabilitar' : 'Reactivar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
