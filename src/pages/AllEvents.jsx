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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

  const [userDepartment, setUserDepartment] = useState(null);
  const [role, setRole] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
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

  // Handle window resize for responsive calendar
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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


  // Custom calendar components
  const components = {
    event: (props) => {
      const eventData = props.event; // The full event object
      const isFromUserDepartment = role === "Admin" || (currentUser && userDepartment === eventData.department);

      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="w-full px-2 py-1 text-xs font-bold rounded-sm transition-all duration-200 relative overflow-hidden bg-blue-600 text-white cursor-pointer"
              title="" // Remove default browser tooltip
              style={{ 
                height: '20px', 
                minHeight: '20px',
                backgroundColor: '#1d4ed8',
                color: 'white'
              }}
            >
              <div className="truncate leading-tight text-white font-bold" title="">
                {props.title}
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent 
            side="right" 
            sideOffset={10}
            className={cn(
              "p-4 w-64 shadow-xl",
              isDarkMode 
                ? "bg-slate-900 border-slate-700 text-white" 
                : "bg-white border-gray-200 text-gray-900"
            )}
          >
            <div className="space-y-3">
              {/* Event Title */}
              <div className="text-sm font-bold">
                {props.title}
              </div>
              
              {/* Start Time */}
              <div className="flex items-center gap-2 text-xs">
                <CalendarIcon className="h-3 w-3 text-green-500 flex-shrink-0" />
                <span className="font-medium">Start:</span>
                <span className="text-xs">
                  {eventData.start ? format(eventData.start, "MMM dd, yyyy 'at' h:mm a") : 'No start time'}
                </span>
              </div>
              
              {/* End Time */}
              <div className="flex items-center gap-2 text-xs">
                <CalendarIcon className="h-3 w-3 text-red-500 flex-shrink-0" />
                <span className="font-medium">End:</span>
                <span className="text-xs">
                  {(eventData.actualEndDate || eventData.end) ? 
                    format(eventData.actualEndDate || eventData.end, "MMM dd, yyyy 'at' h:mm a") : 
                    'No end time'
                  }
                </span>
              </div>
              
              {/* Location */}
              {eventData.location && (
                <div className="flex items-center gap-2 text-xs">
                  <MapPin className="h-3 w-3 text-blue-500 flex-shrink-0" />
                  <span className="font-medium">Location:</span>
                  <span className="text-xs">{eventData.location}</span>
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
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
      className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8"
    >
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight",
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
            "text-sm sm:text-base lg:text-lg mt-1 sm:mt-2",
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
        className="mb-6 sm:mb-8"
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={cn(
              "pl-9 h-10 sm:h-11 transition-all duration-200 w-full",
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
          "rounded-xl sm:rounded-2xl border p-3 sm:p-4 lg:p-6 backdrop-blur-sm shadow-xl relative overflow-hidden",
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
            style={{ 
              height: windowWidth < 640 ? 400 : windowWidth < 1024 ? 500 : 700 
            }}
            view={view}
            date={date}
            onView={setView}
            onNavigate={handleNavigate}
            components={components}
            className={cn(
              "react-big-calendar",
              isDarkMode && "dark-mode",
              "custom-calendar mobile-responsive-calendar"
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



      
      {/* Mobile-responsive CSS */}
      <style jsx global>{`
        .mobile-responsive-calendar .rbc-calendar {
          font-size: ${windowWidth < 640 ? '12px' : '14px'};
        }
        
        .mobile-responsive-calendar .rbc-header {
          padding: ${windowWidth < 640 ? '4px 2px' : '8px 4px'};
          font-size: ${windowWidth < 640 ? '11px' : '13px'};
          font-weight: 600;
        }
        
        .mobile-responsive-calendar .rbc-date-cell {
          padding: ${windowWidth < 640 ? '2px' : '4px'};
          font-size: ${windowWidth < 640 ? '11px' : '12px'};
        }
        
        .mobile-responsive-calendar .rbc-event {
          font-size: ${windowWidth < 640 ? '10px' : '12px'};
          padding: ${windowWidth < 640 ? '1px 3px' : '2px 4px'};
          border-radius: 4px;
        }
        
        .mobile-responsive-calendar .rbc-toolbar {
          flex-direction: ${windowWidth < 640 ? 'column' : 'row'};
          gap: ${windowWidth < 640 ? '8px' : '16px'};
          margin-bottom: ${windowWidth < 640 ? '12px' : '16px'};
        }
        
        .mobile-responsive-calendar .rbc-toolbar-label {
          font-size: ${windowWidth < 640 ? '16px' : '18px'};
          font-weight: 600;
        }
        
        @media (max-width: 640px) {
          .mobile-responsive-calendar .rbc-month-view {
            font-size: 11px;
          }
          
          .mobile-responsive-calendar .rbc-date-cell > a {
            font-size: 11px;
          }
          
          .mobile-responsive-calendar .rbc-off-range-bg {
            background: transparent;
          }
          
          .mobile-responsive-calendar .rbc-today {
            background-color: rgba(59, 130, 246, 0.1);
          }
        }
        
        /* Hide tooltip arrow - multiple selectors to ensure it's hidden */
        [data-radix-tooltip-content] [data-radix-tooltip-arrow] {
          display: none !important;
        }
        
        [data-radix-tooltip-arrow] {
          display: none !important;
        }
        
        .radix-tooltip-arrow {
          display: none !important;
        }
        
        /* Hide any arrow-like elements in tooltips */
        [data-slot="tooltip-content"] > * {
          display: none !important;
        }
        
        [data-slot="tooltip-content"] > *:first-child {
          display: block !important;
        }
      `}</style>
    </motion.div>
  );
};

export default AllEvents;
