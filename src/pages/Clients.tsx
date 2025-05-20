import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { mockDetailedDebts, mockDetailedReceivables, mockTransactions } from "@/data/mockData";
import { Client } from "@/types";
import { Link } from "react-router-dom";
import { Search, UserPlus, Filter, AlertTriangle, FileText, UserRound, Users, Loader2 } from "lucide-react";
import { clientService } from "@/integrations/supabase/clientService";
import ClientFormModal from "@/components/clients/ClientFormModal";
import type { Client as SupabaseClient } from "@/integrations/supabase/clientService";

const Clients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [clientTypeFilter, setClientTypeFilter] = useState<"all" | "direct" | "indirect">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  
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

  // Helper para obtener resumen de deudas y cuentas por cobrar de un cliente (usando mock data por ahora)
  const getClientFinancialSummary = (clientId: string) => {
    // Deudas
    const debts = mockDetailedDebts.filter(d => d.clientId === clientId);
    const debtsWithPayments = debts.map(debt => {
      const payments = mockTransactions.filter(t => t.type === 'payment' && t.debtId === debt.id && t.status === 'completed');
      const totalPaid = payments.reduce((sum, t) => sum + t.amount, 0);
      const isPaid = totalPaid >= debt.amount;
      return {
        ...debt,
        status: isPaid ? 'paid' : debt.status,
        totalPaid
      };
    });
    // Cuentas por cobrar
    const receivables = mockDetailedReceivables.filter(r => r.clientId === clientId);
    const receivablesWithPayments = receivables.map(rec => {
      const payments = mockTransactions.filter(t => t.type === 'payment' && t.receivableId === rec.id && t.status === 'completed');
      const totalPaid = payments.reduce((sum, t) => sum + t.amount, 0);
      const isPaid = totalPaid >= rec.amount;
      return {
        ...rec,
        status: isPaid ? 'paid' : rec.status,
        totalPaid
      };
    });
    return {
      debts: debtsWithPayments,
      receivables: receivablesWithPayments
    };
  };

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
                  <SelectTrigger className="w-40 h-9">
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
                  <SelectTrigger className="w-40 h-9">
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
            <div className="rounded-md border">
              <div className="grid grid-cols-1 md:grid-cols-12 p-4 bg-muted/50 text-sm font-medium">
                <div className="hidden md:block md:col-span-3">Nombre</div>
                <div className="hidden md:block md:col-span-2">Categoría</div>
                <div className="hidden md:block md:col-span-2">Estado</div>
                <div className="hidden md:block md:col-span-3">Contacto</div>
                <div className="hidden md:block md:col-span-2 text-right">Acciones</div>
              </div>
              
              <div className="divide-y">
                {filteredClients.map((client) => {
                  const summary = getClientFinancialSummary(client.id);
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
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Clients;
