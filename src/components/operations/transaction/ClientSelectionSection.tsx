
import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, UserRound, Users } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface ClientSelectionSectionProps {
  selectedClient: string;
  onClientChange: (clientId: string) => void;
  clients: any[];
}

export const ClientSelectionSection: React.FC<ClientSelectionSectionProps> = ({
  selectedClient,
  onClientChange,
  clients
}) => {
  const [isNewClientDialogOpen, setIsNewClientDialogOpen] = useState(false);
  const [clientType, setClientType] = useState<'direct' | 'indirect'>('direct');
  const [relatedClientId, setRelatedClientId] = useState<string>('');

  const handleCreateClient = () => {
    toast.success("Client created successfully!");
    setIsNewClientDialogOpen(false);
  };

  return (
    <div className="grid gap-2">
      <Label htmlFor="client">Cliente</Label>
      <div className="flex gap-2">
        <Select value={selectedClient} onValueChange={onClientChange}>
          <SelectTrigger id="client">
            <SelectValue placeholder="Selecciona un cliente" />
          </SelectTrigger>
          <SelectContent>
            {Array.isArray(clients) && clients.length > 0 ? (
              clients.map((client) => (
                <SelectItem key={client.id} value={client.id} className="flex items-center">
                  <div className="flex items-center gap-2">
                    {client.name}
                    {client.clientType === 'indirect' ? (
                      <Badge variant="outline" className="bg-yellow-50 text-xs ml-1">
                        <Users size={10} className="mr-1" />
                        Indirecto
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-slate-50 text-xs ml-1">
                        <UserRound size={10} className="mr-1" />
                        Directo
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))
            ) : (
              <SelectItem value="" disabled>No hay clientes disponibles</SelectItem>
            )}
          </SelectContent>
        </Select>
        <Dialog open={isNewClientDialogOpen} onOpenChange={setIsNewClientDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="shrink-0">
              <UserPlus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Agregar nuevo cliente</DialogTitle>
              <DialogDescription>
                Completa el formulario para agregar un nuevo cliente al sistema.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nombre del cliente</Label>
                <Input id="name" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input id="phone" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category">Categoría</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona la categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="company">Empresa</SelectItem>
                    <SelectItem value="non-profit">ONG</SelectItem>
                    <SelectItem value="government">Gobierno</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Tipo de cliente</Label>
                <RadioGroup 
                  value={clientType} 
                  onValueChange={(value) => setClientType(value as 'direct' | 'indirect')} 
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="direct" id="direct" />
                    <Label htmlFor="direct" className="flex items-center gap-1">
                      <UserRound size={14} />
                      Directo
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="indirect" id="indirect" />
                    <Label htmlFor="indirect" className="flex items-center gap-1">
                      <Users size={14} />
                      Indirecto
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              
              {clientType === 'indirect' && (
                <div className="grid gap-2">
                  <Label htmlFor="relatedClient">Cliente relacionado</Label>
                  <Select value={relatedClientId} onValueChange={setRelatedClientId}>
                    <SelectTrigger id="relatedClient">
                      <SelectValue placeholder="Selecciona el cliente directo relacionado" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(clients) && clients.filter(c => c.clientType === 'direct').length > 0 ? (
                        clients.filter(c => c.clientType === 'direct').map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="" disabled>No hay clientes directos disponibles</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Un cliente indirecto debe estar relacionado con un cliente directo
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNewClientDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateClient}>Crear cliente</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
