import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
// Removed shadcn imports - using custom dropdowns
import { 
  CalendarDays, 
  Search, 
  Filter, 
  MapPin, 
  Users, 
  Calendar,
  Building2,
  Eye,
  X,
  ArrowUpDown,
  SortAsc,
  SortDesc,
  ChevronDown,
  Check,
  Plus
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import useEventStore from "@/store/eventStore";
import { auth, db } from "@/lib/firebase/firebase";
import { doc, getDoc } from "firebase/firestore";

const AllEventsNew = ({ userData }) => {
  const { isDarkMode } = useTheme();
  
  // Use Zustand store instead of local state
  const { 
    allEvents, 
    loading, 
    error, 
    fetchAllEvents 
  } = useEventStore();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [transformedEvents, setTransformedEvents] = useState([]);
  const [userDepartment, setUserDepartment] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Filter and Sort states
  const [statusFilter, setStatusFilter] = useState([]);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  
  // Popover states
  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);

  // Status color mapping - handle both lowercase and capitalized versions
  const statusColors = {
    "Pending": isDarkMode ? "bg-amber-600 text-white border-amber-600" : "bg-amber-500 text-white border-amber-500",
    "pending": isDarkMode ? "bg-amber-600 text-white border-amber-600" : "bg-amber-500 text-white border-amber-500",
    "Approved": isDarkMode ? "bg-green-600 text-white border-green-600" : "bg-green-500 text-white border-green-500",
    "approved": isDarkMode ? "bg-green-600 text-white border-green-600" : "bg-green-500 text-white border-green-500",
    "Rejected": isDarkMode ? "bg-red-600 text-white border-red-600" : "bg-red-500 text-white border-red-500",
    "rejected": isDarkMode ? "bg-red-600 text-white border-red-600" : "bg-red-500 text-white border-red-500",
    "Disapproved": isDarkMode ? "bg-red-600 text-white border-red-600" : "bg-red-500 text-white border-red-500",
    "disapproved": isDarkMode ? "bg-red-600 text-white border-red-600" : "bg-red-500 text-white border-red-500",
    "In Review": isDarkMode ? "bg-blue-600 text-white border-blue-600" : "bg-blue-500 text-white border-blue-500",
    "in review": isDarkMode ? "bg-blue-600 text-white border-blue-600" : "bg-blue-500 text-white border-blue-500",
  };

  // Get current user data
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            setUserDepartment(userData.department);
            setCurrentUser({
              uid: user.uid,
              email: user.email || userData.email,
              department: userData.department
            });
          }
        } else if (userData) {
          // Fallback to passed userData prop
          setUserDepartment(userData.department);
          setCurrentUser({
            uid: userData.uid || userData.id,
            email: userData.email,
            department: userData.department
          });
        }
      } catch (error) {
        console.error("Error getting user data:", error);
        toast.error("Failed to get user information");
      }
    };

    getCurrentUser();
  }, [userData]);

  // Fetch all events using Zustand store (with caching)
  useEffect(() => {
    const loadEvents = async () => {
      try {
        const result = await fetchAllEvents();
        if (result.success) {
          // Transform events for the list view (handle multiple locations)
          const transformedEvents = [];
          
          // Filter events to show only user's department events or events they created
          const userEvents = result.events.filter(event => {
            if (!currentUser || !userDepartment) return false;
            
            // Show events from user's department
            const isDepartmentEvent = event.department === userDepartment;
            
            // Show events created by the current user
            const isUserCreatedEvent = event.userId === currentUser.uid || 
                                     event.userEmail === currentUser.email;
            
            return isDepartmentEvent || isUserCreatedEvent;
          });

          userEvents.forEach((event) => {
            // Check if this is a multiple location event with locations array
            if (event.isMultipleLocations && event.locations && Array.isArray(event.locations) && event.locations.length > 0) {
              // Create separate entries for each location
              event.locations.forEach((locationData, index) => {
                if (locationData.location && locationData.location.trim()) {
                  transformedEvents.push({
                    id: `${event.id}_location_${index}`,
                    originalId: event.id,
                    ...event,
                    location: locationData.location,
                    startDate: locationData.startDate?.toDate ? locationData.startDate.toDate() : 
                              (locationData.startDate ? new Date(locationData.startDate) : event.start),
                    endDate: locationData.endDate?.toDate ? locationData.endDate.toDate() : 
                            (locationData.endDate ? new Date(locationData.endDate) : event.actualEndDate),
                    isMultipleLocation: true,
                    locationIndex: index + 1,
                    totalLocations: event.locations.filter(loc => loc.location && loc.location.trim()).length
                  });
                }
              });
            } else {
              // Single location event - use as is from Zustand store
              transformedEvents.push({
                ...event,
                startDate: event.start,
                endDate: event.actualEndDate || event.end,
                isMultipleLocation: false
              });
            }
          });
          
          setTransformedEvents(transformedEvents);
          setFilteredEvents(transformedEvents);
        } else {
          toast.error("Failed to load events");
        }
      } catch (error) {
        console.error("Error loading events:", error);
        toast.error("Failed to load events");
      }
    };

    if (currentUser && userDepartment) {
      loadEvents();
    }
  }, [fetchAllEvents, currentUser, userDepartment]);

  // Filter and sort events based on search query, filters, and sorting
  useEffect(() => {
    // Use the transformedEvents as the base for filtering
    let filtered = [...transformedEvents];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(event => 
        event.title?.toLowerCase().includes(query) ||
        event.department?.toLowerCase().includes(query) ||
        event.location?.toLowerCase().includes(query) ||
        event.requestor?.toLowerCase().includes(query) ||
        event.status?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter.length > 0) {
      filtered = filtered.filter(event => 
        statusFilter.some(status => 
          event.status?.toLowerCase() === status.toLowerCase()
        )
      );
    }


    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case "title":
          aValue = a.title?.toLowerCase() || "";
          bValue = b.title?.toLowerCase() || "";
          break;
        case "department":
          aValue = a.department?.toLowerCase() || "";
          bValue = b.department?.toLowerCase() || "";
          break;
        case "status":
          aValue = a.status?.toLowerCase() || "";
          bValue = b.status?.toLowerCase() || "";
          break;
        case "startDate":
          aValue = a.startDate ? new Date(a.startDate).getTime() : 0;
          bValue = b.startDate ? new Date(b.startDate).getTime() : 0;
          break;
        case "createdAt":
        default:
          aValue = a.createdAt ? new Date(a.createdAt.toDate()).getTime() : 0;
          bValue = b.createdAt ? new Date(b.createdAt.toDate()).getTime() : 0;
          break;
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredEvents(filtered);
  }, [searchQuery, transformedEvents, statusFilter, sortBy, sortOrder]);

  // Get unique values for filters
  const getUniqueStatuses = () => {
    const statuses = transformedEvents.map(event => event.status).filter(Boolean);
    return [...new Set(statuses)];
  };


  // Clear all filters
  const clearAllFilters = () => {
    setStatusFilter([]);
    setSortBy("createdAt");
    setSortOrder("desc");
    setSearchQuery("");
  };

  // Format date for display
  const formatDate = (date) => {
    if (!date) return "N/A";
    try {
      return format(date, "MMM dd, yyyy");
    } catch (error) {
      return "Invalid Date";
    }
  };

  // Format date with time from timestamp
  const formatDateTime = (date, time) => {
    if (!date) return "N/A";
    
    // Handle invalid dates
    if (date instanceof Date && isNaN(date.getTime())) {
      return "N/A";
    }
    
    try {
      const validDate = date instanceof Date ? date : new Date(date);
      if (isNaN(validDate.getTime())) {
        return "N/A";
      }
      
      // Extract time from the date itself (since Firestore timestamps include time)
      const dateStr = format(validDate, "MMM dd, yyyy");
      const timeStr = format(validDate, "h:mm a");
      
      return `${dateStr} at ${timeStr}`;
    } catch (error) {
      return "N/A";
    }
  };

  // Skeleton loader for table rows
  const SkeletonRow = ({ index }) => (
    <tr className={cn(
      "border-b transition-colors",
      isDarkMode ? "border-slate-700/50 hover:bg-slate-800/30" : "border-gray-200 hover:bg-gray-50",
      // Zebra striping for skeleton rows
      index % 2 === 0 
        ? (isDarkMode ? "bg-slate-700/30" : "bg-gray-100")
        : (isDarkMode ? "bg-slate-800/40" : "bg-gray-50")
    )}>
      {/* Column 1 - Event Details */}
      <td className={cn(
        "p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 border-r",
        isDarkMode ? "border-slate-700/50" : "border-gray-200"
      )}>
        {/* Department */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-4 w-1/2 ml-7" />
        </div>
        {/* Event Title */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="h-5 w-3/4 ml-7" />
        </div>
        {/* Venue */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-4 w-2/3 ml-7" />
        </div>
        {/* Participants */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-4 w-16 ml-7" />
        </div>
        {/* VIP */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-4 w-12" />
          </div>
          <Skeleton className="h-4 w-16 ml-7" />
        </div>
        {/* VVIP */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-4 w-16 ml-7" />
        </div>
      </td>
      
      {/* Column 2 - Dates and Status */}
      <td className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-4 w-full ml-7" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-4 w-full ml-7" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-7 w-24 ml-7" />
        </div>
      </td>
    </tr>
  );

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
            "text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight mb-2",
            isDarkMode ? "text-white" : "text-gray-900"
          )}
        >
          Department Events
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={cn(
            "text-sm sm:text-base lg:text-lg",
            isDarkMode ? "text-gray-400" : "text-gray-500"
          )}
        >
          {userDepartment ? `Events from ${userDepartment} department and events you created` : "Loading your department events..."}
        </motion.p>
      </div>

      {/* Search Bar and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-6"
      >
        <div className="flex flex-col gap-4">
          {/* Search Bar */}
          <div className="relative w-full sm:max-w-md sm:ml-auto">
            <Search className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4",
              isDarkMode ? "text-gray-400" : "text-gray-500"
            )} />
            <Input
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "pl-10 h-10 sm:h-11 w-full",
                isDarkMode 
                  ? "bg-slate-900/50 border-slate-700 placeholder:text-gray-400" 
                  : "bg-white border-gray-200 placeholder:text-gray-500"
              )}
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchQuery("")}
                className={cn(
                  "absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7",
                  isDarkMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900"
                )}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Filters and Sorting */}
          <div className="flex flex-wrap gap-2 sm:gap-3 items-center justify-end">
            {/* Status Filter */}
            <div className="relative">
              <button
                onClick={() => setStatusPopoverOpen(!statusPopoverOpen)}
                className={cn(
                  "h-9 sm:h-10 px-3 sm:px-4 rounded-lg flex items-center justify-between gap-2 sm:gap-3 text-xs sm:text-sm font-medium transition-all duration-200 min-w-[100px] sm:min-w-[120px]",
                  isDarkMode 
                    ? "bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-600" 
                    : "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-sm",
                  statusFilter.length > 0 && (isDarkMode ? "ring-2 ring-blue-500/50" : "ring-2 ring-blue-500/30")
                )}
              >
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <span>
                    {statusFilter.length > 0 
                      ? `${statusFilter.length} Status${statusFilter.length > 1 ? 'es' : ''}`
                      : "Status"
                    }
                  </span>
                </div>
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  statusPopoverOpen && "rotate-180"
                )} />
              </button>
              
              {statusPopoverOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setStatusPopoverOpen(false)}
                  />
                  <div className={cn(
                    "absolute top-12 left-0 z-20 w-64 rounded-lg shadow-lg border overflow-hidden",
                    isDarkMode ? "bg-gray-800 border-gray-600" : "bg-white border-gray-200"
                  )}>
                    <div className={cn(
                      "p-3 border-b",
                      isDarkMode ? "border-gray-600" : "border-gray-100"
                    )}>
                      <input
                        type="text"
                        placeholder="Search status..."
                        className={cn(
                          "w-full px-3 py-2 rounded-md text-sm border-0 outline-none",
                          isDarkMode 
                            ? "bg-gray-700 text-gray-200 placeholder-gray-400" 
                            : "bg-gray-50 text-gray-900 placeholder-gray-500"
                        )}
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {getUniqueStatuses().map((status) => (
                        <div
                          key={status}
                          onClick={() => {
                            if (statusFilter.includes(status)) {
                              setStatusFilter(statusFilter.filter(s => s !== status));
                            } else {
                              setStatusFilter([...statusFilter, status]);
                            }
                          }}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors",
                            isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-50"
                          )}
                        >
                          <div className={cn(
                            "w-4 h-4 rounded border-2 flex items-center justify-center",
                            statusFilter.includes(status)
                              ? "bg-blue-500 border-blue-500"
                              : isDarkMode ? "border-gray-500" : "border-gray-300"
                          )}>
                            {statusFilter.includes(status) && (
                              <Check className="h-3 w-3 text-white" />
                            )}
                          </div>
                          <span className={cn(
                            "px-2 py-1 rounded-md text-xs font-medium",
                            statusColors[status] || (isDarkMode ? "bg-gray-600 text-gray-300" : "bg-gray-100 text-gray-700")
                          )}>
                            {status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>


            {/* Sort Dropdown */}
            <div className="relative">
              <button
                onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                className={cn(
                  "h-10 px-4 rounded-lg flex items-center justify-between gap-3 text-sm font-medium transition-all duration-200 min-w-[160px]",
                  isDarkMode 
                    ? "bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-600" 
                    : "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-sm"
                )}
              >
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4 text-gray-500" />
                  <span>
                    {sortBy === 'createdAt' && sortOrder === 'desc' && 'Newest First'}
                    {sortBy === 'createdAt' && sortOrder === 'asc' && 'Oldest First'}
                    {sortBy === 'title' && sortOrder === 'asc' && 'Title A-Z'}
                    {sortBy === 'title' && sortOrder === 'desc' && 'Title Z-A'}
                    {sortBy === 'department' && sortOrder === 'asc' && 'Department A-Z'}
                    {sortBy === 'department' && sortOrder === 'desc' && 'Department Z-A'}
                  </span>
                </div>
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  sortDropdownOpen && "rotate-180"
                )} />
              </button>
              
              {sortDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setSortDropdownOpen(false)}
                  />
                  <div className={cn(
                    "absolute top-12 right-0 z-20 w-48 rounded-lg shadow-lg border overflow-hidden",
                    isDarkMode ? "bg-gray-800 border-gray-600" : "bg-white border-gray-200"
                  )}>
                    {[
                      { value: 'createdAt-desc', label: 'Newest First', icon: SortDesc },
                      { value: 'createdAt-asc', label: 'Oldest First', icon: SortAsc },
                      { value: 'title-asc', label: 'Title A-Z', icon: SortAsc },
                      { value: 'title-desc', label: 'Title Z-A', icon: SortDesc },
                      { value: 'department-asc', label: 'Department A-Z', icon: SortAsc },
                      { value: 'department-desc', label: 'Department Z-A', icon: SortDesc }
                    ].map((option) => {
                      const IconComponent = option.icon;
                      const isActive = `${sortBy}-${sortOrder}` === option.value;
                      return (
                        <div
                          key={option.value}
                          onClick={() => {
                            const [field, order] = option.value.split('-');
                            setSortBy(field);
                            setSortOrder(order);
                            setSortDropdownOpen(false);
                          }}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors",
                            isActive && (isDarkMode ? "bg-blue-600/20" : "bg-blue-50"),
                            !isActive && (isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-50")
                          )}
                        >
                          <IconComponent className="h-4 w-4 text-gray-500" />
                          <span className={cn(
                            "text-sm",
                            isActive && "font-medium text-blue-600"
                          )}>
                            {option.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Clear Filters Button */}
            {(statusFilter.length > 0 || searchQuery || sortBy !== "createdAt" || sortOrder !== "desc") && (
              <button
                onClick={clearAllFilters}
                className={cn(
                  "h-10 px-3 rounded-lg flex items-center gap-2 text-sm font-medium transition-all duration-200",
                  isDarkMode 
                    ? "text-gray-400 hover:text-gray-200 hover:bg-gray-700" 
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                )}
              >
                <X className="h-4 w-4" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Events Count */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-6"
      >
        <p className={cn(
          "text-sm font-medium",
          isDarkMode ? "text-gray-300" : "text-gray-600"
        )}>
          {loading || !currentUser || !userDepartment ? "Loading..." : `${filteredEvents.length} event${filteredEvents.length !== 1 ? 's' : ''} found`}
        </p>
      </motion.div>

      {/* Events Table */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4 }}
        className={cn(
          "rounded-xl border overflow-hidden",
          isDarkMode ? "bg-slate-800/50 border-slate-700/50" : "bg-white border-gray-200"
        )}
      >
        {filteredEvents.length > 0 || loading || !currentUser || !userDepartment ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
            <tbody>
              {loading || !currentUser || !userDepartment ? (
                // Skeleton Loading
                Array.from({ length: 6 }).map((_, index) => (
                  <SkeletonRow key={index} index={index} />
                ))
              ) : (
                // Events Rows
                filteredEvents.map((event, index) => (
                  <motion.tr
                    key={event.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      "border-b transition-colors group",
                      isDarkMode 
                        ? "border-slate-700/50 hover:bg-slate-800/30" 
                        : "border-gray-200 hover:bg-gray-50",
                      index === filteredEvents.length - 1 && "border-b-0", // Remove border from last row
                      // Zebra striping
                      index % 2 === 0 
                        ? (isDarkMode ? "bg-slate-700/30" : "bg-gray-100")
                        : (isDarkMode ? "bg-slate-800/40" : "bg-gray-50")
                    )}
                  >
                    {/* Column 1 - Event Details */}
                    <td className={cn(
                      "p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 border-r align-top",
                      isDarkMode ? "border-slate-700/50" : "border-gray-200"
                    )}>
                      {/* Department */}
                      <div className="flex items-center gap-2">
                        <Building2 className={cn(
                          "h-5 w-5",
                          isDarkMode ? "text-gray-400" : "text-gray-600"
                        )} />
                        <span className={cn(
                          "text-sm sm:text-base font-bold",
                          isDarkMode ? "text-white" : "text-gray-900"
                        )}>
                          Department:
                        </span>
                        <span className={cn(
                          "text-sm sm:text-base",
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        )}>
                          {event.department || "No Department"}
                        </span>
                      </div>

                      {/* Event Title */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CalendarDays className={cn(
                            "h-5 w-5 flex-shrink-0",
                            isDarkMode ? "text-gray-400" : "text-gray-600"
                          )} />
                          <span className={cn(
                            "text-base font-bold flex-shrink-0",
                            isDarkMode ? "text-white" : "text-gray-900"
                          )}>
                            Event Title:
                          </span>
                          <span 
                            className={cn(
                              "text-base font-bold truncate min-w-0 max-w-xs",
                              isDarkMode ? "text-white" : "text-gray-900"
                            )}
                            title={event.title || "Untitled Event"} // Show full title on hover
                          >
                            {event.title || "Untitled Event"}
                          </span>
                        </div>
                        {event.isMultipleLocation && (
                          <p className={cn(
                            "text-sm ml-7",
                            isDarkMode ? "text-blue-400" : "text-blue-600"
                          )}>
                            Location {event.locationIndex} of {event.totalLocations}
                          </p>
                        )}
                      </div>

                      {/* Venue */}
                      <div className="flex items-center gap-2">
                        <MapPin className={cn(
                          "h-5 w-5",
                          isDarkMode ? "text-gray-400" : "text-gray-600"
                        )} />
                        <span className={cn(
                          "text-base font-bold",
                          isDarkMode ? "text-white" : "text-gray-900"
                        )}>
                          Venue:
                        </span>
                        <span className={cn(
                          "text-base",
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        )}>
                          {event.location || "TBD"}
                        </span>
                      </div>

                      {/* Participants */}
                      <div className="flex items-center gap-2">
                        <Users className={cn(
                          "h-5 w-5",
                          isDarkMode ? "text-gray-400" : "text-gray-600"
                        )} />
                        <span className={cn(
                          "text-base font-bold",
                          isDarkMode ? "text-white" : "text-gray-900"
                        )}>
                          Participants:
                        </span>
                        <span className={cn(
                          "text-base",
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        )}>
                          {event.participants || "N/A"}
                        </span>
                      </div>

                      {/* VIP */}
                      <div className="flex items-center gap-2">
                        <Users className={cn(
                          "h-5 w-5",
                          isDarkMode ? "text-amber-400" : "text-amber-600"
                        )} />
                        <span className={cn(
                          "text-base font-bold",
                          isDarkMode ? "text-white" : "text-gray-900"
                        )}>
                          VIP:
                        </span>
                        <span className={cn(
                          "text-base",
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        )}>
                          {event.vip || "N/A"}
                        </span>
                      </div>

                      {/* VVIP */}
                      <div className="flex items-center gap-2">
                        <Users className={cn(
                          "h-5 w-5",
                          isDarkMode ? "text-yellow-400" : "text-yellow-600"
                        )} />
                        <span className={cn(
                          "text-base font-bold",
                          isDarkMode ? "text-white" : "text-gray-900"
                        )}>
                          VVIP:
                        </span>
                        <span className={cn(
                          "text-base",
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        )}>
                          {event.vvip || "N/A"}
                        </span>
                      </div>
                    </td>

                    {/* Column 2 - Dates and Status */}
                    <td className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 align-top">
                      {/* Start Date */}
                      <div className="flex items-center gap-2">
                        <Calendar className={cn(
                          "h-5 w-5",
                          isDarkMode ? "text-gray-400" : "text-gray-600"
                        )} />
                        <span className={cn(
                          "text-base font-bold",
                          isDarkMode ? "text-white" : "text-gray-900"
                        )}>
                          Start Date:
                        </span>
                        <span className={cn(
                          "text-base",
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        )}>
                          {formatDateTime(event.startDate)}
                        </span>
                      </div>

                      {/* End Date */}
                      <div className="flex items-center gap-2">
                        <Calendar className={cn(
                          "h-5 w-5",
                          isDarkMode ? "text-gray-400" : "text-gray-600"
                        )} />
                        <span className={cn(
                          "text-base font-bold",
                          isDarkMode ? "text-white" : "text-gray-900"
                        )}>
                          End Date:
                        </span>
                        <span className={cn(
                          "text-base",
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        )}>
                          {formatDateTime(event.endDate)}
                        </span>
                      </div>

                      {/* Status */}
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "h-5 w-5 rounded-full flex items-center justify-center",
                          (event.status === "Approved" || event.status === "approved") ? (isDarkMode ? "bg-green-500/20" : "bg-green-100") :
                          (event.status === "Pending" || event.status === "pending") ? (isDarkMode ? "bg-amber-500/20" : "bg-amber-100") :
                          (event.status === "Rejected" || event.status === "rejected" || event.status === "Disapproved" || event.status === "disapproved") ? (isDarkMode ? "bg-red-500/20" : "bg-red-100") :
                          (isDarkMode ? "bg-blue-500/20" : "bg-blue-100")
                        )}>
                          <div className={cn(
                            "h-2.5 w-2.5 rounded-full",
                            (event.status === "Approved" || event.status === "approved") ? "bg-green-500" :
                            (event.status === "Pending" || event.status === "pending") ? "bg-amber-500" :
                            (event.status === "Rejected" || event.status === "rejected" || event.status === "Disapproved" || event.status === "disapproved") ? "bg-red-500" :
                            "bg-blue-500"
                          )} />
                        </div>
                        <span className={cn(
                          "text-base font-bold",
                          isDarkMode ? "text-white" : "text-gray-900"
                        )}>
                          Status:
                        </span>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "px-3 py-1.5 text-sm font-semibold border",
                            statusColors[event.status] || (isDarkMode ? "bg-gray-500/20 text-gray-300" : "bg-gray-100 text-gray-700")
                          )}
                        >
                          {event.status || "Unknown"}
                        </Badge>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        ) : (
          // Empty State
          <div className={cn(
            "text-center py-12",
            isDarkMode ? "bg-slate-800/30" : "bg-gray-50"
          )}>
            <CalendarDays className={cn(
              "h-12 w-12 mx-auto mb-4",
              isDarkMode ? "text-gray-500" : "text-gray-400"
            )} />
            <h3 className={cn(
              "text-lg font-semibold mb-2",
              isDarkMode ? "text-gray-300" : "text-gray-600"
            )}>
              No events found
            </h3>
            <p className={cn(
              "text-sm",
              isDarkMode ? "text-gray-400" : "text-gray-500"
            )}>
              {searchQuery ? `No events match "${searchQuery}"` : "No events have been created yet"}
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default AllEventsNew;
