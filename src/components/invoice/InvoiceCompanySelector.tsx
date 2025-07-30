import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Building2, Wrench, FileText, Zap } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { InvoiceCompany, InvoiceCompanyType } from '@/types/invoice';
import { getInvoiceCompanies, createInvoiceCompany } from '@/integrations/supabase/invoiceService';

interface InvoiceCompanySelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const companyTypeIcons: Record<InvoiceCompanyType, React.ReactNode> = {
  construction: <Building2 className="h-4 w-4" />,
  electronics: <Zap className="h-4 w-4" />,
  papers: <FileText className="h-4 w-4" />,
  electricity: <Wrench className="h-4 w-4" />
};

const companyTypeLabels: Record<InvoiceCompanyType, string> = {
  construction: 'Construcción',
  electronics: 'Electrónica',
  papers: 'Papelería',
  electricity: 'Electricidad'
};

export const InvoiceCompanySelector: React.FC<InvoiceCompanySelectorProps> = ({ 
  value, 
  onChange, 
  disabled = false 
}) => {
  const [companies, setCompanies] = useState<InvoiceCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  // Form state for new company
  const [newCompany, setNewCompany] = useState<Partial<InvoiceCompany>>({
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
    isActive: true
  });

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const data = await getInvoiceCompanies();
      setCompanies(data.filter(c => c.isActive));
    } catch (error) {
      console.error('Error loading companies:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las empresas',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompany = async () => {
    // Validate required fields
    if (!newCompany.name || !newCompany.legalName || !newCompany.taxId || 
        !newCompany.address || !newCompany.city || !newCompany.state || !newCompany.postalCode) {
      toast({
        title: 'Error',
        description: 'Por favor complete todos los campos obligatorios',
        variant: 'destructive'
      });
      return;
    }

    setCreateLoading(true);
    try {
      const created = await createInvoiceCompany(newCompany as Omit<InvoiceCompany, 'id' | 'createdAt' | 'updatedAt'>);
      
      // Add to local state
      setCompanies([...companies, created]);
      
      // Select the new company
      onChange(created.id);
      
      // Reset form and close dialog
      setNewCompany({
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
        isActive: true
      });
      setShowCreateDialog(false);
      
      toast({
        title: 'Éxito',
        description: 'Empresa creada correctamente'
      });
    } catch (error) {
      console.error('Error creating company:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear la empresa',
        variant: 'destructive'
      });
    } finally {
      setCreateLoading(false);
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
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Create Company Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Crear Nueva Empresa</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="company-name">Nombre Comercial *</Label>
                <Input
                  id="company-name"
                  value={newCompany.name}
                  onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                  placeholder="Mi Empresa"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="company-type">Tipo de Empresa *</Label>
                <Select 
                  value={newCompany.type} 
                  onValueChange={(value: InvoiceCompanyType) => setNewCompany({ ...newCompany, type: value })}
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
                  value={newCompany.legalName}
                  onChange={(e) => setNewCompany({ ...newCompany, legalName: e.target.value })}
                  placeholder="Mi Empresa C.A."
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="tax-id">RIF *</Label>
                <Input
                  id="tax-id"
                  value={newCompany.taxId}
                  onChange={(e) => setNewCompany({ ...newCompany, taxId: e.target.value })}
                  placeholder="J-12345678-9"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="address">Dirección *</Label>
              <Textarea
                id="address"
                value={newCompany.address}
                onChange={(e) => setNewCompany({ ...newCompany, address: e.target.value })}
                placeholder="Av. Principal, Edificio Torre, Piso 5"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="city">Ciudad *</Label>
                <Input
                  id="city"
                  value={newCompany.city}
                  onChange={(e) => setNewCompany({ ...newCompany, city: e.target.value })}
                  placeholder="Caracas"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="state">Estado *</Label>
                <Input
                  id="state"
                  value={newCompany.state}
                  onChange={(e) => setNewCompany({ ...newCompany, state: e.target.value })}
                  placeholder="Distrito Capital"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="postal-code">Código Postal *</Label>
                <Input
                  id="postal-code"
                  value={newCompany.postalCode}
                  onChange={(e) => setNewCompany({ ...newCompany, postalCode: e.target.value })}
                  placeholder="1010"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={newCompany.phone}
                  onChange={(e) => setNewCompany({ ...newCompany, phone: e.target.value })}
                  placeholder="0212-1234567"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newCompany.email}
                  onChange={(e) => setNewCompany({ ...newCompany, email: e.target.value })}
                  placeholder="info@miempresa.com"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="website">Sitio Web</Label>
              <Input
                id="website"
                value={newCompany.website}
                onChange={(e) => setNewCompany({ ...newCompany, website: e.target.value })}
                placeholder="https://www.miempresa.com"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateCompany} disabled={createLoading}>
              {createLoading ? 'Creando...' : 'Crear Empresa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};