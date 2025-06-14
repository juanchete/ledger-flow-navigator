import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { 
  Card, 
  CardContent,
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { AlertTriangle, ChevronLeft, FileText, Receipt, Loader2 } from "lucide-react";
import { clientService } from "@/integrations/supabase/clientService";
import { useTransactions } from "@/context/TransactionContext";
import { Client, Transaction } from "@/types";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import ClientFormModal from "@/components/clients/ClientFormModal";
import type { Client as SupabaseClient } from "@/integrations/supabase/clientService";
import { getDebtsByClientId, Debt } from "@/integrations/supabase/debtService";
import { getReceivablesByClientId, Receivable } from "@/integrations/supabase/receivableService";
import { getPaymentsByDebtId, getPaymentsByReceivableId, Transaction as SupabaseTransaction } from "@/integrations/supabase/transactionService";

// Tipos extendidos para los estados
interface DebtWithPayments extends Debt {
  payments: SupabaseTransaction[];
  totalPaid: number;
  status: string;
}
interface ReceivableWithPayments extends Receivable {
  payments: SupabaseTransaction[];
  totalPaid: number;
  status: string;
}

const ClientDetail = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [relatedClient, setRelatedClient] = useState<Client | null>(null);
  const [indirectClients, setIndirectClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [allClients, setAllClients] = useState<Client[]>([]);
  
  // Estado para el formulario de edición
  const [editClient, setEditClient] = useState<Client | null>(null);
  
  // Usar el contexto de transacciones
  const { transactions: allTransactionsFromContext, isLoading: isLoadingTransactions } = useTransactions();
  const [clientTransactions, setClientTransactions] = useState<Transaction[]>([]);
  const [allRelevantTransactions, setAllRelevantTransactions] = useState<Transaction[]>([]);

  // Estados para deudas y cuentas por cobrar reales
  const [clientDebts, setClientDebts] = useState<DebtWithPayments[]>([]);
  const [clientReceivables, setClientReceivables] = useState<ReceivableWithPayments[]>([]);

  // Cargar los datos del cliente desde Supabase
  useEffect(() => {
    const loadClient = async () => {
      if (!clientId) return;
      
      setIsLoading(true);
      try {
        const clientRaw = await clientService.getClientById(clientId);
        if (clientRaw) {
          const client: Client = {
            id: clientRaw.id,
            name: clientRaw.name,
            email: clientRaw.email,
            phone: clientRaw.phone,
            category: clientRaw.category as Client["category"],
            clientType: clientRaw.client_type as Client["clientType"],
            active: clientRaw.active,
            address: clientRaw.address,
            contactPerson: clientRaw.contact_person,
            documents: [], // Mapea si tienes documentos
            createdAt: clientRaw.created_at ? new Date(clientRaw.created_at) : undefined,
            updatedAt: clientRaw.updated_at ? new Date(clientRaw.updated_at) : undefined,
            alertStatus: (clientRaw.alert_status as 'none' | 'yellow' | 'red') || 'none',
            alertNote: clientRaw.alert_note || "",
            relatedToClientId: clientRaw.related_to_client_id,
          };
          setClient(client);
          setEditClient(client);
          // Si es un cliente indirecto, cargar el cliente principal asociado
          if (client.clientType === "indirect" && client.relatedToClientId) {
            const relatedRaw = await clientService.getClientById(client.relatedToClientId);
            if (relatedRaw) {
              const relatedClient: Client = {
                id: relatedRaw.id,
                name: relatedRaw.name,
                email: relatedRaw.email,
                phone: relatedRaw.phone,
                category: relatedRaw.category as Client["category"],
                clientType: relatedRaw.client_type as Client["clientType"],
                active: relatedRaw.active,
                address: relatedRaw.address,
                contactPerson: relatedRaw.contact_person,
                documents: [],
                createdAt: relatedRaw.created_at ? new Date(relatedRaw.created_at) : undefined,
                updatedAt: relatedRaw.updated_at ? new Date(relatedRaw.updated_at) : undefined,
                alertStatus: (relatedRaw.alert_status as 'none' | 'yellow' | 'red') || 'none',
                alertNote: relatedRaw.alert_note || "",
                relatedToClientId: relatedRaw.related_to_client_id,
              };
              setRelatedClient(relatedClient);
            }
          }
          // Buscar clientes indirectos asociados a este cliente
          if (client.clientType === "direct") {
            try {
              const clientsRaw = await clientService.getClients();
              const clients: Client[] = clientsRaw.map((c: SupabaseClient) => ({
                id: c.id,
                name: c.name,
                email: c.email,
                phone: c.phone,
                category: c.category as Client["category"],
                clientType: c.client_type as Client["clientType"],
                active: c.active,
                address: c.address,
                contactPerson: c.contact_person,
                documents: [],
                createdAt: c.created_at ? new Date(c.created_at) : undefined,
                updatedAt: c.updated_at ? new Date(c.updated_at) : undefined,
                alertStatus: (c.alert_status as 'none' | 'yellow' | 'red') || 'none',
                alertNote: c.alert_note || "",
                relatedToClientId: c.related_to_client_id,
              }));
              setAllClients(clients);
              const indirectClientsData = clients.filter(
                c => c.relatedToClientId === clientId
              );
              setIndirectClients(indirectClientsData);
            } catch (error) {
              console.error("Error loading indirect clients:", error);
            }
          } else {
            // Si es indirecto, cargar todos los clientes para el selector
            try {
              const clientsRaw = await clientService.getClients();
              const clients: Client[] = clientsRaw.map((c: SupabaseClient) => ({
                id: c.id,
                name: c.name,
                email: c.email,
                phone: c.phone,
                category: c.category as Client["category"],
                clientType: c.client_type as Client["clientType"],
                active: c.active,
                address: c.address,
                contactPerson: c.contact_person,
                documents: [],
                createdAt: c.created_at ? new Date(c.created_at) : undefined,
                updatedAt: c.updated_at ? new Date(c.updated_at) : undefined,
                alertStatus: (c.alert_status as 'none' | 'yellow' | 'red') || 'none',
                alertNote: c.alert_note || "",
                relatedToClientId: c.related_to_client_id,
              }));
              setAllClients(clients);
            } catch (error) {
              console.error("Error loading clients:", error);
            }
          }
        }
      } catch (error) {
        console.error("Error loading client:", error);
        toast.error("Error al cargar los datos del cliente");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadClient();
  }, [clientId]);

  // Filtrar transacciones cuando se actualicen o cambie el cliente
  useEffect(() => {
    if (clientId && allTransactionsFromContext) {
      // Transacciones directas del cliente
      const directTransactions = allTransactionsFromContext
        .filter(t => t.client_id === clientId)
        .map(mapTransaction);
      setClientTransactions(directTransactions);
      
      // Pagos indirectos hechos a favor de este cliente
      const indirectPayments = allTransactionsFromContext
        .filter(t => t.type === "payment" && t.indirect_for_client_id === clientId)
        .map(mapTransaction);

      // Todas las transacciones relevantes (directas + pagos indirectos)
      setAllRelevantTransactions([
        ...directTransactions,
        ...indirectPayments
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    }
  }, [clientId, allTransactionsFromContext]);
  
  // Helper para saber si una transacción es un pago indirecto
  const isIndirectPayment = (transaction: Transaction) =>
    transaction.type === "payment" && transaction.indirectForClientId === clientId;

  // Sumar pagos indirectos para descontar de la deuda
  const totalIndirectPayments = allRelevantTransactions
    .filter(isIndirectPayment)
    .reduce((sum, t) => sum + t.amount, 0);

  // Mapeo de transacciones de Supabase a Transaction del frontend
  function mapTransaction(t: SupabaseTransaction): Transaction {
    return {
      id: t.id,
      type: t.type as Transaction["type"],
      amount: t.amount,
      description: t.description || '',
      date: t.date ? new Date(t.date) : new Date(),
      clientId: t.client_id || undefined,
      status: t.status as Transaction["status"],
      receipt: t.receipt || undefined,
      invoice: t.invoice || undefined,
      deliveryNote: t.delivery_note || undefined,
      paymentMethod: t.payment_method || undefined,
      category: t.category || undefined,
      notes: t.notes || undefined,
      createdAt: t.created_at ? new Date(t.created_at) : undefined,
      updatedAt: t.updated_at ? new Date(t.updated_at) : undefined,
      indirectForClientId: t.indirect_for_client_id || undefined,
      debtId: t.debt_id || undefined,
      receivableId: t.receivable_id || undefined,
    };
  }

  // useEffect para cargar deudas y cuentas por cobrar desde Supabase
  useEffect(() => {
    if (!clientId) return;
    // Cargar deudas y pagos
    getDebtsByClientId(clientId).then(async (debts) => {
      const debtsWithPayments = await Promise.all(
        debts.map(async (debt) => {
          const payments = await getPaymentsByDebtId(debt.id);
          const totalPaid = payments.reduce((sum, t) => sum + t.amount, 0);
          return { ...debt, payments, totalPaid, status: totalPaid >= debt.amount ? "paid" : debt.status };
        })
      );
      setClientDebts(debtsWithPayments);
    });
    // Cargar cuentas por cobrar y pagos
    getReceivablesByClientId(clientId).then(async (receivables) => {
      const receivablesWithPayments = await Promise.all(
        receivables.map(async (rec) => {
          const payments = await getPaymentsByReceivableId(rec.id);
          const totalPaid = payments.reduce((sum, t) => sum + t.amount, 0);
          return { ...rec, payments, totalPaid, status: totalPaid >= rec.amount ? "paid" : rec.status };
        })
      );
      setClientReceivables(receivablesWithPayments);
    });
  }, [clientId]);

  const [isActive, setIsActive] = useState(false);
  const [alertStatus, setAlertStatus] = useState<'none' | 'yellow' | 'red'>('none');
  const [alertNote, setAlertNote] = useState('');
  
  // Actualizar estados locales cuando se carga el cliente
  useEffect(() => {
    if (client) {
      setIsActive(client.active);
      setAlertStatus(client.alertStatus || 'none');
      setAlertNote(client.alertNote || '');
    }
  }, [client]);

  if (isLoading || isLoadingTransactions) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Cargando información del cliente...</p>
      </div>
    );
  }
  
  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <h2 className="text-2xl font-bold mb-2">Cliente no encontrado</h2>
        <p className="text-muted-foreground mb-4">El cliente que estás buscando no existe.</p>
        <Button asChild>
          <Link to="/clients">Volver a Clientes</Link>
        </Button>
      </div>
    );
  }

  const handleStatusChange = async (checked: boolean) => {
    setIsActive(checked);
    setIsUpdating(true);
    
    try {
      await clientService.updateClient(client.id, {
        active: checked
      });
      toast.success(`Estado del cliente ${checked ? 'activado' : 'desactivado'}`);
    } catch (error) {
      console.error("Error updating client status:", error);
      toast.error("Error al actualizar el estado del cliente");
      setIsActive(!checked);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAlertChange = async (value: string) => {
    const newAlertStatus = value as 'none' | 'yellow' | 'red';
    setAlertStatus(newAlertStatus);
    setIsUpdating(true);
    
    try {
      await clientService.updateClient(client.id, {
        alert_status: newAlertStatus
      });
      toast.success(`Estado de alerta actualizado a ${value}`);
    } catch (error) {
      console.error("Error updating alert status:", error);
      toast.error("Error al actualizar el estado de alerta");
      setAlertStatus(client.alertStatus || 'none');
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleAlertNoteChange = async () => {
    setIsUpdating(true);
    
    try {
      await clientService.updateClient(client.id, {
        alert_note: alertNote
      });
      toast.success("Nota de alerta actualizada");
    } catch (error) {
      console.error("Error updating alert note:", error);
      toast.error("Error al actualizar la nota de alerta");
      setAlertNote(client.alertNote || '');
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleDocumentUpload = () => {
    toast.success("Esta funcionalidad estará disponible próximamente");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };
  
  // Manejar la actualización exitosa de un cliente
  const handleClientUpdated = (updatedClient: Client) => {
    setClient(updatedClient);
    // Si era un cliente indirecto y ha cambiado el cliente principal, cargar el nuevo cliente principal
    if (updatedClient.clientType === "indirect" && updatedClient.relatedToClientId && 
        (!client || updatedClient.relatedToClientId !== client.relatedToClientId)) {
      clientService.getClientById(updatedClient.relatedToClientId)
        .then((relatedRaw) => {
          if (relatedRaw) {
            const relatedClient: Client = {
              id: relatedRaw.id,
              name: relatedRaw.name,
              email: relatedRaw.email,
              phone: relatedRaw.phone,
              category: relatedRaw.category as Client["category"],
              clientType: relatedRaw.client_type as Client["clientType"],
              active: relatedRaw.active,
              address: relatedRaw.address,
              contactPerson: relatedRaw.contact_person,
              documents: [],
              createdAt: relatedRaw.created_at ? new Date(relatedRaw.created_at) : undefined,
              updatedAt: relatedRaw.updated_at ? new Date(relatedRaw.updated_at) : undefined,
              alertStatus: (relatedRaw.alert_status as 'none' | 'yellow' | 'red') || 'none',
              alertNote: relatedRaw.alert_note || "",
              relatedToClientId: relatedRaw.related_to_client_id,
            };
            setRelatedClient(relatedClient);
          }
        })
        .catch(error => {
          console.error("Error loading related client:", error);
        });
    }
    setIsActive(updatedClient.active);
    setAlertStatus(updatedClient.alertStatus || "none");
    setAlertNote(updatedClient.alertNote || "");
    toast.success("Cliente actualizado con éxito");
  };
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="sm" asChild className="gap-1 flex-shrink-0">
            <Link to="/clients">
              <ChevronLeft size={16} />
              Volver
            </Link>
          </Button>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight" title={client.name}>
            {client.name}
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="capitalize">{client.category}</Badge>
          <Badge variant="outline" className={client.clientType === "indirect" ? "bg-yellow-50" : "bg-slate-50"}>
            {client.clientType === "indirect" ? "Indirecto" : "Directo"}
          </Badge>
          {alertStatus !== 'none' && (
            <Badge className={
              alertStatus === 'red' ? 'bg-finance-red text-white' : 
              'bg-finance-yellow text-finance-gray-dark'
            }>
              <AlertTriangle size={12} className="mr-1" />
              {alertStatus === 'red' ? 'Roja' : alertStatus === 'yellow' ? 'Amarilla' : alertStatus}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información del Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-2 sm:gap-1">
                <span className="font-medium text-muted-foreground">Correo:</span>
                <span className="break-all">{client.email}</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-2 sm:gap-1">
                <span className="font-medium text-muted-foreground">Teléfono:</span>
                <span>{client.phone}</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-2 sm:gap-1">
                <span className="font-medium text-muted-foreground">Dirección:</span>
                <span className="break-words">{client.address}</span>
              </div>
              
              {client.contactPerson && (
                <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-2 sm:gap-1">
                  <span className="font-medium text-muted-foreground">Contacto:</span>
                  <span>{client.contactPerson}</span>
                </div>
              )}
              
              <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-2 sm:gap-1">
                <span className="font-medium text-muted-foreground">Agregado:</span>
                <span>{client.createdAt ? format(client.createdAt, 'MMM d, yyyy') : 'Sin fecha'}</span>
              </div>
              
              {client.clientType === "indirect" && relatedClient && (
                <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-2 sm:gap-1">
                  <span className="font-medium text-muted-foreground">Asociado a:</span>
                  <Link to={`/clients/${relatedClient.id}`} className="text-primary hover:underline break-words">
                    {relatedClient.name}
                  </Link>
                </div>
              )}
              
              <div className="pt-2 border-t flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="client-status" className="font-medium">Estado del Cliente</Label>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${isActive ? 'text-finance-green' : 'text-muted-foreground'}`}>
                      {isActive ? 'Activo' : 'Inactivo'}
                    </span>
                    <Switch 
                      id="client-status" 
                      checked={isActive} 
                      onCheckedChange={handleStatusChange}
                      disabled={isUpdating}
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="alert-status" className="font-medium">Estado de Alerta</Label>
                  <Select value={alertStatus} onValueChange={handleAlertChange} disabled={isUpdating}>
                    <SelectTrigger id="alert-status" className="w-40">
                      <SelectValue placeholder="Seleccionar estado de alerta" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ninguna</SelectItem>
                      <SelectItem value="yellow">Amarilla</SelectItem>
                      <SelectItem value="red">Roja</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {alertStatus !== 'none' && (
                  <div>
                    <Label htmlFor="alert-note" className="mb-2 block font-medium">Nota de Alerta</Label>
                    <Textarea 
                      id="alert-note" 
                      value={alertNote} 
                      onChange={(e) => setAlertNote(e.target.value)} 
                      onBlur={handleAlertNoteChange}
                      placeholder="Describe la razón de la alerta..."
                      className="resize-none"
                      disabled={isUpdating}
                    />
                  </div>
                )}
              </div>
              {indirectClients.length > 0 && (
                <div className="pt-2 border-t">
                  <div className="font-medium text-muted-foreground mb-1">Clientes Indirectos Asociados:</div>
                  <ul className="list-disc list-inside text-sm">
                    {indirectClients.map(ic => (
                      <li key={ic.id}>
                        <Link to={`/clients/${ic.id}`} className="hover:underline">
                          {ic.name}
                        </Link> 
                        <span className="text-xs text-muted-foreground">({ic.email})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Documentos</CardTitle>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">Subir</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Subir Documento</DialogTitle>
                    <DialogDescription>
                      Sube documentos relacionados con este cliente.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="doc-name">Nombre del Documento</Label>
                      <Input id="doc-name" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="doc-type">Tipo de Documento</Label>
                      <Select>
                        <SelectTrigger id="doc-type">
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="contract">Contrato</SelectItem>
                          <SelectItem value="invoice">Factura</SelectItem>
                          <SelectItem value="receipt">Recibo</SelectItem>
                          <SelectItem value="id">Identificación</SelectItem>
                          <SelectItem value="other">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="doc-file">Archivo</Label>
                      <Input id="doc-file" type="file" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline">Cancelar</Button>
                    <Button onClick={handleDocumentUpload}>Subir</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {client.documents && client.documents.length > 0 ? (
                <div className="space-y-3">
                  {client.documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-muted-foreground" />
                        <div>
                          <p className="font-medium">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(doc.uploadedAt), 'MMM d, yyyy')} • {formatFileSize(doc.size)}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">Ver</Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No se han subido documentos aún.</p>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Actividad del Cliente</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="transactions" className="w-full">
                <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 min-h-[70px] items-center">
                  <TabsTrigger value="overview" className="text-xs sm:text-sm">Resumen</TabsTrigger>
                  <TabsTrigger value="transactions" className="text-xs sm:text-sm">Transacciones</TabsTrigger>
                  <TabsTrigger value="debts" className="text-xs sm:text-sm">Deudas</TabsTrigger>
                  <TabsTrigger value="receivables" className="text-xs sm:text-sm">Cuentas por Cobrar</TabsTrigger>
                </TabsList>
                <TabsContent value="overview">
                  <div className="space-y-4 mt-4">
                    <p>Esta sección mostrará un resumen financiero del cliente.</p>
                    <p>Total de transacciones: {allRelevantTransactions.length}</p>
                  </div>
                </TabsContent>
                <TabsContent value="transactions">
                  {allRelevantTransactions.length > 0 ? (
                    <>
                      {/* Mobile Cards View */}
                      <div className="block lg:hidden space-y-4 mt-4">
                        {allRelevantTransactions.map((transaction) => (
                          <Card key={transaction.id} className="border shadow-sm">
                            <CardContent className="p-4">
                              <div className="space-y-3">
                                <div className="flex justify-between items-start gap-3">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-base truncate text-gray-900">{transaction.description}</h4>
                                    <div className="flex items-center gap-2 mt-2">
                                      <Badge variant="outline" className="text-xs font-medium bg-blue-50 text-blue-700 border-blue-200">
                                        {transaction.type}
                                      </Badge>
                                      {isIndirectPayment(transaction) && (
                                        <Badge variant="outline" className="text-xs font-medium bg-purple-50 text-purple-700 border-purple-200">
                                          Pago indirecto
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  <Badge variant="outline" className={`shrink-0 text-xs font-medium ${
                                    transaction.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' :
                                    transaction.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                                    'bg-gray-50 text-gray-700 border-gray-200'
                                  }`}>
                                    {transaction.status === 'completed' ? 'Completada' : 
                                     transaction.status === 'pending' ? 'Pendiente' : transaction.status}
                                  </Badge>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Fecha</span>
                                    <p className="text-sm font-medium text-gray-700">
                                      {transaction.date ? format(new Date(transaction.date), 'dd MMM yyyy') : 'Sin fecha'}
                                    </p>
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Monto</span>
                                    <p className="text-lg font-bold text-gray-900">{formatCurrency(transaction.amount)}</p>
                                  </div>
                                </div>
                                
                                <div className="pt-2 border-t border-gray-100">
                                  <Button size="sm" variant="outline" asChild className="w-full">
                                    <Link to={`/operations/transaction/${transaction.id}`}>
                                      Ver Detalle Completo
                                    </Link>
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      {/* Desktop Table View */}
                      <div className="hidden lg:block rounded-md border">
                        <div className="grid grid-cols-12 p-3 bg-muted/50 text-sm font-medium">
                          <div className="col-span-5">Descripción</div>
                          <div className="col-span-2">Fecha</div>
                          <div className="col-span-2">Monto</div>
                          <div className="col-span-2">Estado</div>
                          <div className="col-span-1">Acción</div>
                        </div>
                        <div className="divide-y">
                          {allRelevantTransactions.map((transaction) => (
                            <div key={transaction.id} className="grid grid-cols-12 p-3 items-center text-sm">
                              <div className="col-span-5">
                                <span className="capitalize">{transaction.description}</span>
                                <span className="inline-block text-xs bg-muted rounded px-1 ml-2 capitalize">
                                  {transaction.type}
                                </span>
                                {isIndirectPayment(transaction) && (
                                  <span className="ml-2 text-xs text-finance-blue">Pago indirecto</span>
                                )}
                              </div>
                              <div className="col-span-2">
                                {transaction.date ? format(new Date(transaction.date), 'MMM d, yyyy') : 'Sin fecha'}
                              </div>
                              <div className="col-span-2 font-medium">
                                {formatCurrency(transaction.amount)}
                              </div>
                              <div className="col-span-2">
                                <Badge variant="outline" className={
                                  transaction.status === 'completed' ? 'bg-finance-green text-white border-finance-green' :
                                  transaction.status === 'pending' ? 'bg-finance-yellow text-finance-gray-dark border-finance-yellow' : 
                                  'bg-muted'
                                }>
                                  {transaction.status === 'completed' ? 'Completada' : 
                                   transaction.status === 'pending' ? 'Pendiente' : transaction.status}
                                </Badge>
                              </div>
                              <div className="col-span-1">
                                <Button size="sm" variant="ghost" asChild>
                                  <Link to={`/operations/transaction/${transaction.id}`}>Ver</Link>
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No hay transacciones para este cliente.</p>
                      <Button variant="outline" className="mt-4" asChild>
                        <Link to={`/operations/transaction/new?clientId=${clientId}`}>Agregar Transacción</Link>
                      </Button>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="debts">
                  {clientDebts.length > 0 ? (
                    <>
                      {/* Mobile Cards View */}
                      <div className="block lg:hidden space-y-4 mt-4">
                        {clientDebts.map((debt) => (
                          <Card key={debt.id} className="border shadow-sm">
                            <CardContent className="p-4">
                              <div className="space-y-3">
                                <div className="flex justify-between items-start gap-3">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-base truncate text-gray-900">{debt.creditor}</h4>
                                  </div>
                                  <Badge variant="outline" className={`shrink-0 text-xs font-medium ${
                                    debt.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                    debt.status === 'paid' ? 'bg-green-50 text-green-700 border-green-200' :
                                    'bg-gray-50 text-gray-700 border-gray-200'
                                  }`}>
                                    {debt.status === 'pending' ? 'Pendiente' : 'Pagada'}
                                  </Badge>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Monto Total</span>
                                    <p className="text-lg font-bold text-gray-900">{formatCurrency(debt.amount)}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pagado</span>
                                    <p className="text-lg font-bold text-green-600">{formatCurrency(debt.totalPaid)}</p>
                                  </div>
                                </div>
                                
                                <div className="pt-2 border-t border-gray-100">
                                  <div className="space-y-1">
                                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Fecha de Vencimiento</span>
                                    <p className="text-sm font-medium text-gray-700">
                                      {debt.due_date ? format(new Date(debt.due_date), 'dd MMM yyyy') : 'Sin fecha'}
                                    </p>
                                  </div>
                                </div>

                                {/* Progress bar if partially paid */}
                                {debt.totalPaid > 0 && debt.totalPaid < debt.amount && (
                                  <div className="space-y-2">
                                    <div className="flex justify-between text-xs text-gray-500">
                                      <span>Progreso de pago</span>
                                      <span>{((debt.totalPaid / debt.amount) * 100).toFixed(1)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                      <div 
                                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                        style={{
                                          width: `${Math.min(100, (debt.totalPaid / debt.amount) * 100)}%`
                                        }}
                                      ></div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      {/* Desktop Table View */}
                      <div className="hidden lg:block rounded-md border">
                        <div className="grid grid-cols-6 p-3 bg-muted/50 text-sm font-medium">
                          <div className="col-span-2">Acreedor</div>
                          <div className="col-span-1">Monto</div>
                          <div className="col-span-1">Pagado</div>
                          <div className="col-span-1">Vence</div>
                          <div className="col-span-1">Estado</div>
                        </div>
                        <div className="divide-y">
                          {clientDebts.map((debt) => (
                            <div key={debt.id} className="grid grid-cols-6 p-3 items-center text-sm">
                              <div className="col-span-2">{debt.creditor}</div>
                              <div className="col-span-1 font-medium">{formatCurrency(debt.amount)}</div>
                              <div className="col-span-1 font-medium">{formatCurrency(debt.totalPaid)}</div>
                              <div className="col-span-1">{debt.due_date ? format(new Date(debt.due_date), 'MMM d, yyyy') : 'Sin fecha'}</div>
                              <div className="col-span-1">
                                <Badge variant="outline" className={
                                  debt.status === 'pending' ? 'bg-finance-yellow text-finance-gray-dark border-finance-yellow' :
                                  debt.status === 'paid' ? 'bg-finance-green text-white border-finance-green' :
                                  'bg-muted'
                                }>
                                  {debt.status === 'pending' ? 'Pendiente' : 'Pagada'}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No hay deudas para este cliente.</p>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="receivables">
                  {clientReceivables.length > 0 ? (
                    <>
                      {/* Mobile Cards View */}
                      <div className="block lg:hidden space-y-4 mt-4">
                        {clientReceivables.map((rec) => (
                          <Card key={rec.id} className="border shadow-sm">
                            <CardContent className="p-4">
                              <div className="space-y-3">
                                <div className="flex justify-between items-start gap-3">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-base truncate text-gray-900">{rec.description}</h4>
                                  </div>
                                  <Badge variant="outline" className={`shrink-0 text-xs font-medium ${
                                    rec.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                    rec.status === 'paid' ? 'bg-green-50 text-green-700 border-green-200' :
                                    'bg-gray-50 text-gray-700 border-gray-200'
                                  }`}>
                                    {rec.status === 'pending' ? 'Pendiente' : 'Pagada'}
                                  </Badge>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Monto Total</span>
                                    <p className="text-lg font-bold text-gray-900">{formatCurrency(rec.amount)}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pagado</span>
                                    <p className="text-lg font-bold text-green-600">{formatCurrency(rec.totalPaid)}</p>
                                  </div>
                                </div>
                                
                                <div className="pt-2 border-t border-gray-100">
                                  <div className="space-y-1">
                                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Fecha de Vencimiento</span>
                                    <p className="text-sm font-medium text-gray-700">
                                      {rec.due_date ? format(new Date(rec.due_date), 'dd MMM yyyy') : 'Sin fecha'}
                                    </p>
                                  </div>
                                </div>

                                {/* Progress bar if partially paid */}
                                {rec.totalPaid > 0 && rec.totalPaid < rec.amount && (
                                  <div className="space-y-2">
                                    <div className="flex justify-between text-xs text-gray-500">
                                      <span>Progreso de pago</span>
                                      <span>{((rec.totalPaid / rec.amount) * 100).toFixed(1)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                      <div 
                                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                        style={{
                                          width: `${Math.min(100, (rec.totalPaid / rec.amount) * 100)}%`
                                        }}
                                      ></div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      {/* Desktop Table View */}
                      <div className="hidden lg:block rounded-md border">
                        <div className="grid grid-cols-6 p-3 bg-muted/50 text-sm font-medium">
                          <div className="col-span-2">Descripción</div>
                          <div className="col-span-1">Monto</div>
                          <div className="col-span-1">Pagado</div>
                          <div className="col-span-1">Vence</div>
                          <div className="col-span-1">Estado</div>
                        </div>
                        <div className="divide-y">
                          {clientReceivables.map((rec) => (
                            <div key={rec.id} className="grid grid-cols-6 p-3 items-center text-sm">
                              <div className="col-span-2">{rec.description}</div>
                              <div className="col-span-1 font-medium">{formatCurrency(rec.amount)}</div>
                              <div className="col-span-1 font-medium">{formatCurrency(rec.totalPaid)}</div>
                              <div className="col-span-1">{rec.due_date ? format(new Date(rec.due_date), 'MMM d, yyyy') : 'Sin fecha'}</div>
                              <div className="col-span-1">
                                <Badge variant="outline" className={
                                  rec.status === 'pending' ? 'bg-finance-yellow text-finance-gray-dark border-finance-yellow' :
                                  rec.status === 'paid' ? 'bg-finance-green text-white border-finance-green' :
                                  'bg-muted'
                                }>
                                  {rec.status === 'pending' ? 'Pendiente' : 'Pagada'}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No hay cuentas por cobrar para este cliente.</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          
          <div className="flex justify-end gap-2">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">Editar Cliente</Button>
              </DialogTrigger>
              <ClientFormModal 
                open={dialogOpen} 
                onOpenChange={setDialogOpen} 
                client={client} 
                allClients={allClients}
                mode="edit"
                onSuccess={handleClientUpdated}
              />
            </Dialog>
            <Button variant="default" asChild>
              <Link to={`/operations/transaction/new?clientId=${clientId}`}>Agregar Transacción</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDetail;
