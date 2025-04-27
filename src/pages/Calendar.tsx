
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
import { toast } from "sonner";
import { mockCalendarEvents, mockClients } from "@/data/mockData";
import { CalendarEvent } from "@/types";
import { format, isToday, isWithinInterval, addDays, parseISO } from "date-fns";
import { AlertTriangle, Calendar as CalendarIcon, CalendarCheck, CalendarDays, PlusCircle } from "lucide-react";

const Calendar = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [view, setView] = useState<'day' | 'month'>('month');
  
  const getEventsForDate = (date: Date) => {
    return mockCalendarEvents.filter(event => {
      const eventDate = new Date(event.startDate);
      return eventDate.getDate() === date.getDate() && 
             eventDate.getMonth() === date.getMonth() && 
             eventDate.getFullYear() === date.getFullYear();
    });
  };
  
  const upcomingEvents = mockCalendarEvents
    .filter(event => new Date(event.startDate) >= new Date() && !event.completed)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  
  const eventsForSelectedDate = date ? getEventsForDate(date) : [];
  
  const handleAddEvent = () => {
    toast.success("Event created successfully! This is a mock action in the MVP.");
  };

  const getCategoryColor = (category: string) => {
    switch(category) {
      case 'meeting':
        return 'bg-finance-blue text-white';
      case 'deadline':
        return 'bg-finance-red text-white';
      case 'reminder':
        return 'bg-finance-yellow text-finance-gray-dark';
      default:
        return 'bg-finance-gray text-white';
    }
  };
  
  const getDateClasses = (day: Date) => {
    const events = getEventsForDate(day);
    let classes = "";
    
    if (events.length > 0) {
      const hasHighPriorityEvent = events.some(e => e.category === 'deadline' || e.isReminder);
      if (hasHighPriorityEvent) {
        classes += "bg-finance-red-light/20";
      } else {
        classes += "bg-finance-blue-light/20";
      }
    }
    
    return classes;
  };
  
  const formatEventTime = (date: Date) => {
    return format(new Date(date), 'h:mm a');
  };
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <PlusCircle size={18} />
              Add Event
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Event</DialogTitle>
              <DialogDescription>
                Create a new event or reminder in your calendar.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Event Title</Label>
                <Input id="title" placeholder="Enter event title" />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" placeholder="Enter event details..." />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input id="start-date" type="date" defaultValue={format(new Date(), 'yyyy-MM-dd')} />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="start-time">Start Time</Label>
                  <Input id="start-time" type="time" defaultValue="09:00" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="end-date">End Date</Label>
                  <Input id="end-date" type="date" defaultValue={format(new Date(), 'yyyy-MM-dd')} />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="end-time">End Time</Label>
                  <Input id="end-time" type="time" defaultValue="10:00" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="category">Category</Label>
                  <Select>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="deadline">Deadline</SelectItem>
                      <SelectItem value="reminder">Reminder</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="client">Client (Optional)</Label>
                  <Select>
                    <SelectTrigger id="client">
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No client</SelectItem>
                      {mockClients.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center gap-2 space-y-0">
                <Switch id="is-reminder" />
                <Label htmlFor="is-reminder" className="font-normal">Set as reminder</Label>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline">Cancel</Button>
              <Button onClick={handleAddEvent}>Create Event</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center pb-2">
              <CardTitle>{format(date || new Date(), 'MMMM yyyy')}</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setView('month')} className={view === 'month' ? 'bg-muted' : ''}>
                  <CalendarDays size={16} />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setView('day')} className={view === 'day' ? 'bg-muted' : ''}>
                  <CalendarCheck size={16} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <CalendarComponent
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-md border"
                modifiers={{
                  today: (day) => isToday(day),
                }}
                modifiersClassNames={{
                  today: "bg-primary text-primary-foreground font-bold",
                }}
                components={{
                  DayContent: (props) => (
                    <div className={`relative w-full h-full ${getDateClasses(props.date)}`}>
                      <div className={`absolute top-0 left-0 w-full h-full flex items-center justify-center ${isToday(props.date) ? 'text-primary-foreground' : ''}`}>
                        {format(props.date, 'd')}
                      </div>
                      {getEventsForDate(props.date).length > 0 && (
                        <div className="absolute bottom-1 left-0 w-full flex justify-center">
                          <div className="h-1 w-1 rounded-full bg-primary"></div>
                        </div>
                      )}
                    </div>
                  )
                }}
              />
            </CardContent>
          </Card>
          
          {date && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Events for {format(date, 'MMMM d, yyyy')}</CardTitle>
              </CardHeader>
              <CardContent>
                {eventsForSelectedDate.length > 0 ? (
                  <div className="space-y-4">
                    {eventsForSelectedDate.map((event) => {
                      const client = event.clientId ? mockClients.find(c => c.id === event.clientId) : null;
                      return (
                        <div key={event.id} className="border-l-4 pl-4 py-2" style={{ borderLeftColor: event.category === 'meeting' ? '#1A73E8' : event.category === 'deadline' ? '#EA4335' : '#FBBC05' }}>
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">{event.title}</h4>
                              <p className="text-sm text-muted-foreground">
                                {formatEventTime(new Date(event.startDate))} - {formatEventTime(new Date(event.endDate))}
                              </p>
                              {client && (
                                <p className="text-sm mt-1">Client: {client.name}</p>
                              )}
                              {event.description && (
                                <p className="text-sm mt-2">{event.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={getCategoryColor(event.category)}>
                                {event.category}
                              </Badge>
                              {event.isReminder && (
                                <Badge variant="outline" className="border-finance-red flex items-center gap-1">
                                  <AlertTriangle size={12} className="text-finance-red" />
                                  Reminder
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No events scheduled for this day.</p>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="mt-4">
                          Add Event
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        {/* Reuse the event creation dialog content */}
                        <DialogHeader>
                          <DialogTitle>Add New Event</DialogTitle>
                          <DialogDescription>
                            Create a new event or reminder in your calendar.
                          </DialogDescription>
                        </DialogHeader>
                        
                        {/* Event form fields would go here (same as the other dialog) */}
                        
                        <DialogFooter>
                          <Button variant="outline">Cancel</Button>
                          <Button onClick={handleAddEvent}>Create Event</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Upcoming Events</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingEvents.length > 0 ? (
                <div className="space-y-4">
                  {upcomingEvents.slice(0, 5).map((event) => {
                    const client = event.clientId ? mockClients.find(c => c.id === event.clientId) : null;
                    const isToday = new Date(event.startDate).toDateString() === new Date().toDateString();
                    
                    return (
                      <div key={event.id} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">{event.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {isToday ? 'Today' : format(new Date(event.startDate), 'EEE, MMM d')} • {formatEventTime(new Date(event.startDate))}
                            </p>
                            {client && (
                              <p className="text-sm mt-1">Client: {client.name}</p>
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
                    <p className="text-center text-sm text-muted-foreground">
                      + {upcomingEvents.length - 5} more events
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-center py-8 text-muted-foreground">
                  No upcoming events scheduled.
                </p>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Reminders</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingEvents.filter(e => e.isReminder).length > 0 ? (
                <div className="space-y-4">
                  {upcomingEvents
                    .filter(e => e.isReminder)
                    .map((event) => (
                      <div key={event.id} className="flex items-center justify-between border rounded-lg p-3">
                        <div>
                          <h4 className="font-medium">{event.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(event.startDate), 'EEE, MMM d')}
                          </p>
                        </div>
                        <Button variant="outline" size="sm">Mark Complete</Button>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-center py-8 text-muted-foreground">
                  No pending reminders.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Calendar;
