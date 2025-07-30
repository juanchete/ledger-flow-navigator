import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  FileText, 
  Download, 
  Eye, 
  Search, 
  Filter,
  Building2,
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  FileX
} from 'lucide-react';
import { GeneratedInvoice, InvoiceCompany } from '@/types/invoice';
import { getInvoices, getInvoiceCompanies, updateInvoiceStatus, getInvoice } from '@/integrations/supabase/invoiceService';
import { InvoiceGenerator } from '@/components/invoice/InvoiceGenerator';
import { InvoicePreview } from '@/components/invoice/InvoicePreview';
import { useNavigate } from 'react-router-dom';

const statusConfig = {
  draft: { label: 'Borrador', color: 'secondary', icon: FileX },
  sent: { label: 'Enviada', color: 'default', icon: Clock },
  paid: { label: 'Pagada', color: 'success', icon: CheckCircle },
  cancelled: { label: 'Cancelada', color: 'destructive', icon: XCircle }
} as const;

export default function Invoices() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<GeneratedInvoice[]>([]);
  const [companies, setCompanies] = useState<InvoiceCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCompany, setFilterCompany] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState<GeneratedInvoice | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [invoicesData, companiesData] = await Promise.all([
        getInvoices(),
        getInvoiceCompanies()
      ]);
      setInvoices(invoicesData);
      setCompanies(companiesData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las facturas',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (invoiceId: string, newStatus: GeneratedInvoice['status']) => {
    try {
      await updateInvoiceStatus(invoiceId, newStatus);
      setInvoices(invoices.map(inv => 
        inv.id === invoiceId ? { ...inv, status: newStatus } : inv
      ));
      toast({
        title: 'Estado actualizado',
        description: `La factura ha sido marcada como ${statusConfig[newStatus].label.toLowerCase()}`
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el estado de la factura',
        variant: 'destructive'
      });
    }
  };

  const handleViewInvoice = async (invoice: GeneratedInvoice) => {
    try {
      const fullInvoice = await getInvoice(invoice.id);
      if (fullInvoice) {
        setSelectedInvoice(fullInvoice);
        setShowPreview(true);
      }
    } catch (error) {
      console.error('Error loading invoice:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar la factura',
        variant: 'destructive'
      });
    }
  };

  // Filter invoices
  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.clientName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCompany = filterCompany === 'all' || invoice.companyId === filterCompany;
    const matchesStatus = filterStatus === 'all' || invoice.status === filterStatus;
    
    return matchesSearch && matchesCompany && matchesStatus;
  });

  // Calculate stats
  const stats = {
    total: invoices.length,
    draft: invoices.filter(inv => inv.status === 'draft').length,
    sent: invoices.filter(inv => inv.status === 'sent').length,
    paid: invoices.filter(inv => inv.status === 'paid').length,
    totalAmount: invoices.reduce((sum, inv) => sum + (inv.status !== 'cancelled' ? inv.totalAmount : 0), 0)
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Facturas</h1>
        <Button onClick={() => navigate('/operations')}>
          <FileText className="h-4 w-4 mr-2" />
          Nueva Transacción
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Facturas</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Borradores</CardTitle>
            <FileX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.draft}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monto Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.totalAmount.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número o cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filterCompany} onValueChange={setFilterCompany}>
              <SelectTrigger>
                <SelectValue placeholder="Todas las empresas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las empresas</SelectItem>
                {companies.map(company => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {Object.entries(statusConfig).map(([value, config]) => (
                  <SelectItem key={value} value={value}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Lista de Facturas</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Cargando facturas...</div>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron facturas
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => {
                    const company = companies.find(c => c.id === invoice.companyId);
                    const StatusIcon = statusConfig[invoice.status].icon;
                    
                    return (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">
                          {invoice.invoiceNumber}
                        </TableCell>
                        <TableCell>
                          {format(new Date(invoice.invoiceDate), 'dd/MM/yyyy', { locale: es })}
                        </TableCell>
                        <TableCell>{invoice.clientName}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{company?.name || 'N/A'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {invoice.currency} {invoice.totalAmount.toLocaleString('es-VE', { 
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2 
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={statusConfig[invoice.status].color as any}
                            className="gap-1"
                          >
                            <StatusIcon className="h-3 w-3" />
                            {statusConfig[invoice.status].label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewInvoice(invoice)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            
                            {invoice.company && invoice.lineItems && (
                              <InvoiceGenerator
                                invoice={invoice}
                                company={invoice.company}
                                lineItems={invoice.lineItems}
                              />
                            )}

                            {invoice.transactionId && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/operations/transaction/${invoice.transactionId}`)}
                              >
                                Ver Transacción
                              </Button>
                            )}

                            {invoice.status === 'draft' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleStatusChange(invoice.id, 'sent')}
                              >
                                Marcar Enviada
                              </Button>
                            )}

                            {invoice.status === 'sent' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleStatusChange(invoice.id, 'paid')}
                              >
                                Marcar Pagada
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Invoice Preview Modal */}
      {selectedInvoice && selectedInvoice.company && selectedInvoice.lineItems && (
        <InvoicePreview
          open={showPreview}
          onOpenChange={setShowPreview}
          amount={selectedInvoice.totalAmount}
          currency={selectedInvoice.currency}
          companyId={selectedInvoice.companyId}
          clientName={selectedInvoice.clientName}
          clientTaxId={selectedInvoice.clientTaxId}
          clientAddress={selectedInvoice.clientAddress}
          clientPhone={selectedInvoice.clientPhone}
          clientEmail={selectedInvoice.clientEmail}
        />
      )}
    </div>
  );
}