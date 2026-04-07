import React, { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DialogFooter } from '@/components/ui/dialog';
import { Building2, FileText, Image as ImageIcon, Wrench, Zap } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { InvoiceCompany, InvoiceCompanyType } from '@/types/invoice';
import { uploadCompanyLogo, deleteCompanyLogo } from '@/integrations/supabase/invoiceService';

type InvoiceCompanyInput = Omit<
  InvoiceCompany,
  'id' | 'userId' | 'createdAt' | 'updatedAt'
>;

interface IInvoiceCompanyFormProps {
  initialValue?: Partial<InvoiceCompany>;
  mode: 'create' | 'edit';
  isSubmitting: boolean;
  onSubmit: (data: InvoiceCompanyInput) => Promise<void>;
  onCancel: () => void;
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

const buildEmptyValue = (): Partial<InvoiceCompany> => ({
  name: '',
  type: 'construction',
  legalName: '',
  taxId: '',
  address: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'Venezuela',
  phone: '',
  email: '',
  website: '',
  logoUrl: undefined,
  invoiceRangeFrom: '',
  invoiceRangeTo: '',
  isActive: true,
});

export const InvoiceCompanyForm: React.FC<IInvoiceCompanyFormProps> = ({
  initialValue,
  mode,
  isSubmitting,
  onSubmit,
  onCancel,
}) => {
  const [form, setForm] = useState<Partial<InvoiceCompany>>(
    () => ({ ...buildEmptyValue(), ...(initialValue ?? {}) })
  );
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | undefined>(
    initialValue?.logoUrl
  );
  const [previousLogoUrl] = useState<string | undefined>(initialValue?.logoUrl);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Reset form when initialValue changes (e.g. switching between edit targets)
  useEffect(() => {
    setForm({ ...buildEmptyValue(), ...(initialValue ?? {}) });
    setLogoPreview(initialValue?.logoUrl);
    setLogoFile(null);
  }, [initialValue]);

  // Revoke object URLs created locally to avoid leaks
  useEffect(() => {
    return () => {
      if (logoPreview && logoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(logoPreview);
      }
    };
  }, [logoPreview]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toast({
        title: 'Formato no permitido',
        description: 'Use PNG, JPG o WEBP.',
        variant: 'destructive',
      });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'Archivo muy grande',
        description: 'La imagen no puede exceder 2MB.',
        variant: 'destructive',
      });
      return;
    }

    if (logoPreview && logoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(logoPreview);
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleRemoveLogo = (): void => {
    if (logoPreview && logoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(logoPreview);
    }
    setLogoFile(null);
    setLogoPreview(undefined);
    setForm({ ...form, logoUrl: undefined });
  };

  const validate = (): boolean => {
    if (
      !form.name ||
      !form.legalName ||
      !form.taxId ||
      !form.address ||
      !form.city ||
      !form.state ||
      !form.postalCode
    ) {
      toast({
        title: 'Error',
        description: 'Por favor complete todos los campos obligatorios',
        variant: 'destructive',
      });
      return false;
    }
    return true;
  };

  const handleSubmit = async (): Promise<void> => {
    if (!validate()) return;

    let finalLogoUrl: string | undefined = form.logoUrl;

    try {
      if (logoFile) {
        setUploadingLogo(true);
        finalLogoUrl = await uploadCompanyLogo(logoFile);
        setUploadingLogo(false);

        // Clean up old logo when replacing in edit mode
        if (mode === 'edit' && previousLogoUrl && previousLogoUrl !== finalLogoUrl) {
          deleteCompanyLogo(previousLogoUrl).catch(() => undefined);
        }
      } else if (
        mode === 'edit' &&
        previousLogoUrl &&
        !finalLogoUrl
      ) {
        // Logo was removed without replacement
        deleteCompanyLogo(previousLogoUrl).catch(() => undefined);
      }
    } catch (error) {
      setUploadingLogo(false);
      const message = error instanceof Error ? error.message : 'Error subiendo el logo';
      toast({ title: 'Error', description: message, variant: 'destructive' });
      return;
    }

    const payload: InvoiceCompanyInput = {
      name: form.name ?? '',
      type: form.type ?? 'construction',
      legalName: form.legalName ?? '',
      taxId: form.taxId ?? '',
      address: form.address ?? '',
      city: form.city ?? '',
      state: form.state ?? '',
      postalCode: form.postalCode ?? '',
      country: form.country ?? 'Venezuela',
      phone: form.phone ?? '',
      email: form.email ?? '',
      website: form.website ?? '',
      logoUrl: finalLogoUrl,
      invoiceRangeFrom: form.invoiceRangeFrom ?? '',
      invoiceRangeTo: form.invoiceRangeTo ?? '',
      isActive: form.isActive ?? true,
    };

    await onSubmit(payload);
  };

  const submitLabel = uploadingLogo
    ? 'Subiendo logo...'
    : isSubmitting
    ? 'Guardando...'
    : mode === 'create'
    ? 'Crear Empresa'
    : 'Guardar Cambios';

  return (
    <>
      <div className="grid gap-4 py-4">
        {/* Logo upload */}
        <div className="grid gap-2">
          <Label>Logo de la Empresa</Label>
          <div className="flex items-center gap-4">
            {logoPreview ? (
              <img
                src={logoPreview}
                alt="Logo"
                className="h-20 w-20 rounded border object-contain bg-white"
              />
            ) : (
              <div className="h-20 w-20 rounded border border-dashed flex items-center justify-center text-muted-foreground">
                <ImageIcon className="h-6 w-6" />
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleLogoChange}
                disabled={isSubmitting || uploadingLogo}
              />
              {logoPreview && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveLogo}
                  disabled={isSubmitting || uploadingLogo}
                >
                  Quitar logo
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                PNG, JPG o WEBP. Máx 2MB.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="company-name">Nombre Comercial *</Label>
            <Input
              id="company-name"
              value={form.name ?? ''}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Mi Empresa"
              disabled={isSubmitting}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="company-type">Tipo de Empresa *</Label>
            <Select
              value={form.type}
              onValueChange={(value: InvoiceCompanyType) =>
                setForm({ ...form, type: value })
              }
              disabled={isSubmitting}
            >
              <SelectTrigger id="company-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(companyTypeLabels).map(([type, label]) => (
                  <SelectItem key={type} value={type}>
                    <div className="flex items-center gap-2">
                      {companyTypeIcons[type as InvoiceCompanyType]}
                      <span>{label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="legal-name">Razón Social *</Label>
            <Input
              id="legal-name"
              value={form.legalName ?? ''}
              onChange={(e) => setForm({ ...form, legalName: e.target.value })}
              placeholder="Mi Empresa C.A."
              disabled={isSubmitting}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="tax-id">RIF *</Label>
            <Input
              id="tax-id"
              value={form.taxId ?? ''}
              onChange={(e) => setForm({ ...form, taxId: e.target.value })}
              placeholder="J-12345678-9"
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="address">Dirección *</Label>
          <Textarea
            id="address"
            value={form.address ?? ''}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Av. Principal, Edificio Torre, Piso 5"
            rows={2}
            disabled={isSubmitting}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="city">Ciudad *</Label>
            <Input
              id="city"
              value={form.city ?? ''}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder="Caracas"
              disabled={isSubmitting}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="state">Estado *</Label>
            <Input
              id="state"
              value={form.state ?? ''}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              placeholder="Distrito Capital"
              disabled={isSubmitting}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="postal-code">Código Postal *</Label>
            <Input
              id="postal-code"
              value={form.postalCode ?? ''}
              onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
              placeholder="1010"
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              value={form.phone ?? ''}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="0212-1234567"
              disabled={isSubmitting}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email ?? ''}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="info@miempresa.com"
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="website">Sitio Web</Label>
          <Input
            id="website"
            value={form.website ?? ''}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
            placeholder="https://www.miempresa.com"
            disabled={isSubmitting}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="invoice-range-from">Rango Factura — Desde N°</Label>
            <Input
              id="invoice-range-from"
              value={form.invoiceRangeFrom ?? ''}
              onChange={(e) => setForm({ ...form, invoiceRangeFrom: e.target.value })}
              placeholder="00-000701"
              disabled={isSubmitting}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="invoice-range-to">Rango Factura — Hasta N°</Label>
            <Input
              id="invoice-range-to"
              value={form.invoiceRangeTo ?? ''}
              onChange={(e) => setForm({ ...form, invoiceRangeTo: e.target.value })}
              placeholder="00-000800"
              disabled={isSubmitting}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">
          Rango autorizado por la imprenta. Aparece en el bloque legal del PDF.
        </p>
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting || uploadingLogo}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || uploadingLogo}
        >
          {submitLabel}
        </Button>
      </DialogFooter>
    </>
  );
};
