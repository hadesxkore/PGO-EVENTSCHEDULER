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
import useEventStore from "@/store/eventStore";
import { toast } from "sonner";
import { auth, db } from "@/lib/firebase/firebase";
import { doc, getDoc } from "firebase/firestore";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  X,
  Lock,
  Clock,
  MapPin,
  Users,
  FileText,
  User,
  Eye,
  Download,
} from "lucide-react";
import { downloadFile } from "@/lib/utils/downloadFile";
import { getCloudinaryFileUrl } from "@/lib/cloudinary";
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
import { ScrollArea } from "@/components/ui/scroll-area";

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
  approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/30 dark:text-emerald-300",
  rejected: "bg-rose-100 text-rose-800 dark:bg-rose-400/30 dark:text-rose-300"
};

// Helper function to get initials from full name
const getInitials = (fullName) => {
  if (!fullName) return "U";
  return fullName.charAt(0).toUpperCase();
};

const AllEvents = ({ userData }) => {
  const { isDarkMode } = useTheme();
  const { 
    allEvents,
    loading,
    error,
    fetchAllEvents 
  } = useEventStore();

  const [currentUser, setCurrentUser] = useState(null);
  const [userDepartment, setUserDepartment] = useState(null);
  const [role, setRole] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDayEventsDialogOpen, setDayEventsDialogOpen] = useState(false);
  const [isRequirementsDialogOpen, setIsRequirementsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [view, setView] = useState("month");
  const [date, setDate] = useState(new Date());

  // Get current user data from localStorage
  useEffect(() => {
    try {
      // Try different possible keys
      const possibleKeys = ['userData', 'user', 'userInfo', 'currentUser'];
      let userData = null;
      
      for (const key of possibleKeys) {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            userData = JSON.parse(data);
            if (userData && userData.role) break;
          } catch (e) {
            // Silently handle parsing errors
          }
        }
      }

      // If we found valid user data
      if (userData && userData.role) {
        setCurrentUser({ 
          email: userData.email,
          uid: userData.uid || userData.id // Include uid if available
        });
        setRole(userData.role);
        
        // For non-admin users, set department if it exists
        if (userData.department) {
          setUserDepartment(userData.department);
        }
      } else {
        // If no user data found, redirect to login
        toast.error("Please log in to access this page");
        // You can uncomment the next line if you want to redirect to login
        // window.location.href = '/';
      }
    } catch (error) {
      toast.error("Error getting user information");
    }
  }, []);

  // Show error toast if there's an error
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);



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
    const loadEvents = async () => {
      const result = await fetchAllEvents();
      if (!result.success) {
        toast.error(result.error || "Failed to fetch events");
      }
    };

    loadEvents();
  }, [fetchAllEvents]);

  // Filter events based on search term
  const filteredEvents = allEvents.filter(event => {
    if (!searchTerm.trim()) return true;
    
    const searchLower = searchTerm.toLowerCase().trim();
    const titleMatch = event.title?.toLowerCase().includes(searchLower) || false;
    const requestorMatch = event.requestor?.toLowerCase().includes(searchLower) || false;
    const locationMatch = event.location?.toLowerCase().includes(searchLower) || false;
    const departmentMatch = event.department?.toLowerCase().includes(searchLower) || false;

    return titleMatch || requestorMatch || locationMatch || departmentMatch;
  });

  const handleEventClick = (event) => {
    // If user is Admin, allow access to all events
    if (role === "Admin") {
      setSelectedEvent(event);
      setIsViewDialogOpen(true);
      return;
    }

    // For non-admin users, check department access
    if (currentUser && userDepartment === event.department) {
      setSelectedEvent(event);
      setIsViewDialogOpen(true);
    } else {
      toast.error("Access Denied", {
        description: "You can only view details of events from your department.",
        icon: <Lock className="h-5 w-5" />,
      });
    }
  };

  // Custom calendar components
  const components = {
    event: (props) => {
      const startTime = format(props.event.start, "h:mm a");
      const eventsOnSameDay = filteredEvents.filter(event => 
        format(event.start, 'yyyy-MM-dd') === format(props.event.start, 'yyyy-MM-dd')
      );
      const isMultipleEvents = eventsOnSameDay.length > 1;
      const remainingEvents = eventsOnSameDay.length - 1;
      
      // Check if event is clickable (only if user created it)
      const isClickable = props.event.userId === userData?.uid;

      // If user is Admin, they can see all events
      const isFromUserDepartment = role === "Admin" || (currentUser && userDepartment === props.event.department);

      return (
        <motion.div
          whileHover={{ scale: isFromUserDepartment ? 1.01 : 1 }}
          className={cn(
            "h-full w-full px-2 py-1.5 text-sm transition-all duration-200 group relative",
            statusColors[props.event.status] || "bg-sky-50 text-sky-700 dark:bg-sky-400/10 dark:text-sky-400",
            !isFromUserDepartment && "cursor-not-allowed opacity-70"
          )}
          title={`${props.title} - ${startTime}${!isFromUserDepartment ? ' (View restricted - ' + props.event.department + ' department only)' : ''}`}
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
              {startTime}
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
          Calendar
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
          View and manage all event schedules in calendar format
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
            events={filteredEvents.map(event => ({
              ...event,
              userId: event.userId,  // Ensure these fields are explicitly passed
              userEmail: event.userEmail
            }))}
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
        <DialogContent className="sm:max-w-[900px] p-0 border-0 bg-white rounded-2xl overflow-hidden">
          {selectedEvent && (
            <ScrollArea className="h-[85vh]">
              {/* Header Section */}
              <div className="relative bg-white p-8 border-b border-gray-200">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-4 h-8 w-8 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-900"
                  onClick={() => setIsViewDialogOpen(false)}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </Button>
                <Badge variant="outline" className="mb-4 border-gray-300 text-gray-700 bg-gray-100">
                  {selectedEvent.department}
                </Badge>
                <DialogTitle className="text-2xl font-bold text-gray-900 mb-2">
                  {selectedEvent.title}
                </DialogTitle>
                <p className="text-gray-600 text-sm">Event Details & Requirements</p>
              </div>
              
              {/* Content Section */}
              <div className="p-8 bg-gray-50 space-y-8">

                {/* Event Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Requestor */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-black rounded-lg">
                        <User className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="font-semibold text-gray-900">Requestor</h3>
                    </div>
                    <div className="text-xl font-bold text-gray-900 mb-1">{selectedEvent.requestor}</div>
                    <div className="text-sm text-gray-500 uppercase tracking-wide">{selectedEvent.department}</div>
                  </div>

                  {/* Date & Time */}
                  {selectedEvent.locations && selectedEvent.locations.length > 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm md:col-span-2">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-black">
                          <Clock className="h-5 w-5 text-white" />
                        </div>
                        <h3 className="font-semibold text-gray-900">Multiple Location Schedule</h3>
                      </div>
                      <div className="space-y-4 max-h-60 overflow-y-auto">
                        {selectedEvent.locations.map((location, index) => (
                          <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium text-gray-900">{location.location}</h4>
                              <Badge variant="outline" className="text-xs">
                                Location {index + 1}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                  Start
                                </p>
                                <p className="text-sm font-medium text-gray-900">
                                  {location.startDate ? new Date(location.startDate).toLocaleDateString() : "Not set"}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {location.startTime ? (() => {
                                    const [hours, minutes] = location.startTime.split(':');
                                    const hour = parseInt(hours);
                                    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                                    const ampm = hour < 12 ? 'AM' : 'PM';
                                    return `${displayHour}:${minutes} ${ampm}`;
                                  })() : "Not set"}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                  End
                                </p>
                                <p className="text-sm font-medium text-gray-900">
                                  {location.endDate ? new Date(location.endDate).toLocaleDateString() : "Not set"}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {location.endTime ? (() => {
                                    const [hours, minutes] = location.endTime.split(':');
                                    const hour = parseInt(hours);
                                    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                                    const ampm = hour < 12 ? 'AM' : 'PM';
                                    return `${displayHour}:${minutes} ${ampm}`;
                                  })() : "Not set"}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-black rounded-lg">
                          <Clock className="h-5 w-5 text-white" />
                        </div>
                        <h3 className="font-semibold text-gray-900">Schedule</h3>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">START</div>
                          <div className="text-sm font-semibold text-gray-900">{format(selectedEvent.start, "MMM d, yyyy")}</div>
                          <div className="text-sm text-gray-600">{format(selectedEvent.start, "h:mm a")}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">END</div>
                          <div className="text-sm font-semibold text-gray-900">{format(selectedEvent.actualEndDate, "MMM d, yyyy")}</div>
                          <div className="text-sm text-gray-600">{format(selectedEvent.actualEndDate, "h:mm a")}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Location */}
                  {selectedEvent.locations && selectedEvent.locations.length > 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-black">
                          <MapPin className="h-5 w-5 text-white" />
                        </div>
                        <h3 className="font-semibold text-gray-900">Locations</h3>
                      </div>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {selectedEvent.locations.map((location, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                            <p className="text-sm font-medium text-gray-900">
                              {location.location}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {index + 1}
                            </Badge>
                          </div>
                        ))}
                      </div>
                      <p className="text-sm text-gray-500 mt-3">
                        {selectedEvent.locations.length} Venues
                      </p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-black rounded-lg">
                          <MapPin className="h-5 w-5 text-white" />
                        </div>
                        <h3 className="font-semibold text-gray-900">Location</h3>
                      </div>
                      <div className="text-xl font-bold text-gray-900 mb-1">{selectedEvent.location}</div>
                      <div className="text-sm text-gray-500 uppercase tracking-wide">Venue</div>
                    </div>
                  )}

                  {/* Participants */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-black rounded-lg">
                        <Users className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="font-semibold text-gray-900">Attendees</h3>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 mb-1">{selectedEvent.participants}</div>
                    <div className="text-sm text-gray-500 uppercase tracking-wide">Expected Participants</div>
                  </div>

                  {/* VIP */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-black rounded-lg">
                        <User className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="font-semibold text-gray-900">VIPs</h3>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 mb-1">{selectedEvent.vip || 0}</div>
                    <div className="text-sm text-gray-500 uppercase tracking-wide">VIP Attendees</div>
                  </div>

                  {/* VVIP */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-black rounded-lg">
                        <User className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="font-semibold text-gray-900">VVIPs</h3>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 mb-1">{selectedEvent.vvip || 0}</div>
                    <div className="text-sm text-gray-500 uppercase tracking-wide">VVIP Attendees</div>
                  </div>
                </div>

                {/* Requirements Card */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-black rounded-lg">
                        <FileText className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="font-semibold text-gray-900">Requirements</h3>
                    </div>
                    <Button
                      size="sm"
                      className="gap-2 bg-black hover:bg-gray-900 text-white border-0 rounded-lg"
                      onClick={() => {
                        setIsRequirementsDialogOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                      View Full Details
                    </Button>
                  </div>
                  <div className="relative">
                    <div className="rounded-lg p-4 text-sm relative bg-gray-50 text-gray-600">
                      {selectedEvent.departmentRequirements ? (
                        selectedEvent.departmentRequirements.slice(0, 2).map((dept, deptIndex) => (
                          <div key={deptIndex} className="mb-4 last:mb-0">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-medium text-gray-700">
                                {dept.departmentName}
                              </h4>
                              {dept.classification && (
                                <Badge variant="outline" className="font-medium px-2 py-0.5 text-xs border-gray-300 text-gray-700 bg-gray-100">
                                  {dept.classification}
                                </Badge>
                              )}
                            </div>
                            {dept.requirements.slice(0, 2).map((req, reqIndex) => {
                              const requirement = typeof req === 'string' ? { name: req } : req;
                              return (
                                <div
                                  key={`${deptIndex}-${reqIndex}`}
                                  className="mb-2 last:mb-0 flex items-start gap-2 text-gray-600"
                                >
                                  <div className="p-1.5 rounded-md mt-0.5 bg-black shadow-sm">
                                    <FileText className="h-4 w-4 text-white" />
                                  </div>
                                  <div>
                                    <span className="font-semibold block text-gray-700">
                                      {requirement.name}
                                    </span>
                                    <div className="mt-1 space-y-0.5">
                                      <span className="text-xs block text-gray-500 whitespace-pre-wrap">
                                        {requirement.note || "No notes provided for this requirement"}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ))
                      ) : (
                        selectedEvent.requirements && selectedEvent.requirements.slice(0, 2).map((req, index) => {
                          const requirement = typeof req === 'string' ? { name: req } : req;
                          return (
                            <div
                              key={index}
                              className="mb-3 last:mb-0 flex items-start gap-2 text-gray-600"
                            >
                              <div className="p-1.5 rounded-md mt-0.5 bg-white shadow-sm">
                                <FileText className="h-4 w-4 text-gray-600" />
                              </div>
                              <div>
                                <span className="font-semibold block text-gray-700">
                                  {requirement.name}
                                </span>
                                {requirement.note && (
                                  <span className="text-xs block mt-0.5 text-gray-500 whitespace-pre-wrap">
                                    {requirement.note}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                      
                      {((selectedEvent.departmentRequirements && 
                        (selectedEvent.departmentRequirements.length > 2 || 
                         selectedEvent.departmentRequirements.some(dept => dept.requirements.length > 2))) ||
                        (selectedEvent.requirements && selectedEvent.requirements.length > 2)) && (
                        <>
                          <div className="absolute bottom-0 left-0 right-0 h-24 rounded-b-lg bg-gradient-to-t from-gray-50/90 via-gray-50/50 to-transparent" />
                          <div className="absolute bottom-2 left-0 right-0 text-sm font-medium text-center text-gray-700">
                            Click "View Full Details" to see all requirements
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Classifications Card */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <FileText className="h-5 w-5 text-gray-700" />
                    </div>
                    <h3 className="font-semibold text-gray-900">Classifications</h3>
                  </div>
                  <div className="rounded-lg p-4 bg-gray-50">
                    <p className="text-base leading-relaxed whitespace-pre-wrap text-gray-700">
                      {selectedEvent.classifications || "No classifications provided"}
                    </p>
                  </div>
                </div>

                {/* Attachments Card */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <FileText className="h-5 w-5 text-gray-700" />
                    </div>
                    <h3 className="font-semibold text-gray-900">Attachments</h3>
                  </div>
                  <div className="rounded-lg p-4 text-center bg-gray-50">
                    <p className="text-sm text-gray-500">
                      To view and download attachments, please visit the "My Events" page.
                    </p>
                  </div>
                </div>


              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Day Events Dialog */}
      <Dialog open={isDayEventsDialogOpen} onOpenChange={setDayEventsDialogOpen}>
        <DialogContent 
          className={cn(
            "[&>button]:text-white [&>button:hover]:bg-white/10",
            "sm:max-w-[600px] max-h-[80vh] border-none overflow-hidden",
            isDarkMode ? "bg-slate-900" : "bg-white"
          )}
          description="View all events for the selected day"
        >
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
                        "p-4 rounded-xl backdrop-blur-sm transition-all duration-200",
                        role === "Admin" || event.userId === currentUser?.uid || event.userEmail === currentUser?.email
                          ? (isDarkMode 
                              ? "bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800/70 cursor-pointer" 
                              : "bg-gray-50/80 border border-gray-100 hover:bg-gray-100/80 cursor-pointer")
                          : (isDarkMode
                              ? "bg-slate-800/30 border border-slate-700/30 opacity-60 cursor-not-allowed"
                              : "bg-gray-50/50 border border-gray-100/50 opacity-60 cursor-not-allowed")
                      )}
                      onClick={() => {
                        // Check if user is admin or owner of the event
                        if (role === "Admin" || event.userId === currentUser?.uid || event.userEmail === currentUser?.email) {
                          setSelectedEvent(event);
                          setDayEventsDialogOpen(false);
                          setIsViewDialogOpen(true);
                        } else {
                          toast.error("Access Denied", {
                            description: "You can only view details of events you own.",
                            icon: <Lock className="h-5 w-5" />,
                          });
                        }
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

      {/* Requirements Dialog */}
      <Dialog open={isRequirementsDialogOpen} onOpenChange={setIsRequirementsDialogOpen}>
        <DialogContent className="sm:max-w-[900px] p-0 border-0 bg-white rounded-2xl overflow-hidden max-h-[90vh]">
          {selectedEvent && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-4 h-8 w-8 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-900 z-10"
                onClick={() => setIsRequirementsDialogOpen(false)}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
              
              <ScrollArea className="flex-1">
                <div className="p-8 space-y-6">

                {selectedEvent.departmentRequirements && selectedEvent.departmentRequirements.length > 0 ? (
                  selectedEvent.departmentRequirements.map((dept, deptIndex) => (
                    <div key={deptIndex} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                      <div className="bg-white border-b border-gray-200 p-6">
                        <h3 className="text-xl font-bold text-gray-900">{dept.departmentName}</h3>
                        <p className="text-gray-600 text-sm mt-1">{dept.requirements.length} requirement{dept.requirements.length !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="p-6 bg-gray-50">
                        <div className={cn(
                          "grid gap-4",
                          {
                            'grid-cols-1': dept.requirements.length <= 4,
                            'grid-cols-2': dept.requirements.length > 4 && dept.requirements.length <= 8,
                            'grid-cols-3': dept.requirements.length > 8
                          }
                        )}>
                          {dept.requirements.map((req, reqIndex) => {
                            const requirement = typeof req === 'string' ? { name: req } : req;
                            return (
                              <div
                                key={`${deptIndex}-${reqIndex}`}
                                className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm"
                              >
                                <div className="flex items-center gap-3 mb-3">
                                  <div className="p-1.5 bg-black rounded-lg shrink-0">
                            <FileText className="h-4 w-4 text-white" />
                                  </div>
                                  <h4 className="font-semibold text-sm text-gray-900">
                                    {requirement.name}
                                  </h4>
                                </div>
                                <div className="pl-8">
                                  <span className="text-xs text-gray-600 whitespace-pre-wrap">
                                    {requirement.note || "No notes provided for this requirement"}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center">
                    <p className="text-sm text-gray-500">
                      No requirements specified for this event
                    </p>
                  </div>
                )}
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default AllEvents;
