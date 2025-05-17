import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { 
  Card, 
  CardContent, 
  CardDescription, 
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
import { mockTransactions, mockDetailedDebts, mockDetailedReceivables } from "@/data/mockData";
import { format } from "date-fns";
import { AlertTriangle, ChevronLeft, FileText, Receipt, Loader2 } from "lucide-react";
import { clientService } from "@/integrations/supabase/clientService";
import { Client } from "@/types";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import ClientFormModal from "@/components/clients/ClientFormModal";

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
  
  // Cargar los datos del cliente desde Supabase
  useEffect(() => {
    const loadClient = async () => {
      if (!clientId) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await clientService.getClientById(clientId);
        
        if (error) {
          throw error;
        }
        
        if (data) {
          setClient(data);
          setEditClient(data); // Inicializar estado de edición
          
          // Si es un cliente indirecto, cargar el cliente principal asociado
          if (data.clientType === "indirect" && data.relatedToClientId) {
            const { data: relatedData } = await clientService.getClientById(data.relatedToClientId);
            if (relatedData) {
              setRelatedClient(relatedData);
            }
          }
          
          // Buscar clientes indirectos asociados a este cliente
          if (data.clientType === "direct") {
            try {
              const { data: clientsData } = await clientService.getClients();
              if (clientsData) {
                setAllClients(clientsData);
                const indirectClientsData = clientsData.filter(
                  c => c.relatedToClientId === clientId
                );
                setIndirectClients(indirectClientsData);
              }
            } catch (error) {
              console.error("Error loading indirect clients:", error);
            }
          } else {
            // Si es indirecto, cargar todos los clientes para el selector
            try {
              const { data: clientsData } = await clientService.getClients();
              if (clientsData) {
                setAllClients(clientsData);
              }
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
  
  const clientTransactions = mockTransactions.filter(t => t.clientId === clientId);
  
  // Pagos indirectos hechos a favor de este cliente (se mantiene mock data por ahora)
  const indirectPayments = mockTransactions.filter(
    t => t.type === "payment" && t.indirectForClientId === clientId
  );

  // Todas las transacciones relevantes (directas + pagos indirectos)
  const allTransactions = [
    ...clientTransactions,
    ...indirectPayments
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Helper para saber si una transacción es un pago indirecto
  const isIndirectPayment = (transaction: typeof mockTransactions[number]) =>
    transaction.type === "payment" && transaction.indirectForClientId === clientId;

  // Sumar pagos indirectos para descontar de la deuda
  const totalIndirectPayments = indirectPayments.reduce((sum, t) => sum + t.amount, 0);

  // Deudas asociadas a este cliente, con pagos calculados
  const clientDebts = mockDetailedDebts
    .filter(d => d.clientId === clientId)
    .map(debt => {
      const payments = mockTransactions.filter(t => t.type === 'payment' && t.debtId === debt.id && t.status === 'completed');
      const totalPaid = payments.reduce((sum, t) => sum + t.amount, 0);
      const isPaid = totalPaid >= debt.amount;
      return {
        ...debt,
        status: isPaid ? 'paid' : debt.status,
        totalPaid,
        payments
      };
    });
  // Cuentas por cobrar asociadas a este cliente, con pagos calculados
  const clientReceivables = mockDetailedReceivables
    .filter(r => r.clientId === clientId)
    .map(rec => {
      const payments = mockTransactions.filter(t => t.type === 'payment' && t.receivableId === rec.id && t.status === 'completed');
      const totalPaid = payments.reduce((sum, t) => sum + t.amount, 0);
      const isPaid = totalPaid >= rec.amount;
      return {
        ...rec,
        status: isPaid ? 'paid' : rec.status,
        totalPaid,
        payments
      };
    });

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

  if (isLoading) {
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
      const { error } = await clientService.updateClient(client.id, {
        active: checked
      });
      
      if (error) {
        throw error;
      }
      
      toast.success(`Estado del cliente ${checked ? 'activado' : 'desactivado'}`);
    } catch (error) {
      console.error("Error updating client status:", error);
      toast.error("Error al actualizar el estado del cliente");
      // Revertir el cambio en la UI si hay error
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
      const { error } = await clientService.updateClient(client.id, {
        alertStatus: newAlertStatus
      });
      
      if (error) {
        throw error;
      }
      
      toast.success(`Estado de alerta actualizado a ${value}`);
    } catch (error) {
      console.error("Error updating alert status:", error);
      toast.error("Error al actualizar el estado de alerta");
      // Revertir el cambio en la UI si hay error
      setAlertStatus(client.alertStatus || 'none');
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleAlertNoteChange = async () => {
    setIsUpdating(true);
    
    try {
      const { error } = await clientService.updateClient(client.id, {
        alertNote
      });
      
      if (error) {
        throw error;
      }
      
      toast.success("Nota de alerta actualizada");
    } catch (error) {
      console.error("Error updating alert note:", error);
      toast.error("Error al actualizar la nota de alerta");
      // Revertir el cambio en la UI si hay error
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
    // Actualizar el cliente en el estado
    setClient(updatedClient);
    
    // Si era un cliente indirecto y ha cambiado el cliente principal, cargar el nuevo cliente principal
    if (updatedClient.clientType === "indirect" && updatedClient.relatedToClientId && 
        (!client || updatedClient.relatedToClientId !== client.relatedToClientId)) {
      clientService.getClientById(updatedClient.relatedToClientId)
        .then(({ data }) => {
          if (data) {
            setRelatedClient(data);
          }
        })
        .catch(error => {
          console.error("Error loading related client:", error);
        });
    }
    
    // Actualizar el estado local
    setIsActive(updatedClient.active);
    setAlertStatus(updatedClient.alertStatus || "none");
    setAlertNote(updatedClient.alertNote || "");
    
    toast.success("Cliente actualizado con éxito");
  };
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild className="gap-1">
          <Link to="/clients">
            <ChevronLeft size={16} />
            Volver
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">{client.name}</h1>
        <Badge variant="outline" className="capitalize ml-2">{client.category}</Badge>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información del Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-[100px_1fr] gap-1">
                <span className="font-medium text-muted-foreground">Correo:</span>
                <span>{client.email}</span>
              </div>
              
              <div className="grid grid-cols-[100px_1fr] gap-1">
                <span className="font-medium text-muted-foreground">Teléfono:</span>
                <span>{client.phone}</span>
              </div>
              
              <div className="grid grid-cols-[100px_1fr] gap-1">
                <span className="font-medium text-muted-foreground">Dirección:</span>
                <span>{client.address}</span>
              </div>
              
              {client.contactPerson && (
                <div className="grid grid-cols-[100px_1fr] gap-1">
                  <span className="font-medium text-muted-foreground">Contacto:</span>
                  <span>{client.contactPerson}</span>
                </div>
              )}
              
              <div className="grid grid-cols-[100px_1fr] gap-1">
                <span className="font-medium text-muted-foreground">Agregado:</span>
                <span>{format(client.createdAt, 'MMM d, yyyy')}</span>
              </div>
              
              {client.clientType === "indirect" && relatedClient && (
                <div className="grid grid-cols-[100px_1fr] gap-1">
                  <span className="font-medium text-muted-foreground">Asociado a:</span>
                  <Link to={`/clients/${relatedClient.id}`} className="text-primary hover:underline">
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
                <TabsList>
                  <TabsTrigger value="overview">Resumen</TabsTrigger>
                  <TabsTrigger value="transactions">Transacciones</TabsTrigger>
                  <TabsTrigger value="debts">Deudas</TabsTrigger>
                  <TabsTrigger value="receivables">Cuentas por Cobrar</TabsTrigger>
                </TabsList>
                <TabsContent value="overview">
                  {/* ... existing overview content ... */}
                </TabsContent>
                <TabsContent value="transactions">
                  {allTransactions.length > 0 ? (
                    <div className="rounded-md border">
                      <div className="grid grid-cols-12 p-3 bg-muted/50 text-sm font-medium">
                        <div className="col-span-5">Descripción</div>
                        <div className="col-span-2">Fecha</div>
                        <div className="col-span-2">Monto</div>
                        <div className="col-span-2">Estado</div>
                        <div className="col-span-1">Acción</div>
                      </div>
                      <div className="divide-y">
                        {allTransactions.map((transaction) => (
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
                              {format(new Date(transaction.date), 'MMM d, yyyy')}
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
                                {transaction.status}
                              </Badge>
                            </div>
                            <div className="col-span-1">
                              <Button size="sm" variant="ghost">Ver</Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No hay transacciones para este cliente.</p>
                      <Button variant="outline" className="mt-4" asChild>
                        <Link to="/operations/transaction/new">Agregar Transacción</Link>
                      </Button>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="debts">
                  {clientDebts.length > 0 ? (
                    <div className="rounded-md border">
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
                            <div className="col-span-1">{format(new Date(debt.dueDate), 'MMM d, yyyy')}</div>
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
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No hay deudas para este cliente.</p>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="receivables">
                  {clientReceivables.length > 0 ? (
                    <div className="rounded-md border">
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
                            <div className="col-span-1">{format(new Date(rec.dueDate), 'MMM d, yyyy')}</div>
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
