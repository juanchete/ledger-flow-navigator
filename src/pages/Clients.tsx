import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { mockClients, mockDetailedDebts, mockDetailedReceivables, mockTransactions } from "@/data/mockData";
import { Client } from "@/types";
import { Link } from "react-router-dom";
import { Search, UserPlus, Filter, AlertTriangle, FileText, UserRound, Users } from "lucide-react";
import { format } from "date-fns";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const Clients = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [clientTypeFilter, setClientTypeFilter] = useState<"all" | "direct" | "indirect">("all");

  const filteredClients = mockClients.filter((client) => {
    const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       (client.contactPerson && client.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesActiveFilter = 
      activeFilter === "all" || 
      (activeFilter === "active" && client.active) || 
      (activeFilter === "inactive" && !client.active);
    
    const matchesCategory = categoryFilter === "all" || client.category === categoryFilter;
    
    const matchesClientType = clientTypeFilter === "all" || client.clientType === clientTypeFilter;
    
    return matchesSearch && matchesActiveFilter && matchesCategory && matchesClientType;
  });

  const getAlertStatusColor = (status?: 'none' | 'yellow' | 'red') => {
    if (status === 'red') return 'bg-finance-red text-white';
    if (status === 'yellow') return 'bg-finance-yellow text-finance-gray-dark';
    return 'bg-muted text-muted-foreground';
  };

  const handleCreateClient = () => {
    toast.success("Client created successfully! This is a mock action in the MVP.");
  };

  // Helper para obtener resumen de deudas y cuentas por cobrar de un cliente
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
          <Dialog>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus size={16} />
                <span className="hidden sm:inline">Nuevo Cliente</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
              <DialogHeader>
                <DialogTitle>Agregar Nuevo Cliente</DialogTitle>
                <DialogDescription>
                  Completa el formulario para agregar un nuevo cliente a tu sistema.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nombre del Cliente</Label>
                  <Input id="name" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Correo</Label>
                    <Input id="email" type="email" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input id="phone" />
                  </div>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Input id="address" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="category">Categoría</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="individual">Individual</SelectItem>
                        <SelectItem value="company">Empresa</SelectItem>
                        <SelectItem value="non-profit">Sin Fines de Lucro</SelectItem>
                        <SelectItem value="government">Gobierno</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="contactPerson">Persona de Contacto</Label>
                    <Input id="contactPerson" />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Tipo de Cliente</Label>
                  <RadioGroup defaultValue="direct" className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="direct" id="direct" />
                      <Label htmlFor="direct">Directo</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="indirect" id="indirect" />
                      <Label htmlFor="indirect">Indirecto</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="grid gap-2">
                  <Label>Documento de Identificación</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Tipo de documento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ID">Cédula</SelectItem>
                        <SelectItem value="RIF">RIF</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input placeholder="Número de documento" />
                  </div>
                  <div className="mt-2">
                    <Label className="text-sm text-muted-foreground mb-2 block">Subir Documento</Label>
                    <div className="border-2 border-dashed rounded-lg p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <Input type="file" className="max-w-[250px]" accept=".pdf,.jpg,.jpeg,.png" />
                      </div>
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        PDF, JPG o PNG hasta 5MB
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => {}}>Cancelar</Button>
                <Button onClick={handleCreateClient}>Crear Cliente</Button>
              </DialogFooter>
            </DialogContent>
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
          <div className="rounded-md border">
            <div className="grid grid-cols-1 md:grid-cols-12 p-4 bg-muted/50 text-sm font-medium">
              <div className="hidden md:block md:col-span-3">Nombre</div>
              <div className="hidden md:block md:col-span-2">Categoría</div>
              <div className="hidden md:block md:col-span-2">Estado</div>
              <div className="hidden md:block md:col-span-3">Contacto</div>
              <div className="hidden md:block md:col-span-2 text-right">Acciones</div>
            </div>
            
            <div className="divide-y">
              {filteredClients.length > 0 ? (
                filteredClients.map((client) => {
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
                              {mockClients.find(c => c.id === client.relatedToClientId)?.name || 'Cliente'}
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
                })
              ) : (
                <div className="p-6 text-center text-muted-foreground">
                  No se encontraron clientes que coincidan con tu búsqueda
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Clients;
