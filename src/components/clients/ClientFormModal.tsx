import { useState, useEffect } from "react";
import { Client } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Loader2 } from "lucide-react";
import { clientService } from "@/integrations/supabase/clientService";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

interface ClientFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
  allClients?: Client[];
  onSuccess?: (client: Client) => void;
  mode: "create" | "edit";
}

const defaultClientData = {
  name: "",
  email: "",
  phone: "",
  address: "",
  category: "individual" as Client["category"],
  clientType: "direct" as Client["clientType"],
  contactPerson: "",
  identificationDoc: {
    type: "ID" as "ID" | "RIF",
    number: "",
    fileUrl: ""
  },
  active: true,
  relatedToClientId: "",
  alertStatus: "none" as Client["alertStatus"],
  alertNote: ""
};

const ClientFormModal = ({
  open,
  onOpenChange,
  client,
  allClients = [],
  onSuccess,
  mode
}: ClientFormModalProps) => {
  const [formData, setFormData] = useState<Partial<Client>>(defaultClientData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inicializar formulario cuando cambia el cliente (modo editar) o se abre el modal
  useEffect(() => {
    if (mode === "edit" && client) {
      setFormData(client);
    } else if (mode === "create") {
      setFormData(defaultClientData);
    }
  }, [client, mode, open]);

  const handleSubmit = async () => {
    // Validar campos obligatorios
    if (!formData.name?.trim()) {
      toast.error("El nombre del cliente es obligatorio");
      return;
    }

    // Validar que un cliente indirecto tenga un cliente principal seleccionado
    if (formData.clientType === "indirect" && !formData.relatedToClientId) {
      toast.error("Debe seleccionar un cliente principal para un cliente indirecto");
      return;
    }

    setIsSubmitting(true);

    try {
      // Preparar datos para enviar
      const clientData = {
        ...formData,
        // Asegurarse de que un cliente directo no tenga relatedToClientId
        relatedToClientId: formData.clientType === "direct" ? undefined : formData.relatedToClientId,
      };

      let result;

      if (mode === "create") {
        // Crear nuevo cliente
        // Preparamos los campos que espera Supabase
        const now = new Date().toISOString();
        const clientToCreate = {
          id: uuidv4(),
          name: clientData.name,
          email: clientData.email,
          phone: clientData.phone,
          address: clientData.address,
          category: clientData.category,
          client_type: clientData.clientType,
          contact_person: clientData.contactPerson,
          active: clientData.active ?? true,
          related_to_client_id: clientData.clientType === "direct" ? null : clientData.relatedToClientId || null,
          alert_status: clientData.alertStatus || null,
          alert_note: clientData.alertNote || null,
          identification_type: clientData.identificationDoc?.type || null,
          identification_number: clientData.identificationDoc?.number || null,
          identification_file_url: clientData.identificationDoc?.fileUrl || null,
          created_at: now,
          updated_at: now,
        };
        const created = await clientService.createClient(clientToCreate);
        if (created) {
          toast.success("Cliente creado con éxito");
          if (onSuccess) onSuccess(created);
          onOpenChange(false);
          setFormData(defaultClientData);
        }
      } else {
        // Editar cliente existente
        if (!client?.id) throw new Error("ID de cliente no disponible");
        const now = new Date().toISOString();
        const updateData = {
          name: clientData.name,
          email: clientData.email,
          phone: clientData.phone,
          address: clientData.address,
          category: clientData.category,
          client_type: clientData.clientType,
          contact_person: clientData.contactPerson,
          active: clientData.active ?? true,
          related_to_client_id: clientData.clientType === "direct" ? null : clientData.relatedToClientId || null,
          alert_status: clientData.alertStatus || null,
          alert_note: clientData.alertNote || null,
          identification_type: clientData.identificationDoc?.type || null,
          identification_number: clientData.identificationDoc?.number || null,
          identification_file_url: clientData.identificationDoc?.fileUrl || null,
          updated_at: now,
        };
        const updated = await clientService.updateClient(client.id, updateData);
        if (updated) {
          toast.success("Cliente actualizado con éxito");
          if (onSuccess) onSuccess(updated);
          onOpenChange(false);
        }
      }
    } catch (error) {
      console.error(mode === "create" ? "Error creating client:" : "Error updating client:", error);
      toast.error(
        mode === "create" ? "Error al crear el cliente" : "Error al actualizar el cliente"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Agregar Nuevo Cliente" : "Editar Cliente"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Completa el formulario para agregar un nuevo cliente a tu sistema."
              : "Modifica la información del cliente."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nombre del Cliente</Label>
            <Input
              id="name"
              value={formData.name || ""}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Correo</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ""}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={formData.phone || ""}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="address">Dirección</Label>
            <Input
              id="address"
              value={formData.address || ""}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="category">Categoría</Label>
              <Select
                value={formData.category || "individual"}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    category: value as Client["category"],
                  })
                }
              >
                <SelectTrigger id="category">
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
              <Input
                id="contactPerson"
                value={formData.contactPerson || ""}
                onChange={(e) =>
                  setFormData({ ...formData, contactPerson: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Tipo de Cliente</Label>
            <RadioGroup
              value={formData.clientType || "direct"}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  clientType: value as Client["clientType"],
                })
              }
              className="flex gap-4"
            >
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

          {formData.clientType === "indirect" && (
            <div className="grid gap-2">
              <Label htmlFor="related-client">Cliente Principal</Label>
              <Select
                value={formData.relatedToClientId || ""}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    relatedToClientId: value,
                  })
                }
              >
                <SelectTrigger id="related-client">
                  <SelectValue placeholder="Seleccionar cliente principal" />
                </SelectTrigger>
                <SelectContent>
                  {allClients
                    .filter(
                      (c) =>
                        c.clientType === "direct" &&
                        c.active &&
                        c.id !== formData.id
                    )
                    .map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                El cliente indirecto estará asociado a este cliente principal
              </p>
            </div>
          )}

          <div className="grid gap-2">
            <Label>Documento de Identificación</Label>
            <div className="grid grid-cols-2 gap-4">
              <Select
                value={formData.identificationDoc?.type || "ID"}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    identificationDoc: {
                      type: value as "ID" | "RIF",
                      number: formData.identificationDoc?.number || "",
                      fileUrl: formData.identificationDoc?.fileUrl,
                    },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de documento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ID">Cédula</SelectItem>
                  <SelectItem value="RIF">RIF</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Número de documento"
                value={formData.identificationDoc?.number || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    identificationDoc: {
                      type: formData.identificationDoc?.type || "ID",
                      number: e.target.value,
                      fileUrl: formData.identificationDoc?.fileUrl,
                    },
                  })
                }
              />
            </div>
            {mode === "create" && (
              <div className="mt-2">
                <Label className="text-sm text-muted-foreground mb-2 block">
                  Subir Documento
                </Label>
                <div className="border-2 border-dashed rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="file"
                      className="max-w-[250px]"
                      accept=".pdf,.jpg,.jpeg,.png"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    PDF, JPG o PNG hasta 5MB
                  </p>
                </div>
              </div>
            )}
          </div>

          {mode === "edit" && (
            <>
              <div className="grid gap-2">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.active}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, active: checked })
                    }
                    id="active"
                  />
                  <Label htmlFor="active">Cliente Activo</Label>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="alert-status">Estado de Alerta</Label>
                <Select
                  value={formData.alertStatus || "none"}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      alertStatus: value as Client["alertStatus"],
                      // Si se cambia a "none", limpiamos la nota
                      alertNote: value === "none" ? "" : formData.alertNote,
                    })
                  }
                >
                  <SelectTrigger id="alert-status">
                    <SelectValue placeholder="Seleccionar estado de alerta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ninguna</SelectItem>
                    <SelectItem value="yellow">Amarilla</SelectItem>
                    <SelectItem value="red">Roja</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.alertStatus && formData.alertStatus !== "none" && (
                <div className="grid gap-2">
                  <Label htmlFor="alert-note">Nota de Alerta</Label>
                  <Textarea
                    id="alert-note"
                    value={formData.alertNote || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, alertNote: e.target.value })
                    }
                    placeholder="Describe la razón de la alerta..."
                    className="resize-none"
                  />
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {mode === "create" ? "Crear Cliente" : "Guardar Cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ClientFormModal; 