
import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";

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
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
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
