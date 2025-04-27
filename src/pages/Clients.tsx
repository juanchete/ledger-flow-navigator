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
import { mockClients } from "@/data/mockData";
import { Client } from "@/types";
import { Link } from "react-router-dom";
import { Search, UserPlus, Filter, AlertTriangle, FileText } from "lucide-react";
import { format } from "date-fns";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const Clients = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const filteredClients = mockClients.filter((client) => {
    const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       (client.contactPerson && client.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesActiveFilter = 
      activeFilter === "all" || 
      (activeFilter === "active" && client.active) || 
      (activeFilter === "inactive" && !client.active);
    
    const matchesCategory = categoryFilter === "all" || client.category === categoryFilter;
    
    return matchesSearch && matchesActiveFilter && matchesCategory;
  });

  const getAlertStatusColor = (status?: 'none' | 'yellow' | 'red') => {
    if (status === 'red') return 'bg-finance-red text-white';
    if (status === 'yellow') return 'bg-finance-yellow text-finance-gray-dark';
    return 'bg-muted text-muted-foreground';
  };

  const handleCreateClient = () => {
    toast.success("Client created successfully! This is a mock action in the MVP.");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Client Management</h1>
        
        <div className="flex items-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus size={16} />
                <span className="hidden sm:inline">New Client</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
              <DialogHeader>
                <DialogTitle>Add New Client</DialogTitle>
                <DialogDescription>
                  Fill out the form below to add a new client to your system.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Client Name</Label>
                  <Input id="name" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" />
                  </div>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="category">Category</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="individual">Individual</SelectItem>
                        <SelectItem value="company">Company</SelectItem>
                        <SelectItem value="non-profit">Non-profit</SelectItem>
                        <SelectItem value="government">Government</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="contactPerson">Contact Person</Label>
                    <Input id="contactPerson" />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Client Type</Label>
                  <RadioGroup defaultValue="direct" className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="direct" id="direct" />
                      <Label htmlFor="direct">Direct</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="indirect" id="indirect" />
                      <Label htmlFor="indirect">Indirect</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="grid gap-2">
                  <Label>Identification Document</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Document type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ID">ID</SelectItem>
                        <SelectItem value="RIF">RIF</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input placeholder="Document number" />
                  </div>
                  <div className="mt-2">
                    <Label className="text-sm text-muted-foreground mb-2 block">Upload Document</Label>
                    <div className="border-2 border-dashed rounded-lg p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <Input type="file" className="max-w-[250px]" accept=".pdf,.jpg,.jpeg,.png" />
                      </div>
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        PDF, JPG or PNG up to 5MB
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => {}}>Cancel</Button>
                <Button onClick={handleCreateClient}>Create Client</Button>
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
                placeholder="Search clients..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-muted-foreground" />
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-40 h-9">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="company">Company</SelectItem>
                    <SelectItem value="non-profit">Non-profit</SelectItem>
                    <SelectItem value="government">Government</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Tabs value={activeFilter} onValueChange={(v) => setActiveFilter(v as "all" | "active" | "inactive")}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="active">Active</TabsTrigger>
                  <TabsTrigger value="inactive">Inactive</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="grid grid-cols-1 md:grid-cols-12 p-4 bg-muted/50 text-sm font-medium">
              <div className="hidden md:block md:col-span-3">Name</div>
              <div className="hidden md:block md:col-span-2">Category</div>
              <div className="hidden md:block md:col-span-2">Status</div>
              <div className="hidden md:block md:col-span-3">Contact</div>
              <div className="hidden md:block md:col-span-2 text-right">Actions</div>
            </div>
            
            <div className="divide-y">
              {filteredClients.length > 0 ? (
                filteredClients.map((client) => (
                  <div key={client.id} className="grid grid-cols-1 md:grid-cols-12 p-4 items-center">
                    <div className="md:col-span-3 space-y-1">
                      <div className="font-medium">{client.name}</div>
                      <div className="text-sm text-muted-foreground md:hidden">
                        {client.category} • {client.active ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                    
                    <div className="hidden md:block md:col-span-2">
                      <Badge variant="outline" className="capitalize">{client.category}</Badge>
                    </div>
                    
                    <div className="md:col-span-2 flex items-center gap-2 mt-2 md:mt-0">
                      <Badge variant={client.active ? "default" : "outline"} className={client.active ? "bg-finance-green" : ""}>
                        {client.active ? "Active" : "Inactive"}
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
                    </div>
                    
                    <div className="md:col-span-2 flex justify-start md:justify-end mt-3 md:mt-0 gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/clients/${client.id}`}>View</Link>
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-muted-foreground">
                  No clients found matching your search criteria
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
