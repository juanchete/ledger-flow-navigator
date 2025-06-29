import { Button } from "@/components/ui/button";
import { DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useEffect, useState } from "react";
import { getClients, Client } from "@/integrations/supabase/clientService";
import { createCalendarEvent } from "@/integrations/supabase/calendarEventService";
import { format } from "date-fns";

interface EventFormData {
  title: string;
  category: string;
  description: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  isReminder: boolean;
  reminderDays: string;
  clientId: string;
  location: string;
}

interface EventFormProps {
  onSave: (data: Partial<EventFormData & { is_reminder?: boolean; reminder_days?: number; client_id?: string | null }>) => void;
  onCancel: () => void;
  selectedDate?: Date | undefined;
  initialData?: Partial<EventFormData & { is_reminder?: boolean; reminder_days?: number; client_id?: string | null }>;
}

export const EventForm = ({ onSave, onCancel, selectedDate, initialData }: EventFormProps) => {
  const [eventData, setEventData] = useState<EventFormData>(() => {
    if (initialData) {
      return {
        title: initialData.title || '',
        category: initialData.category || '',
        description: initialData.description || '',
        startDate: initialData.startDate ? format(new Date(initialData.startDate), 'yyyy-MM-dd') : (selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')),
        startTime: initialData.startDate ? format(new Date(initialData.startDate), 'HH:mm') : '09:00',
        endDate: initialData.endDate ? format(new Date(initialData.endDate), 'yyyy-MM-dd') : (selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')),
        endTime: initialData.endDate ? format(new Date(initialData.endDate), 'HH:mm') : '10:00',
        isReminder: initialData.is_reminder || false,
        reminderDays: initialData.reminder_days?.toString() || '1',
        clientId: initialData.client_id || '',
        location: initialData.location || '',
      };
    }
    return {
      title: '',
      category: '',
      description: '',
      startDate: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      startTime: '09:00',
      endDate: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      endTime: '10:00',
      isReminder: false,
      reminderDays: '1',
      clientId: '',
      location: ''
    };
  });

  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    getClients().then(setClients);
  }, []);

  const handleChange = (field: string, value: string | boolean) => {
    setEventData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    const startDateTime = `${eventData.startDate}T${eventData.startTime}`;
    const endDateTime = `${eventData.endDate}T${eventData.endTime}`;
    if (initialData) {
      // Edición: solo pasar los datos editados
      onSave({
        ...eventData,
        startDate: new Date(startDateTime).toISOString(),
        endDate: new Date(endDateTime).toISOString(),
        is_reminder: eventData.isReminder,
        reminder_days: Number(eventData.reminderDays),
        client_id: eventData.clientId || null,
        location: eventData.location,
      });
    } else {
      // Creación: guardar en Supabase
      await createCalendarEvent({
        title: eventData.title,
        category: eventData.category,
        description: eventData.description,
        start_date: startDateTime,
        end_date: endDateTime,
        is_reminder: eventData.isReminder,
        reminder_days: Number(eventData.reminderDays),
        client_id: eventData.clientId || null,
        location: eventData.location,
        completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        id: crypto.randomUUID(),
        location_url: null,
      });
      onSave({});
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Añadir Nuevo Evento</DialogTitle>
        <DialogDescription>
          Crea un nuevo evento o recordatorio en tu calendario.
        </DialogDescription>
      </DialogHeader>
      
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="title">Título del evento</Label>
          <Input 
            id="title" 
            placeholder="Ingresa un título" 
            value={eventData.title}
            onChange={(e) => handleChange('title', e.target.value)}
          />
        </div>
        
        <div className="grid gap-2">
          <Label htmlFor="category">Categoría</Label>
          <Select 
            value={eventData.category}
            onValueChange={(value) => handleChange('category', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="legal">Legal</SelectItem>
              <SelectItem value="cash">Efectivo</SelectItem>
              <SelectItem value="home">Hogar</SelectItem>
              <SelectItem value="social">Social</SelectItem>
              <SelectItem value="charity">Caridad</SelectItem>
              <SelectItem value="other">Otro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="grid gap-2">
          <Label htmlFor="description">Descripción</Label>
          <Textarea 
            id="description" 
            placeholder="Ingresa detalles del evento..." 
            value={eventData.description}
            onChange={(e) => handleChange('description', e.target.value)}
          />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label>Fecha y hora de inicio</Label>
            <div className="flex gap-2">
              <Input 
                type="date" 
                className="flex-1" 
                value={eventData.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
              />
              <Input 
                type="time" 
                className="flex-1" 
                value={eventData.startTime}
                onChange={(e) => handleChange('startTime', e.target.value)}
              />
            </div>
          </div>
          
          <div className="grid gap-2">
            <Label>Fecha y hora de fin</Label>
            <div className="flex gap-2">
              <Input 
                type="date" 
                className="flex-1" 
                value={eventData.endDate}
                onChange={(e) => handleChange('endDate', e.target.value)}
              />
              <Input 
                type="time" 
                className="flex-1" 
                value={eventData.endTime}
                onChange={(e) => handleChange('endTime', e.target.value)}
              />
            </div>
          </div>
        </div>
        
        <div className="grid gap-2">
          <Label htmlFor="location">Ubicación</Label>
          <Input 
            id="location" 
            placeholder="Ingresa la ubicación (opcional)" 
            value={eventData.location}
            onChange={(e) => handleChange('location', e.target.value)}
          />
        </div>
        
        <div className="grid gap-2">
          <Label htmlFor="clientId">Cliente relacionado (opcional)</Label>
          <Select 
            value={eventData.clientId}
            onValueChange={(value) => handleChange('clientId', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Ninguno</SelectItem>
              {clients.map(client => (
                <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2 space-y-0 pt-2">
          <Switch 
            id="reminder" 
            checked={eventData.isReminder}
            onCheckedChange={(checked) => handleChange('isReminder', checked)}
          />
          <Label htmlFor="reminder">Configurar como recordatorio</Label>
        </div>
        
        {eventData.isReminder && (
          <div className="grid gap-2">
            <Label htmlFor="reminderDays">Días de anticipación</Label>
            <Select 
              value={eventData.reminderDays}
              onValueChange={(value) => handleChange('reminderDays', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar días" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Mismo día</SelectItem>
                <SelectItem value="1">1 día antes</SelectItem>
                <SelectItem value="3">3 días antes</SelectItem>
                <SelectItem value="7">1 semana antes</SelectItem>
                <SelectItem value="14">2 semanas antes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={handleSave}>Crear Evento</Button>
      </DialogFooter>
    </>
  );
};
