
import { useState } from "react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { mockCalendarEvents, mockClients } from "@/data/mockData";
import { format, isToday, addDays, parseISO, isSameDay } from "date-fns";
import { AlertTriangle, Calendar as CalendarIcon, CalendarCheck, CalendarDays, PlusCircle, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { EventCard } from "@/components/calendar/EventCard";
import { EventForm } from "@/components/calendar/EventForm";

const Calendar = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [view, setView] = useState<'day' | 'month'>('month');
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  
  const getEventsForDate = (date: Date) => {
    return mockCalendarEvents.filter(event => {
      const eventDate = new Date(event.startDate);
      return isSameDay(eventDate, date);
    });
  };
  
  const upcomingEvents = mockCalendarEvents
    .filter(event => new Date(event.startDate) >= new Date() && !event.completed)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  
  const eventsForSelectedDate = date ? getEventsForDate(date) : [];
  
  const handleAddEvent = () => {
    toast.success("Evento creado exitosamente!");
    setIsCreateEventOpen(false);
  };

  const handleCompleteReminder = (eventId: string) => {
    toast.success("Recordatorio marcado como completado");
  };

  const getCategoryColor = (category: string) => {
    switch(category) {
      case 'legal':
        return 'bg-purple-600 text-white';
      case 'banking':
        return 'bg-blue-600 text-white';
      case 'home':
        return 'bg-green-600 text-white';
      case 'social':
        return 'bg-yellow-600 text-black';
      case 'charity':
        return 'bg-pink-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch(category) {
      case 'legal':
        return '⚖️';
      case 'banking':
        return '🏦';
      case 'home':
        return '🏠';
      case 'social':
        return '👥';
      case 'charity':
        return '❤️';
      default:
        return '📅';
    }
  };
  
  const getDateClasses = (day: Date) => {
    const events = getEventsForDate(day);
    if (events.length === 0) return '';
    
    let classes = 'relative';
    const hasReminder = events.some(e => e.isReminder);
    const categoryColors = {
      legal: 'bg-purple-100',
      banking: 'bg-blue-100',
      home: 'bg-green-100',
      social: 'bg-yellow-100',
      charity: 'bg-pink-100'
    };
    
    const mainEvent = events[0];
    if (hasReminder) {
      classes += ' ring-2 ring-red-400';
    }
    
    classes += ` ${categoryColors[mainEvent.category as keyof typeof categoryColors] || 'bg-gray-100'}`;
    
    return classes;
  };
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Calendario</h1>
        
        <Dialog open={isCreateEventOpen} onOpenChange={setIsCreateEventOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <PlusCircle size={18} />
              Añadir Evento
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px]">
            <EventForm 
              onSave={handleAddEvent}
              onCancel={() => setIsCreateEventOpen(false)}
              selectedDate={date}
            />
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-6">
        <div className="flex flex-col gap-6 w-full">
          <Card className="w-full">
            <CardHeader className="flex flex-row justify-between items-center pb-2 w-full">
              <CardTitle>{format(date || new Date(), 'MMMM yyyy')}</CardTitle>
              <Tabs defaultValue="month" className="w-auto">
                <TabsList>
                  <TabsTrigger value="month" onClick={() => setView('month')}>
                    <CalendarDays size={16} className="mr-2" />
                    Mes
                  </TabsTrigger>
                  <TabsTrigger value="day" onClick={() => setView('day')}>
                    <CalendarCheck size={16} className="mr-2" />
                    Día
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent className="p-0 w-full">
              <div className="w-full min-w-0">
                <CalendarComponent
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  className="rounded-md border-0 w-full min-w-0 pointer-events-auto"
                  components={{
                    DayContent: (props) => (
                      <div className={`relative w-full h-full flex items-center justify-center ${getDateClasses(props.date)}`}>
                        <span className={cn("w-10 h-10 flex items-center justify-center rounded-full", 
                          isToday(props.date) ? "bg-primary text-primary-foreground font-medium" : ""
                        )}>
                          {format(props.date, 'd')}
                        </span>
                        {getEventsForDate(props.date).length > 0 && (
                          <div className="absolute bottom-0 left-0 w-full flex justify-center gap-0.5 pb-1">
                            {getEventsForDate(props.date).slice(0, 3).map((event, idx) => (
                              <span key={idx} className={`h-1.5 w-1.5 rounded-full ${getCategoryColor(event.category)}`} />
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  }}
                />
              </div>
            </CardContent>
          </Card>
          
          {date && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CalendarIcon size={18} />
                  Eventos para {format(date, 'EEEE, d MMMM yyyy')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {eventsForSelectedDate.length > 0 ? (
                  <div className="space-y-4">
                    {eventsForSelectedDate.map((event) => (
                      <EventCard 
                        key={event.id} 
                        event={event}
                        getCategoryColor={getCategoryColor}
                        getCategoryIcon={getCategoryIcon}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-slate-50 dark:bg-slate-900 rounded-xl">
                    <CalendarIcon className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground font-medium">No hay eventos programados para este día.</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => setIsCreateEventOpen(true)}
                    >
                      <PlusCircle size={16} className="mr-2" />
                      Añadir Evento
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarCheck size={18} />
                Próximos Eventos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingEvents.length > 0 ? (
                <div className="space-y-4">
                  {upcomingEvents.slice(0, 5).map((event) => {
                    const client = event.clientId ? mockClients.find(c => c.id === event.clientId) : null;
                    const isToday = new Date(event.startDate).toDateString() === new Date().toDateString();
                    
                    return (
                      <div key={event.id} className="border rounded-lg p-3 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{getCategoryIcon(event.category)}</span>
                              <h4 className="font-medium">{event.title}</h4>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {isToday ? 'Hoy' : format(new Date(event.startDate), 'EEE, d MMM')} • {format(new Date(event.startDate), 'h:mm a')}
                            </p>
                            {client && (
                              <Badge variant="outline" className="mt-1.5">
                                Cliente: {client.name}
                              </Badge>
                            )}
                          </div>
                          <Badge className={getCategoryColor(event.category)}>
                            {event.category}
                          </Badge>
                        </div>
                        {event.description && (
                          <p className="text-sm mt-2 text-muted-foreground">{event.description}</p>
                        )}
                      </div>
                    );
                  })}
                  
                  {upcomingEvents.length > 5 && (
                    <p className="text-center text-sm text-muted-foreground py-2">
                      + {upcomingEvents.length - 5} más eventos
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 bg-slate-50 dark:bg-slate-900 rounded-xl">
                  <p className="text-muted-foreground">
                    No hay próximos eventos programados.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle size={18} />
                Recordatorios
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingEvents.filter(e => e.isReminder).length > 0 ? (
                <div className="space-y-4">
                  {upcomingEvents
                    .filter(e => e.isReminder)
                    .map((event) => (
                      <div key={event.id} className="flex items-start justify-between border rounded-lg p-3 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getCategoryIcon(event.category)}</span>
                            <h4 className="font-medium">{event.title}</h4>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(event.startDate), 'EEE, d MMM')}
                          </p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleCompleteReminder(event.id)}
                          className="gap-1.5"
                        >
                          <Check size={14} />
                          Completado
                        </Button>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-slate-50 dark:bg-slate-900 rounded-xl">
                  <p className="text-muted-foreground">
                    No hay recordatorios pendientes.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Calendar;
