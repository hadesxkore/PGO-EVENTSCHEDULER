import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import format from "date-fns/format";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import getDay from "date-fns/getDay";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";
import { getAllEventRequests } from "@/lib/firebase/eventRequests";
import { toast } from "sonner";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

import enUS from 'date-fns/locale/en-US'

const locales = {
  "en-US": enUS
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const statusColors = {
  approved: "bg-emerald-50/90 text-emerald-800 dark:bg-emerald-400/20 dark:text-emerald-300",
  rejected: "bg-rose-50/90 text-rose-800 dark:bg-rose-400/20 dark:text-rose-300"
};

// Helper function to get initials from full name
const getInitials = (fullName) => {
  if (!fullName) return "U";
  const names = fullName.split(" ");
  if (names.length >= 2) {
    return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
  }
  return fullName[0].toUpperCase();
};

const AllEvents = () => {
  const { isDarkMode } = useTheme();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDayEventsDialogOpen, setDayEventsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [view, setView] = useState("month");
  const [date, setDate] = useState(new Date());

  // Handle calendar navigation
  const handleNavigate = (action) => {
    const newDate = new Date(date);
    switch (action) {
      case 'PREV':
        if (view === 'month') {
          newDate.setMonth(date.getMonth() - 1);
        } else if (view === 'week') {
          newDate.setDate(date.getDate() - 7);
        } else if (view === 'day') {
          newDate.setDate(date.getDate() - 1);
        }
        break;
      case 'NEXT':
        if (view === 'month') {
          newDate.setMonth(date.getMonth() + 1);
        } else if (view === 'week') {
          newDate.setDate(date.getDate() + 7);
        } else if (view === 'day') {
          newDate.setDate(date.getDate() + 1);
        }
        break;
      case 'TODAY':
        newDate.setTime(new Date().getTime());
        break;
      default:
        if (typeof action === 'object' && action instanceof Date) {
          newDate.setTime(action.getTime());
        }
    }
    setDate(newDate);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const result = await getAllEventRequests();
      
      if (result.success) {
        // Transform events for calendar
        const transformedEvents = result.requests.map(event => {
          // Get the full date and time from Firestore timestamp
          const startDate = new Date(event.date.seconds * 1000);
          
          // Create end date 1 hour after start for better visibility
          const endDate = new Date(startDate);
          endDate.setHours(startDate.getHours() + 1);

          return {
            id: event.id,
            title: event.title,
            start: startDate,
            end: endDate,
            status: event.status,
            requestor: event.requestor,
            department: event.department,
            location: event.location,
            participants: event.participants,
            provisions: event.provisions,
            attachments: event.attachments,
          };
        });
        setEvents(transformedEvents.filter(event => event !== null));
      } else {
        toast.error("Failed to fetch events");
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error("An error occurred while fetching events");
    } finally {
      setLoading(false);
    }
  };

  // Filter events based on search term
  const filteredEvents = events.filter(event => {
    if (!searchTerm.trim()) return true;
    
    const searchLower = searchTerm.toLowerCase().trim();
    const titleMatch = event.title?.toLowerCase().includes(searchLower) || false;
    const requestorMatch = event.requestor?.toLowerCase().includes(searchLower) || false;
    const locationMatch = event.location?.toLowerCase().includes(searchLower) || false;
    const departmentMatch = event.department?.toLowerCase().includes(searchLower) || false;

    return titleMatch || requestorMatch || locationMatch || departmentMatch;
  });

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setIsViewDialogOpen(true);
  };

  // Custom calendar components
  const components = {
    event: (props) => {
      const eventTime = format(props.event.start, "h:mm a");
      const eventsOnSameDay = filteredEvents.filter(event => 
        format(event.start, 'yyyy-MM-dd') === format(props.event.start, 'yyyy-MM-dd')
      );
      const isMultipleEvents = eventsOnSameDay.length > 1;
      const remainingEvents = eventsOnSameDay.length - 1;

      return (
        <motion.div
          whileHover={{ scale: 1.01 }}
          className={cn(
            "h-full w-full px-2 py-1.5 text-sm transition-all duration-200 group relative",
            statusColors[props.event.status] || "bg-sky-50 text-sky-700 dark:bg-sky-400/10 dark:text-sky-400"
          )}
          title={`${props.title} - ${eventTime}`}
        >
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className={cn(
                "text-xs font-medium",
                "bg-amber-50/90 text-amber-800 dark:bg-amber-400/20 dark:text-amber-300"
              )}>
                {getInitials(props.event.requestor)}
              </AvatarFallback>
            </Avatar>
            <div className="font-medium truncate">{props.title}</div>
          </div>
          <div className="flex items-center justify-between">
            <div className={cn(
              "text-xs mt-1 opacity-80 flex items-center gap-1.5",
              isDarkMode ? "text-gray-400" : "text-gray-600"
            )}>
              <CalendarIcon className="h-3 w-3" />
              {eventTime}
            </div>
            {isMultipleEvents && (
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "text-xs px-2 py-0.5 h-6 mt-1",
                  isDarkMode 
                    ? "hover:bg-slate-800/50 text-gray-300" 
                    : "hover:bg-gray-100/50 text-gray-600"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  const date = props.event.start;
                  setSelectedDate(date);
                  setDayEventsDialogOpen(true);
                }}
              >
                +{remainingEvents} more
              </Button>
            )}
          </div>
          {/* Hover tooltip */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 5 }}
            whileHover={{ opacity: 1, scale: 1, y: 0 }}
            className={cn(
              "absolute left-full top-0 ml-2 p-3 rounded-lg shadow-lg w-56 z-50 hidden group-hover:block backdrop-blur-sm",
              isDarkMode 
                ? "bg-slate-900/90 border border-slate-800" 
                : "bg-white/90 border border-gray-200"
            )}
          >
            <div className="text-sm font-medium mb-2">{props.title}</div>
            <div className={cn(
              "flex items-center gap-2 text-xs",
              isDarkMode ? "text-gray-400" : "text-gray-500"
            )}>
              <CalendarIcon className="h-3 w-3" />
              <span>{format(props.event.start, "h:mm a")}</span>
            </div>
            <div className={cn(
              "flex items-center gap-2 text-xs mt-1.5",
              isDarkMode ? "text-gray-400" : "text-gray-500"
            )}>
              <Search className="h-3 w-3" />
              <span>{props.event.location}</span>
            </div>
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-slate-700">
              <Badge variant="secondary" className={cn(
                "text-[10px] capitalize",
                statusColors[props.event.status]
              )}>
                {props.event.status}
              </Badge>
            </div>
          </motion.div>
        </motion.div>
      );
    },
    toolbar: (props) => (
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className={cn(
            "flex items-center gap-2 rounded-xl p-1.5 shadow-lg backdrop-blur-sm transition-all duration-200",
            isDarkMode 
              ? "bg-slate-900/50 border border-slate-800/50" 
              : "bg-white/50 border border-gray-200/50"
          )}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => props.onNavigate('TODAY')}
              className={cn(
                "text-sm font-medium px-4 h-9 rounded-lg transition-all duration-200",
                isDarkMode 
                  ? "hover:bg-slate-800 text-gray-200 hover:text-white" 
                  : "hover:bg-gray-100 text-gray-700 hover:text-gray-900"
              )}
            >
              Today
            </Button>
            <Separator orientation="vertical" className={cn(
              "h-7",
              isDarkMode ? "bg-slate-800" : "bg-gray-200"
            )} />
            <div className="flex items-center rounded-lg overflow-hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => props.onNavigate('PREV')}
                className={cn(
                  "h-9 w-9 rounded-none transition-all duration-200",
                  isDarkMode 
                    ? "hover:bg-slate-800 text-gray-200 hover:text-white" 
                    : "hover:bg-gray-100 text-gray-700 hover:text-gray-900"
                )}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => props.onNavigate('NEXT')}
                className={cn(
                  "h-9 w-9 rounded-none transition-all duration-200",
                  isDarkMode 
                    ? "hover:bg-slate-800 text-gray-200 hover:text-white" 
                    : "hover:bg-gray-100 text-gray-700 hover:text-gray-900"
                )}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <h2 className={cn(
            "text-xl font-semibold",
            isDarkMode ? "text-gray-100" : "text-gray-900"
          )}>
            {format(props.date, 'MMMM yyyy')}
          </h2>
        </div>
        <div className={cn(
          "flex items-center gap-1 rounded-xl p-1.5 shadow-lg backdrop-blur-sm transition-all duration-200",
          isDarkMode 
            ? "bg-slate-900/50 border border-slate-800/50" 
            : "bg-white/50 border border-gray-200/50"
        )}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => props.onView('month')}
            className={cn(
              "text-sm font-medium h-9 transition-all duration-200 rounded-lg",
              props.view === 'month' 
                ? (isDarkMode 
                    ? "bg-slate-800 text-white shadow-inner" 
                    : "bg-gray-100 text-gray-900 shadow-inner")
                : (isDarkMode 
                    ? "text-gray-200 hover:bg-slate-800 hover:text-white" 
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900")
            )}
          >
            Month
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => props.onView('week')}
            className={cn(
              "text-sm font-medium h-9 transition-all duration-200 rounded-lg",
              props.view === 'week' 
                ? (isDarkMode 
                    ? "bg-slate-800 text-white shadow-inner" 
                    : "bg-gray-100 text-gray-900 shadow-inner")
                : (isDarkMode 
                    ? "text-gray-200 hover:bg-slate-800 hover:text-white" 
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900")
            )}
          >
            Week
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => props.onView('day')}
            className={cn(
              "text-sm font-medium h-9 transition-all duration-200 rounded-lg",
              props.view === 'day' 
                ? (isDarkMode 
                    ? "bg-slate-800 text-white shadow-inner" 
                    : "bg-gray-100 text-gray-900 shadow-inner")
                : (isDarkMode 
                    ? "text-gray-200 hover:bg-slate-800 hover:text-white" 
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900")
            )}
          >
            Day
          </Button>
        </div>
      </div>
    ),
    eventWrapper: (props) => (
      <div className="relative">
        {props.children}
      </div>
    ),
    timeSlotWrapper: (props) => (
      <div className={cn(
        "transition-colors",
        isDarkMode 
          ? "hover:bg-slate-800/50" 
          : "hover:bg-gray-50"
      )}>
        {props.children}
      </div>
    ),
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-[1400px] mx-auto px-8 py-8"
    >
      {/* Header */}
      <div className="mb-8">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "text-4xl font-bold tracking-tight",
            isDarkMode ? "text-white" : "text-gray-900"
          )}
        >
          All Events
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={cn(
            "text-lg mt-2",
            isDarkMode ? "text-gray-400" : "text-gray-500"
          )}
        >
          View and manage all event schedules
        </motion.p>
      </div>

      {/* Search */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search events by title, requestor, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={cn(
              "pl-9 h-11 transition-all duration-200 w-full max-w-xl",
              isDarkMode
                ? "bg-slate-900/50 border-slate-800 focus:border-slate-700 focus:ring-slate-700"
                : "bg-white/50 border-gray-200 focus:border-gray-300 focus:ring-gray-200"
            )}
          />
        </div>
      </motion.div>

      {/* Calendar */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        className={cn(
          "rounded-2xl border p-6 backdrop-blur-sm shadow-xl relative overflow-hidden",
          isDarkMode 
            ? "bg-slate-900/50 border-slate-800/50" 
            : "bg-white/50 border-gray-200/50"
        )}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: "radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)",
            backgroundSize: "32px 32px"
          }}></div>
        </div>

        {/* Calendar Component */}
        <div className="relative">
          <Calendar
            localizer={localizer}
            events={filteredEvents}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 800 }}
            view={view}
            date={date}
            onView={setView}
            onNavigate={handleNavigate}
            onSelectEvent={handleEventClick}
            components={components}
            className={cn(
              "react-big-calendar",
              isDarkMode && "dark-mode",
              "custom-calendar"
            )}
            formats={{
              timeGutterFormat: 'h:mm a',
              eventTimeRangeFormat: ({ start }) => format(start, 'h:mm a'),
              dayFormat: 'eee MM/dd',
              dayRangeHeaderFormat: ({ start, end }, culture, local) =>
                `${format(start, 'MMM dd')} - ${format(end, 'MMM dd, yyyy')}`
            }}
            min={new Date(new Date().setHours(6, 0, 0))}
            max={new Date(new Date().setHours(22, 0, 0))}
            step={30}
            timeslots={1}
            dayLayoutAlgorithm="no-overlap"
          />
        </div>
      </motion.div>

      {/* Event Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className={cn(
          "[&>button]:text-white [&>button:hover]:bg-white/10",
          "sm:max-w-[600px] border-none overflow-hidden",
          isDarkMode ? "bg-slate-900" : "bg-white"
        )}>
          {selectedEvent && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <DialogHeader>
                <div className={cn(
                  "p-8 -mx-6 -mt-6 mb-8 relative overflow-hidden",
                  isDarkMode 
                    ? "bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950" 
                    : "bg-gradient-to-br from-gray-900 via-gray-900 to-black"
                )}>
                  {/* Background Pattern */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0" style={{
                      backgroundImage: "radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 2px, transparent 0)",
                      backgroundSize: "32px 32px"
                    }}></div>
                  </div>
                  
                  {/* Content */}
                  <motion.div 
                    className="relative"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <DialogTitle className="text-2xl font-bold text-white mb-3">
                      {selectedEvent.title}
                    </DialogTitle>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className={cn(
                          "text-sm font-medium",
                          "bg-amber-50/90 text-amber-800 dark:bg-amber-400/20 dark:text-amber-300"
                        )}>
                          {getInitials(selectedEvent.requestor)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-gray-300">
                        Requested by {selectedEvent.requestor}
                      </span>
                    </div>
                  </motion.div>
                </div>
              </DialogHeader>

              <div className="space-y-6 px-2">
                {/* Event Details */}
                <div className="grid grid-cols-2 gap-4">
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className={cn(
                      "p-4 rounded-xl backdrop-blur-sm",
                      isDarkMode 
                        ? "bg-slate-800/50 border border-slate-700/50" 
                        : "bg-gray-50/80 border border-gray-100"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <CalendarIcon className="h-4 w-4 text-blue-500" />
                      </div>
                      <h4 className={cn(
                        "font-medium",
                        isDarkMode ? "text-gray-200" : "text-gray-700"
                      )}>Date & Time</h4>
                    </div>
                    <p className={cn(
                      "space-y-1",
                      isDarkMode ? "text-gray-300" : "text-gray-600"
                    )}>
                      <span className="block font-medium">{format(selectedEvent.start, "PPP")}</span>
                      <span className="block text-sm">
                        {format(selectedEvent.start, "p")}
                      </span>
                    </p>
                  </motion.div>

                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className={cn(
                      "p-4 rounded-xl backdrop-blur-sm",
                      isDarkMode 
                        ? "bg-slate-800/50 border border-slate-700/50" 
                        : "bg-gray-50/80 border border-gray-100"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-2 rounded-lg bg-green-500/10">
                        <Search className="h-4 w-4 text-green-500" />
                      </div>
                      <h4 className={cn(
                        "font-medium",
                        isDarkMode ? "text-gray-200" : "text-gray-700"
                      )}>Location</h4>
                    </div>
                    <p className={cn(
                      isDarkMode ? "text-gray-300" : "text-gray-600"
                    )}>
                      {selectedEvent.location}
                    </p>
                  </motion.div>
                </div>

                {/* Requirements */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className={cn(
                    "p-4 rounded-xl backdrop-blur-sm",
                    isDarkMode 
                      ? "bg-slate-800/50 border border-slate-700/50" 
                      : "bg-gray-50/80 border border-gray-100"
                  )}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <Filter className="h-4 w-4 text-purple-500" />
                    </div>
                    <h4 className={cn(
                      "font-medium",
                      isDarkMode ? "text-gray-200" : "text-gray-700"
                    )}>Requirements</h4>
                  </div>
                  <p className={cn(
                    "text-sm whitespace-pre-wrap",
                    isDarkMode ? "text-gray-300" : "text-gray-600"
                  )}>
                    {selectedEvent.provisions}
                  </p>
                </motion.div>
              </div>
            </motion.div>
          )}
        </DialogContent>
      </Dialog>

      {/* Day Events Dialog */}
      <Dialog open={isDayEventsDialogOpen} onOpenChange={setDayEventsDialogOpen}>
        <DialogContent className={cn(
          "[&>button]:text-white [&>button:hover]:bg-white/10",
          "sm:max-w-[600px] max-h-[80vh] border-none overflow-hidden",
          isDarkMode ? "bg-slate-900" : "bg-white"
        )}>
          {selectedDate && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <DialogHeader>
                <div className={cn(
                  "p-8 -mx-6 -mt-6 mb-8 relative overflow-hidden",
                  isDarkMode 
                    ? "bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950" 
                    : "bg-gradient-to-br from-gray-900 via-gray-900 to-black"
                )}>
                  {/* Background Pattern */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0" style={{
                      backgroundImage: "radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 2px, transparent 0)",
                      backgroundSize: "32px 32px"
                    }}></div>
                  </div>
                  
                  {/* Content */}
                  <motion.div 
                    className="relative"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <DialogTitle className="text-2xl font-bold text-white mb-3">
                      Events on {format(selectedDate, "MMMM d, yyyy")}
                    </DialogTitle>
                  </motion.div>
                </div>
              </DialogHeader>

              <div className="space-y-4 px-2 overflow-y-auto max-h-[calc(80vh-200px)]">
                {filteredEvents
                  .filter(event => format(event.start, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd'))
                  .sort((a, b) => a.start - b.start)
                  .map((event, index) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={cn(
                        "p-4 rounded-xl backdrop-blur-sm cursor-pointer transition-all duration-200",
                        isDarkMode 
                          ? "bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800/70" 
                          : "bg-gray-50/80 border border-gray-100 hover:bg-gray-100/80"
                      )}
                      onClick={() => {
                        setSelectedEvent(event);
                        setDayEventsDialogOpen(false);
                        setIsViewDialogOpen(true);
                      }}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className={cn(
                            "text-sm font-medium",
                            "bg-amber-50/90 text-amber-800 dark:bg-amber-400/20 dark:text-amber-300"
                          )}>
                            {getInitials(event.requestor)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h3 className={cn(
                            "font-medium",
                            isDarkMode ? "text-gray-200" : "text-gray-700"
                          )}>
                            {event.title}
                          </h3>
                          <p className={cn(
                            "text-sm",
                            isDarkMode ? "text-gray-400" : "text-gray-600"
                          )}>
                            {event.requestor}
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4 text-gray-400" />
                          <span className={cn(
                            "text-sm",
                            isDarkMode ? "text-gray-400" : "text-gray-600"
                          )}>
                            {format(event.start, "h:mm a")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Search className="h-4 w-4 text-gray-400" />
                          <span className={cn(
                            "text-sm truncate",
                            isDarkMode ? "text-gray-400" : "text-gray-600"
                          )}>
                            {event.location}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
              </div>
            </motion.div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default AllEvents;
