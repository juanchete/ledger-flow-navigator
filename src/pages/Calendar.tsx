
import { useState } from "react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { mockCalendarEvents, mockClients } from "@/data/mockData";
import { format, isToday, addDays, parseISO, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { CalendarIcon, ChevronLeft, ChevronRight, PlusCircle, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { EventCard } from "@/components/calendar/EventCard";
import { EventForm } from "@/components/calendar/EventForm";

const Calendar = () => {
  const [date, setDate] = useState<Date>(new Date());
  const [view, setView] = useState<'day' | 'week' | 'month' | 'year'>('month');
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

  const changeMonth = (direction: 'previous' | 'next') => {
    const newDate = new Date(date);
    if (direction === 'previous') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setDate(newDate);
  };

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentMonth = format(date, 'MMMM, yyyy');
  
  const getDayEvents = (day: Date) => {
    return mockCalendarEvents.filter(event => isSameDay(new Date(event.startDate), day));
  };
  
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  return (
    <div className="space-y-4 animate-fade-in max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 border-b">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setDate(new Date())}>
            Hoy
          </Button>
          <h1 className="text-2xl font-bold">Calendario</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Dialog open={isCreateEventOpen} onOpenChange={setIsCreateEventOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle size={18} className="mr-1" />
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
          
          <Button variant="outline">
            <CalendarIcon size={18} className="mr-1" />
            Seleccionar fechas
          </Button>
          
          <Button variant="outline">
            <Star size={18} className="mr-1" />
            Favoritos
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-[3fr,1fr] gap-6">
        <div className="space-y-6">
          <Card className="border rounded-lg shadow-sm">
            <CardHeader className="pb-0 pt-4 px-4">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => changeMonth('previous')}>
                    <ChevronLeft size={16} />
                  </Button>
                  <h2 className="text-xl font-bold">{currentMonth}</h2>
                  <Button variant="outline" size="icon" onClick={() => changeMonth('next')}>
                    <ChevronRight size={16} />
                  </Button>
                </div>
                <div className="bg-white border rounded-lg flex overflow-hidden">
                  <Button 
                    variant={view === 'day' ? "default" : "ghost"} 
                    size="sm" 
                    className="rounded-none"
                    onClick={() => setView('day')}
                  >
                    Día
                  </Button>
                  <Button 
                    variant={view === 'week' ? "default" : "ghost"} 
                    size="sm" 
                    className="rounded-none"
                    onClick={() => setView('week')}
                  >
                    Semana
                  </Button>
                  <Button 
                    variant={view === 'month' ? "default" : "ghost"} 
                    size="sm" 
                    className="rounded-none"
                    onClick={() => setView('month')}
                  >
                    Mes
                  </Button>
                  <Button 
                    variant={view === 'year' ? "default" : "ghost"} 
                    size="sm" 
                    className="rounded-none"
                    onClick={() => setView('year')}
                  >
                    Año
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-0 pb-4">
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
                      const isCurrentMonth = currentDate.getMonth() === date.getMonth();
                      const isSelectedDay = isSameDay(currentDate, date);
                      const formattedDate = format(currentDate, 'd');
                      
                      return (
                        <div 
                          key={i}
                          className={cn(
                            "min-h-[100px] p-1 border cursor-pointer hover:bg-gray-50 relative",
                            isToday(currentDate) && "bg-blue-50",
                            isSelectedDay && "ring-2 ring-inset ring-primary",
                            !isCurrentMonth && "text-gray-400 bg-gray-50/50"
                          )}
                          onClick={() => setDate(currentDate)}
                        >
                          <div className={cn(
                            "h-6 w-6 rounded-full flex items-center justify-center mb-1 text-sm",
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
                                  "text-xs rounded px-1 py-0.5 truncate",
                                  event.category === 'banking' && "bg-blue-100 text-blue-800",
                                  event.category === 'legal' && "bg-purple-100 text-purple-800",
                                  event.category === 'home' && "bg-green-100 text-green-800",
                                  event.category === 'social' && "bg-yellow-100 text-yellow-800",
                                  event.category === 'charity' && "bg-pink-100 text-pink-800",
                                  event.category === 'other' && "bg-gray-100 text-gray-800",
                                )}
                              >
                                {event.title}
                              </div>
                            ))}
                            
                            {dayEvents.length > 3 && (
                              <div className="text-xs text-gray-500 pl-1">
                                +{dayEvents.length - 3} más
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
                <div className="p-4">
                  <h3 className="text-lg font-medium mb-4">
                    {format(date, 'EEEE, d MMMM yyyy')}
                  </h3>
                  
                  {eventsForSelectedDate.length > 0 ? (
                    <div className="space-y-3">
                      {eventsForSelectedDate.map((event) => (
                        <EventCard 
                          key={event.id} 
                          event={event}
                          getCategoryColor={(category) => {
                            switch(category) {
                              case 'legal': return 'bg-purple-600 text-white';
                              case 'banking': return 'bg-blue-600 text-white';
                              case 'home': return 'bg-green-600 text-white';
                              case 'social': return 'bg-yellow-600 text-black';
                              case 'charity': return 'bg-pink-600 text-white';
                              default: return 'bg-gray-600 text-white';
                            }
                          }}
                          getCategoryIcon={(category) => {
                            switch(category) {
                              case 'legal': return '⚖️';
                              case 'banking': return '🏦';
                              case 'home': return '🏠';
                              case 'social': return '👥';
                              case 'charity': return '❤️';
                              default: return '📅';
                            }
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No hay eventos para este día.</p>
                      <Button 
                        variant="outline" 
                        className="mt-2"
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
                <div className="p-4">
                  <h3 className="text-lg font-medium mb-4">Vista semanal (en desarrollo)</h3>
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Vista semanal próximamente</p>
                  </div>
                </div>
              )}
              
              {view === 'year' && (
                <div className="p-4">
                  <h3 className="text-lg font-medium mb-4">Vista anual (en desarrollo)</h3>
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Vista anual próximamente</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center justify-between">
                <div>
                  {format(date, 'MMMM, yyyy')}
                </div>
                <div className="flex gap-1">
                  <Button variant="outline" size="icon" className="h-6 w-6">
                    <ChevronLeft size={14} />
                  </Button>
                  <Button variant="outline" size="icon" className="h-6 w-6">
                    <ChevronRight size={14} />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-2">
                <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-1">
                  {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map((day, i) => (
                    <div key={i}>{day}</div>
                  ))}
                </div>
                
                <div className="grid grid-cols-7 gap-1 text-center text-sm">
                  {Array(42).fill(null).map((_, i) => {
                    const miniDate = new Date(monthStart);
                    miniDate.setDate(miniDate.getDate() - monthStart.getDay() + i);
                    
                    const isCurrentMonth = miniDate.getMonth() === date.getMonth();
                    const isMiniToday = isToday(miniDate);
                    const isSelectedDay = isSameDay(miniDate, date);
                    
                    return (
                      <div
                        key={i}
                        className={cn(
                          "h-8 w-8 flex items-center justify-center rounded-full mx-auto",
                          isMiniToday && "bg-accent text-accent-foreground",
                          isSelectedDay && "bg-primary text-primary-foreground",
                          !isCurrentMonth && "text-gray-300",
                          isCurrentMonth && !isMiniToday && !isSelectedDay && "hover:bg-gray-100 cursor-pointer"
                        )}
                        onClick={() => isCurrentMonth && setDate(miniDate)}
                      >
                        {format(miniDate, 'd')}
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Actividad</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingEvents.slice(0, 2).map((event, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                      {idx === 0 ? "JW" : "EH"}
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <p className="font-medium">
                          {idx === 0 ? "Jenny Wilson" : "Esther Howard"}
                        </p>
                        <span className="text-xs text-gray-500">• 12:23 PM</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {idx === 0 
                          ? "Shared file to Distributor Contract" 
                          : "Commented on Distributor Contract"
                        }
                      </p>
                      {idx === 1 && (
                        <p className="text-sm text-gray-500 mt-1">
                          Amet minim mollit non deserunt ullamco est sit aliqua dolor do amet.
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                
                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-medium">Total</h4>
                    <span className="font-bold text-lg">69%</span>
                  </div>
                  
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: "69%" }}></div>
                  </div>
                  
                  <div className="flex flex-wrap gap-4 mt-3">
                    <div className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                      <span className="text-xs">Stretching</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full bg-pink-400"></span>
                      <span className="text-xs">Crossfit</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full bg-blue-400"></span>
                      <span className="text-xs">Yoga</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Calendar;
