import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Download, Eye, Building2, MapPin, Phone, Mail, Calendar, FileText, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { GeneratedInvoice, InvoiceCompany, InvoiceLineItem, InvoiceItemGenerationParams, InvoiceRubro } from '@/types/invoice';
import { generateInvoiceItems, getInvoiceCompany } from '@/integrations/supabase/invoiceService';
import { generateAIInvoiceItems } from '@/services/aiInvoiceService';
import { InvoiceGenerator } from './InvoiceGenerator';
import { InvoiceRubroSelector } from './InvoiceRubroSelector';
import { toast } from '@/components/ui/use-toast';

interface InvoicePreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  currency: 'USD' | 'EUR' | 'VES' | 'COP';
  companyId: string;
  clientName?: string;
  clientTaxId?: string;
  clientAddress?: string;
  clientPhone?: string;
  clientEmail?: string;
  onConfirm?: (items: Partial<InvoiceLineItem>[]) => void;
  exchangeRate?: number;
}

export const InvoicePreview: React.FC<InvoicePreviewProps> = ({
  open,
  onOpenChange,
  amount,
  currency,
  companyId,
  clientName = 'Cliente General',
  clientTaxId,
  clientAddress,
  clientPhone,
  clientEmail,
  onConfirm,
  exchangeRate
}) => {
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<InvoiceCompany | null>(null);
  const [previewItems, setPreviewItems] = useState<Partial<InvoiceLineItem>[]>([]);
  const [regenerating, setRegenerating] = useState(false);
  const [selectedRubro, setSelectedRubro] = useState<InvoiceRubro | undefined>();
  const [showRubroSelector, setShowRubroSelector] = useState(true);

  useEffect(() => {
    if (open && companyId) {
      // Reset states when dialog opens
      setShowRubroSelector(true);
      setSelectedRubro(undefined);
      setPreviewItems([]);
      loadCompany();
    }
  }, [open, companyId]);

  const loadCompany = async () => {
    setLoading(true);
    try {
      const companyData = await getInvoiceCompany(companyId);
      if (!companyData) {
        throw new Error('Company not found');
      }
      setCompany(companyData);
    } catch (error) {
      console.error('Error loading company:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar la información de la empresa',
        variant: 'destructive'
      });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const handleRubroSelected = async (rubro: InvoiceRubro) => {
    setSelectedRubro(rubro);
    setShowRubroSelector(false);
    await generateItemsForRubro(rubro);
  };

  const generateItemsForRubro = async (rubro: InvoiceRubro) => {
    if (!company) return;

    setLoading(true);
    try {
      // Convertir el monto a bolívares si es necesario
      const amountInVES = currency === 'VES'
        ? amount
        : amount * (exchangeRate || 36);

      // Generate items with rubro filter
      const params: InvoiceItemGenerationParams = {
        companyType: company.type,
        targetAmount: amountInVES,
        itemCount: Math.floor(Math.random() * 6) + 3, // 3-8 items
        includeTax: true,
        taxRate: 16,
        rubro: rubro
      };

      // Usar AI para generar los items con la tasa de cambio actual y rubro
      try {
        const aiContext = {
          currency: 'VES',
          clientName: clientName,
          language: 'es' as const,
          exchangeRate: exchangeRate || 36,
          rubro: rubro
        };
        const items = await generateAIInvoiceItems(params, aiContext);
        setPreviewItems(items);
      } catch (aiError) {
        console.error('AI generation failed, falling back to catalog:', aiError);
        // Fallback al catálogo si falla la IA
        const items = await generateInvoiceItems(params);
        setPreviewItems(items);
      }
    } catch (error) {
      console.error('Error generating invoice items:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron generar los productos de la factura',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const regenerateItems = async () => {
    if (!company || !selectedRubro) return;

    setRegenerating(true);
    try {
      await generateItemsForRubro(selectedRubro);

      toast({
        title: 'Items regenerados',
        description: 'Se han generado nuevos productos para la factura'
      });
    } catch (error) {
      console.error('Error regenerating items:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron regenerar los items',
        variant: 'destructive'
      });
    } finally {
      setRegenerating(false);
    }
  };

  const handleChangeRubro = () => {
    setShowRubroSelector(true);
    setPreviewItems([]);
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm(previewItems);
    }
    onOpenChange(false);
  };

  const formatCurrency = (value: number) => {
    // Siempre mostrar en bolívares para las facturas
    return `Bs. ${value.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Calculate totals
  const subtotal = previewItems.reduce((sum, item) => sum + (item.subtotal || 0), 0);
  const taxAmount = previewItems.reduce((sum, item) => sum + (item.taxAmount || 0), 0);
  const total = subtotal + taxAmount;

  // Mock invoice data for preview
  const mockInvoice: GeneratedInvoice = {
    id: 'preview',
    userId: '',
    companyId: companyId,
    invoiceNumber: 'PREVIEW-2024-00001',
    invoiceDate: new Date(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    clientName: clientName,
    clientTaxId: clientTaxId,
    clientAddress: clientAddress,
    clientPhone: clientPhone,
    clientEmail: clientEmail,
    subtotal: subtotal,
    taxAmount: taxAmount,
    totalAmount: total,
    currency: 'VES', // Siempre en bolívares
    status: 'draft',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // Mock line items with IDs for preview
  const mockLineItems: InvoiceLineItem[] = previewItems.map((item, index) => ({
    id: `preview-item-${index}`,
    invoiceId: 'preview',
    ...item,
    createdAt: new Date()
  } as InvoiceLineItem));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Vista Previa de Factura
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : showRubroSelector && company ? (
          <div className="py-6">
            <InvoiceRubroSelector
              value={selectedRubro}
              onChange={handleRubroSelected}
            />
          </div>
        ) : company && (
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-6">
              {/* Company Header */}
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold">{company.legalName}</h2>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <Building2 className="h-4 w-4" />
                    <span>RIF: {company.taxId}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{company.address}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {company.city}, {company.state} {company.postalCode}
                  </div>
                  {company.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{company.phone}</span>
                    </div>
                  )}
                  {company.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span>{company.email}</span>
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <h3 className="text-xl font-semibold">FACTURA</h3>
                  <Badge variant="secondary" className="mt-1">Vista Previa</Badge>
                  <div className="mt-2 space-y-1 text-sm">
                    <div className="flex items-center gap-2 justify-end">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{format(new Date(), 'dd/MM/yyyy', { locale: es })}</span>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Client Info */}
              <div>
                <h4 className="font-semibold mb-2">Facturar a:</h4>
                <div className="text-sm space-y-1">
                  <p className="font-medium">{clientName}</p>
                  {clientTaxId && <p>RIF/CI: {clientTaxId}</p>}
                  {clientAddress && <p>{clientAddress}</p>}
                  {clientPhone && <p>Tel: {clientPhone}</p>}
                  {clientEmail && <p>Email: {clientEmail}</p>}
                </div>
              </div>

              <Separator />

              {/* Items Table */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h4 className="font-semibold">Items de la Factura</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {previewItems.length} productos generados automáticamente
                      {selectedRubro && (
                        <Badge variant="outline" className="ml-2">
                          {selectedRubro}
                        </Badge>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleChangeRubro}
                      className="gap-2"
                    >
                      Cambiar Rubro
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={regenerateItems}
                      disabled={regenerating}
                      className="gap-2"
                    >
                      {regenerating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Generando...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4" />
                          Generar Otros Productos
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-3 text-sm font-medium w-[5%]">#</th>
                        <th className="text-left p-3 text-sm font-medium w-[45%]">Descripción</th>
                        <th className="text-center p-3 text-sm font-medium w-[10%]">Cant.</th>
                        <th className="text-center p-3 text-sm font-medium w-[15%]">Unidad</th>
                        <th className="text-right p-3 text-sm font-medium w-[12.5%]">Precio Unit.</th>
                        <th className="text-right p-3 text-sm font-medium w-[12.5%]">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewItems.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-muted-foreground">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                            Generando productos...
                          </td>
                        </tr>
                      ) : (
                        previewItems.map((item, index) => (
                          <tr key={index} className="border-t hover:bg-muted/50 transition-colors">
                            <td className="p-3 text-sm text-muted-foreground">{index + 1}</td>
                            <td className="p-3 text-sm font-medium">{item.description}</td>
                            <td className="p-3 text-sm text-center">{item.quantity}</td>
                            <td className="p-3 text-sm text-center">{item.unit}</td>
                            <td className="p-3 text-sm text-right">
                              {formatCurrency(item.unitPrice || 0)}
                            </td>
                            <td className="p-3 text-sm text-right font-medium">
                              {formatCurrency(item.subtotal || 0)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>IVA (16%):</span>
                    <span>{formatCurrency(taxAmount)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total:</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>

              {/* Information Note */}
              <div className="bg-muted/50 rounded-lg p-4 mt-4">
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">Nota sobre los productos:</p>
                    <p>Los productos se generan automáticamente basándose en el monto total de la factura. 
                       Si no está satisfecho con los productos mostrados, puede hacer clic en "Generar Otros Productos" 
                       para obtener una nueva combinación.</p>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          
          {company && (
            <>
              <InvoiceGenerator
                invoice={mockInvoice}
                company={company}
                lineItems={mockLineItems}
                fileName="factura-preview.pdf"
              />
              
              <Button onClick={handleConfirm} disabled={loading}>
                <Eye className="h-4 w-4 mr-2" />
                Confirmar y Continuar
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};