
import { useState, useEffect } from "react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format, isToday, parseISO, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, ChevronLeft, ChevronRight, PlusCircle, Search, Filter, X } from "lucide-react";
import { cn, formatDateEs } from "@/lib/utils";
import { EventCard } from "@/components/calendar/EventCard";
import { EventForm } from "@/components/calendar/EventForm";

// Mock data for calendar events
const mockCalendarEvents = [
  {
    id: "1",
    title: "Pago a Pepe",
    description: "Pago mensual por servicios de consultoría",
    startDate: new Date(2025, 3, 30, 10, 0),
    endDate: new Date(2025, 3, 30, 11, 0),
    category: "payment",
    completed: false,
    amount: 500,
  },
  {
    id: "2",
    title: "Recibo de pago de María",
    description: "Factura #123 por diseño gráfico",
    startDate: new Date(2025, 3, 28, 14, 0),
    endDate: new Date(2025, 3, 28, 15, 0),
    category: "invoice",
    completed: false,
    amount: 350,
  },
  {
    id: "3",
    title: "Pago a Juan",
    description: "Servicios de desarrollo web",
    startDate: new Date(2025, 3, 29, 9, 0),
    endDate: new Date(2025, 3, 29, 10, 30),
    category: "payment",
    completed: true,
    amount: 750,
  },
  {
    id: "4",
    title: "Recibo de pago de Carlos",
    description: "Proyecto de consultoría financiera",
    startDate: new Date(2025, 3, 29, 13, 0),
    endDate: new Date(2025, 3, 29, 14, 0),
    category: "invoice",
    completed: false,
    amount: 1200,
  },
  {
    id: "5",
    title: "Reunión con proveedor",
    description: "Discutir nuevos términos de contrato",
    startDate: new Date(2025, 4, 2, 11, 0),
    endDate: new Date(2025, 4, 2, 12, 0),
    category: "meeting",
    completed: false,
    amount: 0,
  },
  {
    id: "6",
    title: "Pago a Ana",
    description: "Servicios de traducción",
    startDate: new Date(2025, 4, 3, 15, 30),
    endDate: new Date(2025, 4, 3, 16, 0),
    category: "payment",
    completed: false,
    amount: 250,
  },
  {
    id: "7",
    title: "Recibo de pago de Laura",
    description: "Proyecto de marketing digital",
    startDate: new Date(2025, 4, 4, 10, 0),
    endDate: new Date(2025, 4, 4, 11, 0),
    category: "invoice",
    completed: false,
    amount: 850,
  },
  {
    id: "8",
    title: "Entrega de informe",
    description: "Informe mensual de finanzas",
    startDate: new Date(2025, 4, 5, 9, 0),
    endDate: new Date(2025, 4, 5, 10, 0),
    category: "task",
    completed: false,
    amount: 0,
  }
];

const Calendar = () => {
  const [date, setDate] = useState<Date>(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    payment: true,
    invoice: true,
    meeting: true,
    task: true
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isEventDetailOpen, setIsEventDetailOpen] = useState(false);
  
  const getEventsForDate = (date: Date) => {
    return filteredEvents.filter(event => {
      const eventDate = new Date(event.startDate);
      return isSameDay(eventDate, date);
    });
  };
  
  const filteredEvents = mockCalendarEvents.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          event.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filters[event.category as keyof typeof filters];
    return matchesSearch && matchesFilter;
  });
  
  const eventsForSelectedDate = date ? getEventsForDate(date) : [];
  
  const handleAddEvent = () => {
    toast.success("Evento creado exitosamente!");
    setIsCreateEventOpen(false);
  };

  const changeMonth = (direction: 'previous' | 'next') => {
    const newDate = new Date(date);
    if (direction === 'previous') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setDate(newDate);
  };

  const handleEventClick = (event: any) => {
    setSelectedEvent(event);
    setIsEventDetailOpen(true);
  };

  const toggleFilter = (filter: keyof typeof filters) => {
    setFilters(prev => ({
      ...prev,
      [filter]: !prev[filter]
    }));
  };

  const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const currentMonth = formatDateEs(date, 'MMMM yyyy');
  
  const getDayEvents = (day: Date) => {
    return filteredEvents.filter(event => isSameDay(new Date(event.startDate), day));
  };
  
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  const getCategoryColor = (category: string) => {
    switch(category) {
      case 'payment': return 'bg-red-100 text-red-800';
      case 'invoice': return 'bg-green-100 text-green-800';
      case 'meeting': return 'bg-blue-100 text-blue-800';
      case 'task': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getCategoryIcon = (category: string) => {
    switch(category) {
      case 'payment': return '💸';
      case 'invoice': return '📄';
      case 'meeting': return '👥';
      case 'task': return '✓';
      default: return '📅';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch(category) {
      case 'payment': return 'Pago';
      case 'invoice': return 'Factura';
      case 'meeting': return 'Reunión';
      case 'task': return 'Tarea';
      default: return 'Evento';
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setDate(new Date())}>
            Hoy
          </Button>
          <div className="flex items-center">
            <Button variant="outline" size="icon" onClick={() => changeMonth('previous')}>
              <ChevronLeft size={16} />
            </Button>
            <h1 className="text-2xl font-bold mx-4">{currentMonth}</h1>
            <Button variant="outline" size="icon" onClick={() => changeMonth('next')}>
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:max-w-[300px]">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar eventos..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute right-1 top-1.5 h-7 w-7"
                onClick={() => setSearchQuery("")}
              >
                <X size={14} />
              </Button>
            )}
          </div>
          
          <Button 
            variant="outline" 
            size="icon" 
            className={cn(showFilters && "bg-accent")}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={18} />
          </Button>
          
          <Dialog open={isCreateEventOpen} onOpenChange={setIsCreateEventOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle size={18} className="mr-2" />
                Evento
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
      </div>
      
      {showFilters && (
        <Card className="mb-4">
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="filter-payment" 
                  checked={filters.payment} 
                  onCheckedChange={() => toggleFilter('payment')} 
                />
                <Label htmlFor="filter-payment" className="flex items-center">
                  <span className="w-3 h-3 rounded-full bg-red-500 mr-2"></span>
                  Pagos
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="filter-invoice" 
                  checked={filters.invoice} 
                  onCheckedChange={() => toggleFilter('invoice')} 
                />
                <Label htmlFor="filter-invoice" className="flex items-center">
                  <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                  Recibos
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="filter-meeting" 
                  checked={filters.meeting} 
                  onCheckedChange={() => toggleFilter('meeting')} 
                />
                <Label htmlFor="filter-meeting" className="flex items-center">
                  <span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
                  Reuniones
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="filter-task" 
                  checked={filters.task} 
                  onCheckedChange={() => toggleFilter('task')} 
                />
                <Label htmlFor="filter-task" className="flex items-center">
                  <span className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></span>
                  Tareas
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      <Card className="border shadow-sm">
        <CardContent className="p-0">
          {view === 'month' && (
            <div className="w-full">
              <div className="grid grid-cols-7 border-b">
                {daysOfWeek.map((day, i) => (
                  <div key={i} className="p-3 text-center font-medium text-sm">
                    {day}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7">
                {Array(42).fill(null).map((_, i) => {
                  const currentDate = new Date(monthStart);
                  currentDate.setDate(currentDate.getDate() - monthStart.getDay() + i);
                  
                  const dayEvents = getDayEvents(currentDate);
                  const isCurrentMonth = isSameMonth(currentDate, date);
                  const isSelectedDay = isSameDay(currentDate, date);
                  const formattedDate = format(currentDate, 'd');
                  
                  return (
                    <div 
                      key={i}
                      className={cn(
                        "min-h-[110px] p-1 border cursor-pointer hover:bg-gray-50 relative",
                        isToday(currentDate) && "bg-blue-50",
                        isSelectedDay && "ring-2 ring-inset ring-primary",
                        !isCurrentMonth && "text-gray-400 bg-gray-50/50"
                      )}
                      onClick={() => setDate(currentDate)}
                    >
                      <div className={cn(
                        "h-7 w-7 rounded-full flex items-center justify-center mb-1 text-sm",
                        isToday(currentDate) && "bg-primary text-white font-medium",
                        !isToday(currentDate) && isSelectedDay && "font-medium"
                      )}>
                        {formattedDate}
                      </div>
                      
                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map((event, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              "text-xs rounded px-1.5 py-1 truncate cursor-pointer hover:opacity-80",
                              getCategoryColor(event.category)
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEventClick(event);
                            }}
                          >
                            <span className="mr-1">{getCategoryIcon(event.category)}</span>
                            {event.title}
                          </div>
                        ))}
                        
                        {dayEvents.length > 3 && (
                          <div 
                            className="text-xs text-primary font-medium pl-1 hover:underline cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDate(currentDate);
                              setView('day');
                            }}
                          >
                            + {dayEvents.length - 3} más
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {view === 'day' && (
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-6">
                {formatDateEs(date, 'EEEE, d MMMM yyyy')}
              </h3>
              
              {eventsForSelectedDate.length > 0 ? (
                <div className="space-y-4">
                  {eventsForSelectedDate.map((event) => (
                    <div 
                      key={event.id} 
                      className={cn(
                        "px-4 py-3 rounded-lg border cursor-pointer hover:shadow-md transition-shadow",
                        getCategoryColor(event.category)
                      )}
                      onClick={() => handleEventClick(event)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{getCategoryIcon(event.category)}</span>
                          <h4 className="font-medium">{event.title}</h4>
                        </div>
                        <Badge variant="outline">
                          {format(new Date(event.startDate), 'HH:mm')}
                        </Badge>
                      </div>
                      <p className="text-sm mt-1">{event.description}</p>
                      {event.amount > 0 && (
                        <p className="text-sm font-medium mt-2">
                          Monto: €{event.amount.toFixed(2)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No hay eventos para este día.</p>
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
            </div>
          )}
          
          {view === 'week' && (
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-6">Vista semanal (en desarrollo)</h3>
              <div className="text-center py-12">
                <p className="text-muted-foreground">Vista semanal próximamente</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={isEventDetailOpen} onOpenChange={setIsEventDetailOpen}>
        {selectedEvent && (
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <span>{getCategoryIcon(selectedEvent.category)}</span>
                {selectedEvent.title}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Badge className={getCategoryColor(selectedEvent.category)}>
                  {getCategoryLabel(selectedEvent.category)}
                </Badge>
                <p className="mt-4">{selectedEvent.description}</p>
              </div>
              
              <div className="bg-muted/50 p-3 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CalendarIcon size={16} className="text-muted-foreground" />
                  <span>
                    {formatDateEs(selectedEvent.startDate, 'EEEE, d MMMM yyyy')}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-4 h-4 flex items-center justify-center">
                    <div className="w-1 h-1 rounded-full bg-current"></div>
                  </div>
                  <span>
                    {format(new Date(selectedEvent.startDate), 'HH:mm')} - {format(new Date(selectedEvent.endDate), 'HH:mm')}
                  </span>
                </div>
              </div>
              
              {selectedEvent.amount > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Detalles financieros</h4>
                  <div className="flex justify-between">
                    <span>Monto:</span>
                    <span className="font-medium">€{selectedEvent.amount.toFixed(2)}</span>
                  </div>
                </div>
              )}
              
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsEventDetailOpen(false)}>Cerrar</Button>
                <Button>Editar</Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default Calendar;
