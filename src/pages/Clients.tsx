import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Client } from "@/types";
import { Link } from "react-router-dom";
import { Search, UserPlus, Filter, AlertTriangle, FileText, UserRound, Users, Loader2, Eye } from "lucide-react";
import { clientService } from "@/integrations/supabase/clientService";
import ClientFormModal from "@/components/clients/ClientFormModal";
import type { Client as SupabaseClient } from "@/integrations/supabase/clientService";
import { getDebtsByClientId, Debt } from "@/integrations/supabase/debtService";
import { getReceivablesByClientId, Receivable } from "@/integrations/supabase/receivableService";
import { getPaymentsByDebtId, getPaymentsByReceivableId, Transaction as SupabaseTransaction } from "@/integrations/supabase/transactionService";

// Tipos extendidos para el resumen financiero
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

const Clients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [clientTypeFilter, setClientTypeFilter] = useState<"all" | "direct" | "indirect">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [financialSummaries, setFinancialSummaries] = useState<Record<string, { debts: DebtWithPayments[]; receivables: ReceivableWithPayments[] }>>({});
  
  // Cargar clientes al montar el componente
  useEffect(() => {
    loadClients();
  }, []);
  
  // Función para cargar todos los clientes
  const loadClients = async () => {
    setIsLoading(true);
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
        documents: [], // Si tienes documentos, mapea aquí
        createdAt: c.created_at ? new Date(c.created_at) : undefined,
        updatedAt: c.updated_at ? new Date(c.updated_at) : undefined,
        alertStatus: (c.alert_status as 'none' | 'yellow' | 'red') || 'none',
        alertNote: c.alert_note || "",
        relatedToClientId: c.related_to_client_id,
      }));
      setClients(clients);
    } catch (error) {
      console.error("Error loading clients:", error);
      toast.error("Error al cargar los clientes");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Manejar búsqueda de clientes
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadClients();
      return;
    }
    
    setIsLoading(true);
    try {
      const { data, error } = await clientService.searchClients(searchQuery);
      if (error) {
        throw error;
      }
      
      if (data) {
        setClients(data);
      }
    } catch (error) {
      console.error("Error searching clients:", error);
      toast.error("Error al buscar clientes");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Manejar la creación exitosa de un cliente
  const handleClientCreated = (newClient: Client) => {
    // Agregar el nuevo cliente a la lista
    setClients([newClient, ...clients]);
  };

  const filteredClients = clients.filter((client) => {
    const matchesActiveFilter = 
      activeFilter === "all" || 
      (activeFilter === "active" && client.active) || 
      (activeFilter === "inactive" && !client.active);
    
    const matchesCategory = categoryFilter === "all" || client.category === categoryFilter;
    
    const matchesClientType = clientTypeFilter === "all" || client.clientType === clientTypeFilter;
    
    return matchesActiveFilter && matchesCategory && matchesClientType;
  });

  const getAlertStatusColor = (status?: 'none' | 'yellow' | 'red') => {
    if (status === 'red') return 'bg-finance-red text-white';
    if (status === 'yellow') return 'bg-finance-yellow text-finance-gray-dark';
    return 'bg-muted text-muted-foreground';
  };

  // Función para cargar el resumen financiero de un cliente desde Supabase
  const loadClientFinancialSummary = async (clientId: string) => {
    // Deudas
    const debts = await getDebtsByClientId(clientId);
    const debtsWithPayments = await Promise.all(
      debts.map(async (debt) => {
        const payments = await getPaymentsByDebtId(debt.id);
        const totalPaid = payments.reduce((sum, t) => sum + t.amount, 0);
        return { ...debt, payments, totalPaid, status: totalPaid >= debt.amount ? "paid" : debt.status };
      })
    );
    // Cuentas por cobrar
    const receivables = await getReceivablesByClientId(clientId);
    const receivablesWithPayments = await Promise.all(
      receivables.map(async (rec) => {
        const payments = await getPaymentsByReceivableId(rec.id);
        const totalPaid = payments.reduce((sum, t) => sum + t.amount, 0);
        return { ...rec, payments, totalPaid, status: totalPaid >= rec.amount ? "paid" : rec.status };
      })
    );
    return { debts: debtsWithPayments, receivables: receivablesWithPayments };
  };

  // useEffect para cargar los resúmenes financieros de todos los clientes al cargar la lista
  useEffect(() => {
    if (clients.length === 0) return;
    const fetchSummaries = async () => {
      const summaries: Record<string, { debts: DebtWithPayments[]; receivables: ReceivableWithPayments[] }> = {};
      await Promise.all(
        clients.map(async (client) => {
          summaries[client.id] = await loadClientFinancialSummary(client.id);
        })
      );
      setFinancialSummaries(summaries);
    };
    fetchSummaries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Gestión de Clientes</h1>
        
        <div className="flex items-center gap-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus size={16} />
                <span className="hidden sm:inline">Nuevo Cliente</span>
              </Button>
            </DialogTrigger>
            <ClientFormModal 
              open={dialogOpen} 
              onOpenChange={setDialogOpen} 
              mode="create"
              allClients={clients}
              onSuccess={handleClientCreated}
            />
          </Dialog>
        </div>
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="relative w-full sm:w-72">
              <Search size={18} className="absolute left-2 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Buscar clientes..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-muted-foreground" />
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full h-9">
                    <SelectValue placeholder="Todas las Categorías" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las Categorías</SelectItem>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="company">Empresa</SelectItem>
                    <SelectItem value="non-profit">Sin Fines de Lucro</SelectItem>
                    <SelectItem value="government">Gobierno</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <Users size={16} className="text-muted-foreground" />
                <Select value={clientTypeFilter} onValueChange={(value) => setClientTypeFilter(value as "all" | "direct" | "indirect")}>
                  <SelectTrigger className="w-full h-9">
                    <SelectValue placeholder="Tipo de Cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los Tipos</SelectItem>
                    <SelectItem value="direct">Directo</SelectItem>
                    <SelectItem value="indirect">Indirecto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Tabs value={activeFilter} onValueChange={(v) => setActiveFilter(v as "all" | "active" | "inactive")}>
                <TabsList>
                  <TabsTrigger value="all">Todos</TabsTrigger>
                  <TabsTrigger value="active">Activos</TabsTrigger>
                  <TabsTrigger value="inactive">Inactivos</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="w-full py-20 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-lg text-muted-foreground">No se encontraron clientes</p>
              <p className="text-sm text-muted-foreground">Prueba cambiando los filtros o crea un nuevo cliente</p>
            </div>
          ) : (
            <>
              {/* Mobile Cards View */}
              <div className="block lg:hidden space-y-3">
                {filteredClients.map((client) => {
                  const summary = financialSummaries[client.id] || { debts: [], receivables: [] };
                  return (
                    <Card key={client.id} className="border">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-sm truncate flex items-center gap-2">
                                {client.name}
                                {client.clientType === 'indirect' && (
                                  <Badge variant="outline" className="bg-yellow-50 text-xs">
                                    <Users size={10} className="mr-1" />
                                    Indirecto
                                  </Badge>
                                )}
                                {client.clientType === 'direct' && (
                                  <Badge variant="outline" className="bg-slate-50 text-xs">
                                    <UserRound size={10} className="mr-1" />
                                    Directo
                                  </Badge>
                                )}
                              </h3>
                              <p className="text-xs text-muted-foreground capitalize">
                                {client.category}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 ml-2">
                              <Badge variant={client.active ? "default" : "outline"} className={`text-xs ${client.active ? "bg-finance-green" : ""}`}>
                                {client.active ? "Activo" : "Inactivo"}
                              </Badge>
                              {client.alertStatus !== 'none' && (
                                <Badge className={`text-xs ${getAlertStatusColor(client.alertStatus)}`}>
                                  <AlertTriangle size={10} className="mr-1" />
                                  {client.alertStatus}
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">Email:</span>
                              <p className="font-medium truncate">{client.email}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Teléfono:</span>
                              <p className="font-medium">{client.phone}</p>
                            </div>
                            {client.clientType === 'indirect' && client.relatedToClientId && (
                              <div>
                                <span className="text-muted-foreground">Asociado a:</span>
                                <Link to={`/clients/${client.relatedToClientId}`} className="text-primary hover:underline text-xs">
                                  {clients.find(c => c.id === client.relatedToClientId)?.name || 'Cliente'}
                                </Link>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex gap-2 pt-2">
                            <Button variant="outline" size="sm" asChild className="flex-1">
                              <Link to={`/clients/${client.id}`}>
                                <Eye className="h-3 w-3 mr-1" />
                                Ver Detalle
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block rounded-md border">
                <div className="grid grid-cols-1 md:grid-cols-12 p-4 bg-muted/50 text-sm font-medium">
                  <div className="hidden md:block md:col-span-3">Nombre</div>
                  <div className="hidden md:block md:col-span-2">Categoría</div>
                  <div className="hidden md:block md:col-span-2">Estado</div>
                  <div className="hidden md:block md:col-span-3">Contacto</div>
                  <div className="hidden md:block md:col-span-2 text-right">Acciones</div>
                </div>
                
                <div className="divide-y">
                  {filteredClients.map((client) => {
                    const summary = financialSummaries[client.id] || { debts: [], receivables: [] };
                    return (
                      <div key={client.id} className="grid grid-cols-1 md:grid-cols-12 p-4 items-center">
                        <div className="md:col-span-3 space-y-1">
                          <div className="font-medium flex items-center gap-2">
                            {client.name}
                            {client.clientType === 'indirect' && (
                              <Badge variant="outline" className="bg-yellow-50 text-xs">
                                <Users size={12} className="mr-1" />
                                Indirecto
                              </Badge>
                            )}
                            {client.clientType === 'direct' && (
                              <Badge variant="outline" className="bg-slate-50 text-xs">
                                <UserRound size={12} className="mr-1" />
                                Directo
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground md:hidden">
                            {client.category} • {client.active ? 'Activo' : 'Inactivo'}
                          </div>
                        </div>
                        
                        <div className="hidden md:block md:col-span-2">
                          <Badge variant="outline" className="capitalize">{client.category}</Badge>
                        </div>
                        
                        <div className="md:col-span-2 flex items-center gap-2 mt-2 md:mt-0">
                          <Badge variant={client.active ? "default" : "outline"} className={client.active ? "bg-finance-green" : ""}>
                            {client.active ? "Activo" : "Inactivo"}
                          </Badge>
                          
                          {client.alertStatus !== 'none' && (
                            <Badge className={getAlertStatusColor(client.alertStatus)}>
                              <AlertTriangle size={12} className="mr-1" />
                              {client.alertStatus}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="md:col-span-3 mt-2 md:mt-0">
                          <div className="text-sm">{client.email}</div>
                          <div className="text-sm text-muted-foreground">{client.phone}</div>
                          {client.clientType === 'indirect' && client.relatedToClientId && (
                            <div className="text-xs mt-1 text-muted-foreground flex items-center">
                              <span className="mr-1">Asociado a:</span>
                              <Link to={`/clients/${client.relatedToClientId}`} className="text-primary hover:underline">
                                {clients.find(c => c.id === client.relatedToClientId)?.name || 'Cliente'}
                              </Link>
                            </div>
                          )}
                        </div>
                        
                        <div className="md:col-span-2 flex justify-start md:justify-end mt-3 md:mt-0 gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`/clients/${client.id}`}>Ver</Link>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Clients;
