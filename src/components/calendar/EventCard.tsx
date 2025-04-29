
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarEvent } from "@/types";
import { format } from "date-fns";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface EventCardProps {
  event: CalendarEvent;
  getCategoryColor: (category: string) => string;
  getCategoryIcon: (category: string) => string;
}

export const EventCard = ({ event, getCategoryColor, getCategoryIcon }: EventCardProps) => {
  const [showDetails, setShowDetails] = useState(false);
  
  return (
    <>
      <div 
        className="flex items-start space-x-4 p-4 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
        onClick={() => setShowDetails(true)}
      >
        <div className="text-2xl">{getCategoryIcon(event.category)}</div>
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-medium">{event.title}</h4>
              <p className="text-sm text-muted-foreground">
                {format(new Date(event.startDate), 'h:mm a')} - {format(new Date(event.endDate), 'h:mm a')}
              </p>
              {event.description && (
                <p className="text-sm mt-2 line-clamp-2">{event.description}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge className={getCategoryColor(event.category)}>
                {event.category}
              </Badge>
              {event.isReminder && (
                <Badge variant="outline" className="border-red-500 text-red-500 flex items-center gap-1">
                  <AlertTriangle size={12} />
                  Recordatorio
                </Badge>
              )}
            </div>
          </div>
          {event.location && (
            <p className="text-sm mt-2 text-muted-foreground">Ubicación: {event.location}</p>
          )}
        </div>
      </div>
      
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-xl">{getCategoryIcon(event.category)}</span>
              {event.title}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Fecha y hora</h4>
                <p>{format(new Date(event.startDate), 'EEEE, d MMMM yyyy')}</p>
                <p>{format(new Date(event.startDate), 'h:mm a')} - {format(new Date(event.endDate), 'h:mm a')}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Categoría</h4>
                <Badge className={`${getCategoryColor(event.category)} mt-1`}>
                  {event.category}
                </Badge>
              </div>
            </div>
            
            {event.description && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Descripción</h4>
                <p className="mt-1">{event.description}</p>
              </div>
            )}
            
            {event.location && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Ubicación</h4>
                <p className="mt-1 flex items-center gap-1">
                  {event.location}
                  {event.locationUrl && (
                    <a 
                      href={event.locationUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-500 inline-flex items-center"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                </p>
              </div>
            )}
            
            {event.clientId && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Cliente asociado</h4>
                <p className="mt-1">{event.clientName || "Cliente"}</p>
              </div>
            )}
            
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowDetails(false)}>
                Cerrar
              </Button>
              <Button>
                Editar evento
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
