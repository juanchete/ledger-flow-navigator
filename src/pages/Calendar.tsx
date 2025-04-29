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
import { format, isToday, addDays, parseISO } from "date-fns";
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
                <Label htmlFor="category">Category</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="legal">Legal</SelectItem>
                    <SelectItem value="banking">Banking</SelectItem>
                    <SelectItem value="home">Home</SelectItem>
                    <SelectItem value="social">Social</SelectItem>
                    <SelectItem value="charity">Charity</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" placeholder="Enter event details..." />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Start Date & Time</Label>
                  <div className="flex gap-2">
                    <Input type="date" className="flex-1" defaultValue={format(date || new Date(), 'yyyy-MM-dd')} />
                    <Input type="time" className="flex-1" defaultValue="09:00" />
                  </div>
                </div>
                
                <div className="grid gap-2">
                  <Label>End Date & Time</Label>
                  <div className="flex gap-2">
                    <Input type="date" className="flex-1" defaultValue={format(date || new Date(), 'yyyy-MM-dd')} />
                    <Input type="time" className="flex-1" defaultValue="10:00" />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 space-y-0">
                <Switch id="reminder" />
                <Label htmlFor="reminder">Set Reminder</Label>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="reminderDays">Reminder Days Before</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select days" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Same day</SelectItem>
                    <SelectItem value="1">1 day before</SelectItem>
                    <SelectItem value="3">3 days before</SelectItem>
                    <SelectItem value="7">1 week before</SelectItem>
                    <SelectItem value="14">2 weeks before</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline">Cancel</Button>
              <Button onClick={handleAddEvent}>Create Event</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-6">
        <div className="flex flex-col gap-6 w-full">
          <Card className="w-full">
            <CardHeader className="flex flex-row justify-between items-center pb-2 w-full">
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
            <CardContent className="p-0 w-full">
              <div className="w-full min-w-0">
                <CalendarComponent
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  className="rounded-md border-0 w-full min-w-0"
                  components={{
                    DayContent: (props) => (
                      <div className={`relative w-full h-full flex items-center justify-center ${getDateClasses(props.date)}`}>
                        <span className={isToday(props.date) ? 'font-bold' : ''}>
                          {format(props.date, 'd')}
                        </span>
                        {getEventsForDate(props.date).length > 0 && (
                          <div className="absolute bottom-0 left-0 w-full flex justify-center gap-0.5 pb-1">
                            {getEventsForDate(props.date).slice(0, 3).map((event, idx) => (
                              <span key={idx} className={`h-1 w-1 rounded-full ${getCategoryColor(event.category)}`} />
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
                <CardTitle className="text-lg">Events for {format(date, 'MMMM d, yyyy')}</CardTitle>
              </CardHeader>
              <CardContent>
                {eventsForSelectedDate.length > 0 ? (
                  <div className="space-y-4">
                    {eventsForSelectedDate.map((event) => (
                      <div key={event.id} className="flex items-start space-x-4 p-3 rounded-lg border">
                        <div className="text-2xl">{getCategoryIcon(event.category)}</div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">{event.title}</h4>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(event.startDate), 'h:mm a')} - {format(new Date(event.endDate), 'h:mm a')}
                              </p>
                              {event.description && (
                                <p className="text-sm mt-2">{event.description}</p>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <Badge className={getCategoryColor(event.category)}>
                                {event.category}
                              </Badge>
                              {event.isReminder && (
                                <Badge variant="outline" className="border-red-500 text-red-500">
                                  <AlertTriangle size={12} className="mr-1" />
                                  Reminder
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
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
                            <Label htmlFor="category">Category</Label>
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="legal">Legal</SelectItem>
                                <SelectItem value="banking">Banking</SelectItem>
                                <SelectItem value="home">Home</SelectItem>
                                <SelectItem value="social">Social</SelectItem>
                                <SelectItem value="charity">Charity</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="grid gap-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea id="description" placeholder="Enter event details..." />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                              <Label>Start Date & Time</Label>
                              <div className="flex gap-2">
                                <Input type="date" className="flex-1" defaultValue={format(date || new Date(), 'yyyy-MM-dd')} />
                                <Input type="time" className="flex-1" defaultValue="09:00" />
                              </div>
                            </div>
                            
                            <div className="grid gap-2">
                              <Label>End Date & Time</Label>
                              <div className="flex gap-2">
                                <Input type="date" className="flex-1" defaultValue={format(date || new Date(), 'yyyy-MM-dd')} />
                                <Input type="time" className="flex-1" defaultValue="10:00" />
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 space-y-0">
                            <Switch id="reminder" />
                            <Label htmlFor="reminder">Set Reminder</Label>
                          </div>
                          
                          <div className="grid gap-2">
                            <Label htmlFor="reminderDays">Reminder Days Before</Label>
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder="Select days" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">Same day</SelectItem>
                                <SelectItem value="1">1 day before</SelectItem>
                                <SelectItem value="3">3 days before</SelectItem>
                                <SelectItem value="7">1 week before</SelectItem>
                                <SelectItem value="14">2 weeks before</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
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
                              {isToday ? 'Today' : format(new Date(event.startDate), 'EEE, MMM d')} • {format(new Date(event.startDate), 'h:mm a')}
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
