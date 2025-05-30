import { useState, useEffect } from "react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format, isToday, parseISO, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, ChevronLeft, ChevronRight, Search, Filter, X } from "lucide-react";
import { cn, formatDateEs } from "@/lib/utils";
import { EventCard } from "@/components/calendar/EventCard";
import { getCalendarEvents, CalendarEvent as SupabaseCalendarEvent, deleteCalendarEvent } from "@/integrations/supabase/calendarEventService";
import { getClients, Client } from "@/integrations/supabase/clientService";
import { getDebts } from "@/integrations/supabase/debtService";
import { getReceivables } from "@/integrations/supabase/receivableService";
import { getTransactions } from "@/integrations/supabase/transactionService";

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  category: 'payment' | 'invoice' | 'meeting' | 'task';
  completed: boolean;
  amount: number;
  currency: 'VES' | 'USD';
}

const Calendar = () => {
  const [date, setDate] = useState<Date>(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    payment: true,
    invoice: true,
    meeting: true,
    task: true
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isEventDetailOpen, setIsEventDetailOpen] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Función para generar eventos automáticos desde datos financieros
  const generateFinancialEvents = async () => {
    try {
      const [debts, receivables, transactions, clients] = await Promise.all([
        getDebts(),
        getReceivables(),
        getTransactions(),
        getClients()
      ]);

      const financialEvents: CalendarEvent[] = [];

      // Generar eventos para vencimientos de deudas
      debts.forEach(debt => {
        if (debt.status === 'pending' && debt.due_date) {
          const client = clients.find(c => c.id === debt.client_id);
          financialEvents.push({
            id: `debt-${debt.id}`,
            title: `Vencimiento: ${client?.name || 'Deuda'}`,
            description: `Deuda por ${debt.amount} - ${debt.creditor || 'Sin acreedor'}`,
            startDate: new Date(debt.due_date),
            endDate: new Date(debt.due_date),
            category: 'payment',
            completed: false,
            amount: debt.amount,
            currency: 'USD' as const
          });
        }
      });

      // Generar eventos para vencimientos de cuentas por cobrar
      receivables.forEach(receivable => {
        if (receivable.status === 'pending' && receivable.due_date) {
          const client = clients.find(c => c.id === receivable.client_id);
          financialEvents.push({
            id: `receivable-${receivable.id}`,
            title: `Cobrar: ${client?.name || 'Cliente'}`,
            description: `Cuenta por cobrar: ${receivable.description || 'Sin descripción'}`,
            startDate: new Date(receivable.due_date),
            endDate: new Date(receivable.due_date),
            category: 'invoice',
            completed: false,
            amount: receivable.amount,
            currency: 'USD' as const
          });
        }
      });

      // Generar eventos para pagos realizados
      transactions.forEach(transaction => {
        if (transaction.type === 'payment' && transaction.status === 'completed') {
          const client = clients.find(c => c.id === transaction.client_id);
          const isDebtPayment = transaction.debt_id;
          const isReceivablePayment = transaction.receivable_id;
          
          let title = 'Pago Realizado';
          let description = `Pago de ${transaction.amount}`;
          
          if (isDebtPayment) {
            title = `Pago de Deuda - ${client?.name || 'Cliente'}`;
            description = `Pago realizado por ${transaction.amount} para deuda`;
          } else if (isReceivablePayment) {
            title = `Pago Recibido - ${client?.name || 'Cliente'}`;
            description = `Pago recibido de ${transaction.amount}`;
          }

          financialEvents.push({
            id: `payment-${transaction.id}`,
            title,
            description: `${description} - ${transaction.payment_method || 'Método no especificado'}`,
            startDate: new Date(transaction.date),
            endDate: new Date(transaction.date),
            category: 'payment',
            completed: true,
            amount: transaction.amount,
            currency: 'USD' as const
          });
        }
      });

      return financialEvents;
    } catch (e) {
      console.error('Error generando eventos financieros:', e);
      return [];
    }
  };

  // Definir fetchEvents fuera del useEffect para poder reutilizarla
  const fetchEvents = async () => {
    setLoading(true);
    try {
      const [manualEvents, financialEvents] = await Promise.all([
        getCalendarEvents(),
        generateFinancialEvents()
      ]);

      const manualCalendarEvents = manualEvents.map(ev => ({
        id: ev.id,
        title: ev.title,
        description: ev.description || '',
        startDate: new Date(ev.start_date),
        endDate: new Date(ev.end_date),
        category: ev.category as CalendarEvent["category"],
        completed: ev.completed,
        amount: 0, // Si tienes un campo amount en la tabla, usa ev.amount
        currency: 'USD' as const, // Si tienes un campo currency en la tabla, usa ev.currency
      }));

      // Combinar eventos manuales con eventos financieros automáticos
      setCalendarEvents([...manualCalendarEvents, ...financialEvents]);
    } catch (e) {
      toast.error("Error al cargar eventos del calendario");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, []);
  
  const getEventsForDate = (date: Date) => {
    return calendarEvents.filter(event => {
      const eventDate = new Date(event.startDate);
      return isSameDay(eventDate, date);
    });
  };
  
  const filteredEvents = calendarEvents.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          event.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filters[event.category as keyof typeof filters];
    return matchesSearch && matchesFilter;
  });
  
  const eventsForSelectedDate = date ? getEventsForDate(date) : [];
  


  const changeMonth = (direction: 'previous' | 'next') => {
    const newDate = new Date(date);
    if (direction === 'previous') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setDate(newDate);
  };

  const handleEventClick = (event: CalendarEvent) => {
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



  const handleDeleteEvent = async (id: string) => {
    try {
      await deleteCalendarEvent(id);
      toast.success("Evento eliminado");
      setIsEventDetailOpen(false);
      await fetchEvents();
    } catch (e) {
      toast.error("Error al eliminar el evento");
    }
  };

  if (loading) return <div className="p-8 text-center">Cargando eventos...</div>;

  return (
    <div className="space-y-4 animate-fade-in p-4 sm:p-6">
      <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:justify-between sm:items-center pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="sm" onClick={() => setDate(new Date())} className="w-fit">
            Hoy
          </Button>
          <div className="flex items-center justify-center sm:justify-start">
            <Button variant="outline" size="icon" onClick={() => changeMonth('previous')}>
              <ChevronLeft size={16} />
            </Button>
            <h1 className="text-lg sm:text-2xl font-bold mx-2 sm:mx-4 min-w-0 text-center">{currentMonth}</h1>
            <Button variant="outline" size="icon" onClick={() => changeMonth('next')}>
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:max-w-[300px]">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar eventos..."
              className="pl-8 text-sm"
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
            className={cn(showFilters && "bg-accent", "shrink-0")}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={18} />
          </Button>
        </div>
      </div>
      
      {showFilters && (
        <Card className="mb-4">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="filter-payment" 
                  checked={filters.payment} 
                  onCheckedChange={() => toggleFilter('payment')} 
                />
                <Label htmlFor="filter-payment" className="flex items-center text-sm">
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
                <Label htmlFor="filter-invoice" className="flex items-center text-sm">
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
                <Label htmlFor="filter-meeting" className="flex items-center text-sm">
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
                <Label htmlFor="filter-task" className="flex items-center text-sm">
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
            <div className="w-full overflow-x-auto">
              <div className="min-w-[300px]">
                <div className="grid grid-cols-7 border-b">
                  {daysOfWeek.map((day, i) => (
                    <div key={i} className="p-2 sm:p-3 text-center font-medium text-xs sm:text-sm">
                      <span className="hidden sm:inline">{day}</span>
                      <span className="sm:hidden">{day.slice(0, 3)}</span>
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
                          "min-h-[80px] sm:min-h-[110px] p-1 border cursor-pointer hover:bg-gray-50 relative",
                          isToday(currentDate) && "bg-blue-50",
                          isSelectedDay && "ring-2 ring-inset ring-primary",
                          !isCurrentMonth && "text-gray-400 bg-gray-50/50"
                        )}
                        onClick={() => setDate(currentDate)}
                      >
                        <div className={cn(
                          "h-6 w-6 sm:h-7 sm:w-7 rounded-full flex items-center justify-center mb-1 text-xs sm:text-sm",
                          isToday(currentDate) && "bg-primary text-white font-medium",
                          !isToday(currentDate) && isSelectedDay && "font-medium"
                        )}>
                          {formattedDate}
                        </div>
                        
                        <div className="space-y-0.5 sm:space-y-1">
                          {dayEvents.slice(0, 3).map((event, idx) => (
                            <div
                              key={idx}
                              className={cn(
                                "text-xs rounded px-1 sm:px-1.5 py-0.5 sm:py-1 truncate cursor-pointer hover:opacity-80",
                                getCategoryColor(event.category),
                                idx >= 2 && "hidden sm:block"
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEventClick(event);
                              }}
                            >
                              <span className="mr-1 hidden sm:inline">{getCategoryIcon(event.category)}</span>
                              <span className="text-[10px] sm:text-xs">{event.title}</span>
                            </div>
                          ))}
                          
                          {dayEvents.length > 3 && (
                            <div 
                              className="text-[10px] sm:text-xs text-primary font-medium pl-1 hover:underline cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDate(currentDate);
                                setView('day');
                              }}
                            >
                              <span className="hidden sm:inline">+ {dayEvents.length - 3} más</span>
                              <span className="sm:hidden">+ {dayEvents.length - 2} más</span>
                            </div>
                          )}
                          
                          {dayEvents.length > 2 && dayEvents.length <= 3 && (
                            <div 
                              className="text-[10px] text-primary font-medium pl-1 hover:underline cursor-pointer sm:hidden"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDate(currentDate);
                                setView('day');
                              }}
                            >
                              + {dayEvents.length - 2} más
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          
          {view === 'day' && (
            <div className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 gap-2">
                <h3 className="text-lg sm:text-xl font-semibold">
                  {formatDateEs(date, 'EEEE, d MMMM yyyy')}
                </h3>
                <Button 
                  variant="outline" 
                  onClick={() => setView('month')}
                  className="w-fit"
                >
                  Volver al mes
                </Button>
              </div>
              
              {eventsForSelectedDate.length > 0 ? (
                <div className="space-y-3 sm:space-y-4">
                  {eventsForSelectedDate.map((event) => (
                    <div 
                      key={event.id} 
                      className={cn(
                        "px-3 sm:px-4 py-3 rounded-lg border cursor-pointer hover:shadow-md transition-shadow",
                        getCategoryColor(event.category)
                      )}
                      onClick={() => handleEventClick(event)}
                    >
                      <div className="flex items-start sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-lg sm:text-xl">{getCategoryIcon(event.category)}</span>
                          <h4 className="font-medium text-sm sm:text-base truncate">{event.title}</h4>
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {format(new Date(event.startDate), 'HH:mm')}
                        </Badge>
                      </div>
                      <p className="text-xs sm:text-sm mt-2 pl-6 sm:pl-8">{event.description}</p>
                      {event.amount > 0 && (
                        <p className="text-xs sm:text-sm font-medium mt-2 pl-6 sm:pl-8">
                          Monto: {event.currency} {event.amount.toFixed(2)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 sm:py-12">
                  <p className="text-muted-foreground text-sm sm:text-base">No hay eventos para este día.</p>
                </div>
              )}
            </div>
          )}
          
          {view === 'week' && (
            <div className="p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6">Vista semanal (en desarrollo)</h3>
              <div className="text-center py-8 sm:py-12">
                <p className="text-muted-foreground text-sm sm:text-base">Vista semanal próximamente</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={isEventDetailOpen} onOpenChange={setIsEventDetailOpen}>
        {selectedEvent && (
          <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto mx-2 sm:mx-4">
            <DialogHeader className="pb-2 sm:pb-4">
              <DialogTitle className="flex items-start sm:items-center gap-2 text-base sm:text-lg lg:text-xl pr-6">
                <span className="text-lg sm:text-xl flex-shrink-0">{getCategoryIcon(selectedEvent.category)}</span>
                <span className="truncate leading-tight">{selectedEvent.title}</span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 sm:space-y-4 pt-1 sm:pt-2">
              <div className="space-y-3">
                <Badge className={cn(getCategoryColor(selectedEvent.category), "text-xs sm:text-sm")}>
                  {getCategoryLabel(selectedEvent.category)}
                </Badge>
                {selectedEvent.description && (
                  <p className="text-sm sm:text-base leading-relaxed text-muted-foreground">
                    {selectedEvent.description}
                  </p>
                )}
              </div>
              
              <div className="bg-muted/50 p-3 sm:p-4 rounded-lg space-y-2 sm:space-y-3">
                <div className="flex items-start sm:items-center gap-2 sm:gap-3">
                  <CalendarIcon size={16} className="text-muted-foreground shrink-0 mt-0.5 sm:mt-0" />
                  <div className="min-w-0 flex-1">
                    <span className="text-xs sm:text-sm font-medium block">
                      {formatDateEs(selectedEvent.startDate, 'EEEE, d MMMM yyyy')}
                    </span>
                  </div>
                </div>
                <div className="flex items-start sm:items-center gap-2 sm:gap-3">
                  <div className="w-4 h-4 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-current"></div>
                  </div>
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    {format(new Date(selectedEvent.startDate), 'HH:mm')} - {format(new Date(selectedEvent.endDate), 'HH:mm')}
                  </span>
                </div>
                {selectedEvent.completed && (
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-4 h-4 flex items-center justify-center shrink-0">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    </div>
                    <span className="text-xs sm:text-sm text-green-600 font-medium">Completado</span>
                  </div>
                )}
              </div>
              
              {selectedEvent.amount > 0 && (
                <div className="border-t pt-3 sm:pt-4 space-y-2">
                  <h4 className="font-medium text-sm sm:text-base">Detalles financieros</h4>
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm sm:text-base text-muted-foreground">Monto:</span>
                      <span className="font-semibold text-sm sm:text-base">
                        {selectedEvent.currency} {selectedEvent.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4 sm:pt-6 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => setIsEventDetailOpen(false)} 
                  className="w-full sm:w-auto order-2 sm:order-1"
                  size="sm"
                >
                  Cerrar
                </Button>
                {/* Solo permitir borrar eventos manuales (no los automáticos financieros) */}
                {!selectedEvent.id.startsWith('debt-') && 
                 !selectedEvent.id.startsWith('receivable-') && 
                 !selectedEvent.id.startsWith('payment-') && (
                  <Button 
                    variant="destructive" 
                    onClick={() => handleDeleteEvent(selectedEvent.id)} 
                    className="w-full sm:w-auto order-1 sm:order-2"
                    size="sm"
                  >
                    Eliminar evento
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default Calendar;
