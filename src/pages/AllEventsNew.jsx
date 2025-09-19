import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { db } from "@/lib/firebase/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { format } from "date-fns";
import { toast } from "sonner";

const AllEventsNew = () => {
  const { isDarkMode } = useTheme();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredEvents, setFilteredEvents] = useState([]);
  
  // Filter and Sort states
  const [statusFilter, setStatusFilter] = useState([]);
  const [departmentFilter, setDepartmentFilter] = useState([]);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  
  // Popover states
  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);
  const [departmentPopoverOpen, setDepartmentPopoverOpen] = useState(false);

  // Status color mapping - handle both lowercase and capitalized versions
  const statusColors = {
    "Pending": isDarkMode ? "bg-amber-500/30 text-amber-200 border-amber-400/50" : "bg-amber-100 text-amber-800 border-amber-300",
    "pending": isDarkMode ? "bg-amber-500/30 text-amber-200 border-amber-400/50" : "bg-amber-100 text-amber-800 border-amber-300",
    "Approved": isDarkMode ? "bg-emerald-500/30 text-emerald-200 border-emerald-400/50" : "bg-emerald-100 text-emerald-800 border-emerald-300",
    "approved": isDarkMode ? "bg-emerald-500/30 text-emerald-200 border-emerald-400/50" : "bg-emerald-100 text-emerald-800 border-emerald-300",
    "Rejected": isDarkMode ? "bg-rose-500/30 text-rose-200 border-rose-400/50" : "bg-rose-100 text-rose-800 border-rose-300",
    "rejected": isDarkMode ? "bg-rose-500/30 text-rose-200 border-rose-400/50" : "bg-rose-100 text-rose-800 border-rose-300",
    "In Review": isDarkMode ? "bg-blue-500/30 text-blue-200 border-blue-400/50" : "bg-blue-100 text-blue-800 border-blue-300",
    "in review": isDarkMode ? "bg-blue-500/30 text-blue-200 border-blue-400/50" : "bg-blue-100 text-blue-800 border-blue-300",
  };

  // Fetch all events from eventRequests collection
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const eventsRef = collection(db, "eventRequests");
        const q = query(eventsRef, orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        
        const eventsData = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          
          // Handle multiple locations - check both 'locations' and 'multipleLocations' arrays
          const locationsArray = data.locations || data.multipleLocations;
          
          if (data.isMultipleLocations && locationsArray && Array.isArray(locationsArray) && locationsArray.length > 0) {
            // Create separate entries for each location
            locationsArray.forEach((locationData, index) => {
              if (locationData.location && locationData.location.trim()) {
                eventsData.push({
                  id: `${doc.id}_location_${index}`,
                  originalId: doc.id,
                  ...data,
                  location: locationData.location,
                  // Handle Firestore timestamps for multiple locations
                  startDate: locationData.startDate?.toDate ? locationData.startDate.toDate() : 
                            (locationData.startDate ? new Date(locationData.startDate) : 
                            (data.startDate?.toDate ? data.startDate.toDate() : 
                            (data.startDate ? new Date(data.startDate) : null))),
                  endDate: locationData.endDate?.toDate ? locationData.endDate.toDate() : 
                          (locationData.endDate ? new Date(locationData.endDate) : 
                          (data.endDate?.toDate ? data.endDate.toDate() : 
                          (data.endDate ? new Date(data.endDate) : null))),
                  isMultipleLocation: true,
                  locationIndex: index + 1,
                  totalLocations: locationsArray.filter(loc => loc.location && loc.location.trim()).length
                });
              }
            });
          } else {
            // Single location event
            eventsData.push({
              id: doc.id,
              ...data,
              // Handle Firestore timestamps for single location
              startDate: data.startDate?.toDate ? data.startDate.toDate() : 
                        (data.startDate ? new Date(data.startDate) : null),
              endDate: data.endDate?.toDate ? data.endDate.toDate() : 
                      (data.endDate ? new Date(data.endDate) : null),
              isMultipleLocation: false
            });
          }
        });
        
        setEvents(eventsData);
        setFilteredEvents(eventsData);
      } catch (error) {
        console.error("Error fetching events:", error);
        toast.error("Failed to load events");
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  // Filter and sort events based on search query, filters, and sorting
  useEffect(() => {
    let filtered = [...events];

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

    // Apply department filter
    if (departmentFilter.length > 0) {
      filtered = filtered.filter(event => 
        departmentFilter.includes(event.department)
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
  }, [searchQuery, events, statusFilter, departmentFilter, sortBy, sortOrder]);

  // Get unique values for filters
  const getUniqueStatuses = () => {
    const statuses = events.map(event => event.status).filter(Boolean);
    return [...new Set(statuses)];
  };

  const getUniqueDepartments = () => {
    const departments = events.map(event => event.department).filter(Boolean);
    return [...new Set(departments)];
  };

  // Clear all filters
  const clearAllFilters = () => {
    setStatusFilter([]);
    setDepartmentFilter([]);
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
        "p-6 space-y-4 border-r",
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
      <td className="p-6 space-y-4">
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
      className="max-w-[1400px] mx-auto px-8 py-8"
    >
      {/* Header */}
      <div className="mb-8">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "text-4xl font-bold tracking-tight mb-2",
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
            "text-lg",
            isDarkMode ? "text-gray-400" : "text-gray-500"
          )}
        >
          Comprehensive overview of all event requests and their details
        </motion.p>
      </div>

      {/* Search Bar and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-6"
      >
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Search Bar */}
          <div className="relative max-w-md flex-1">
            <Search className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4",
              isDarkMode ? "text-gray-400" : "text-gray-500"
            )} />
            <Input
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "pl-10 h-11",
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
          <div className="flex gap-3 items-center">
            {/* Status Filter */}
            <Popover open={statusPopoverOpen} onOpenChange={setStatusPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={statusPopoverOpen}
                  className={cn(
                    "h-10 justify-between font-normal border-0 shadow-sm hover:shadow-md transition-shadow",
                    isDarkMode ? "bg-slate-800 text-white hover:bg-slate-700" : "bg-white text-gray-900 hover:bg-gray-50",
                    statusFilter.length > 0 && "ring-2 ring-primary ring-offset-1"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {statusFilter.length > 0 
                        ? `${statusFilter.length} status${statusFilter.length > 1 ? 'es' : ''}`
                        : "Status"
                      }
                    </span>
                  </div>
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className={cn(
                "w-64 p-0 shadow-lg",
                isDarkMode ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
              )} align="end">
                <Command className={cn(
                  "border-0",
                  isDarkMode ? "bg-slate-800" : "bg-white"
                )}>
                  <CommandInput placeholder="Search status..." className={cn(
                    "h-9 border-0",
                    isDarkMode ? "bg-slate-800" : "bg-white"
                  )} />
                  <CommandList className="border-0">
                    <CommandEmpty>No status found.</CommandEmpty>
                    <CommandGroup className="border-0">
                      {getUniqueStatuses().map((status) => (
                        <CommandItem
                          key={status}
                          value={status}
                          onSelect={() => {
                            if (statusFilter.includes(status)) {
                              setStatusFilter(statusFilter.filter(s => s !== status));
                            } else {
                              setStatusFilter([...statusFilter, status]);
                            }
                          }}
                          className="flex items-center gap-2 px-2 py-1.5"
                        >
                          <div className={cn(
                            "flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                            statusFilter.includes(status)
                              ? "bg-primary text-primary-foreground"
                              : "opacity-50 [&_svg]:invisible"
                          )}>
                            <Check className="h-3 w-3" />
                          </div>
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-xs",
                              statusColors[status] || (isDarkMode ? "bg-muted text-muted-foreground" : "bg-muted text-muted-foreground")
                            )}
                          >
                            {status}
                          </Badge>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Department Filter */}
            <Popover open={departmentPopoverOpen} onOpenChange={setDepartmentPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={departmentPopoverOpen}
                  className={cn(
                    "h-10 justify-between font-normal border-0 shadow-sm hover:shadow-md transition-shadow",
                    isDarkMode ? "bg-slate-800 text-white hover:bg-slate-700" : "bg-white text-gray-900 hover:bg-gray-50",
                    departmentFilter.length > 0 && "ring-2 ring-primary ring-offset-1"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {departmentFilter.length > 0 
                        ? `${departmentFilter.length} dept${departmentFilter.length > 1 ? 's' : ''}`
                        : "Department"
                      }
                    </span>
                  </div>
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className={cn(
                "w-64 p-0 shadow-lg",
                isDarkMode ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
              )} align="end">
                <Command className={cn(
                  "border-0",
                  isDarkMode ? "bg-slate-800" : "bg-white"
                )}>
                  <CommandInput placeholder="Search department..." className={cn(
                    "h-9 border-0",
                    isDarkMode ? "bg-slate-800" : "bg-white"
                  )} />
                  <CommandList className="border-0">
                    <CommandEmpty>No department found.</CommandEmpty>
                    <CommandGroup className="border-0">
                      {getUniqueDepartments().map((department) => (
                        <CommandItem
                          key={department}
                          value={department}
                          onSelect={() => {
                            if (departmentFilter.includes(department)) {
                              setDepartmentFilter(departmentFilter.filter(d => d !== department));
                            } else {
                              setDepartmentFilter([...departmentFilter, department]);
                            }
                          }}
                          className="flex items-center gap-2 px-2 py-1.5"
                        >
                          <div className={cn(
                            "flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                            departmentFilter.includes(department)
                              ? "bg-primary text-primary-foreground"
                              : "opacity-50 [&_svg]:invisible"
                          )}>
                            <Check className="h-3 w-3" />
                          </div>
                          <span className="text-sm">{department}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Sort Dropdown */}
            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
              const [field, order] = value.split('-');
              setSortBy(field);
              setSortOrder(order);
            }}>
              <SelectTrigger className={cn(
                "h-10 w-[160px] font-normal border-0 shadow-sm hover:shadow-md transition-shadow",
                isDarkMode ? "bg-slate-800 text-white hover:bg-slate-700" : "bg-white text-gray-900 hover:bg-gray-50"
              )}>
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Sort by" />
                </div>
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="createdAt-desc">
                  <div className="flex items-center gap-2">
                    <SortDesc className="h-4 w-4" />
                    <span>Newest First</span>
                  </div>
                </SelectItem>
                <SelectItem value="createdAt-asc">
                  <div className="flex items-center gap-2">
                    <SortAsc className="h-4 w-4" />
                    <span>Oldest First</span>
                  </div>
                </SelectItem>
                <SelectItem value="title-asc">
                  <div className="flex items-center gap-2">
                    <SortAsc className="h-4 w-4" />
                    <span>Title A-Z</span>
                  </div>
                </SelectItem>
                <SelectItem value="title-desc">
                  <div className="flex items-center gap-2">
                    <SortDesc className="h-4 w-4" />
                    <span>Title Z-A</span>
                  </div>
                </SelectItem>
                <SelectItem value="department-asc">
                  <div className="flex items-center gap-2">
                    <SortAsc className="h-4 w-4" />
                    <span>Department A-Z</span>
                  </div>
                </SelectItem>
                <SelectItem value="department-desc">
                  <div className="flex items-center gap-2">
                    <SortDesc className="h-4 w-4" />
                    <span>Department Z-A</span>
                  </div>
                </SelectItem>
                <SelectItem value="startDate-asc">
                  <div className="flex items-center gap-2">
                    <SortAsc className="h-4 w-4" />
                    <span>Start Date (Early)</span>
                  </div>
                </SelectItem>
                <SelectItem value="startDate-desc">
                  <div className="flex items-center gap-2">
                    <SortDesc className="h-4 w-4" />
                    <span>Start Date (Late)</span>
                  </div>
                </SelectItem>
                <SelectItem value="status-asc">
                  <div className="flex items-center gap-2">
                    <SortAsc className="h-4 w-4" />
                    <span>Status A-Z</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Clear Filters Button */}
            {(statusFilter.length > 0 || departmentFilter.length > 0 || searchQuery || sortBy !== "createdAt" || sortOrder !== "desc") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-10 px-3 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                <span className="text-sm">Clear</span>
              </Button>
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
          {loading ? "Loading..." : `${filteredEvents.length} event${filteredEvents.length !== 1 ? 's' : ''} found`}
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
        {filteredEvents.length > 0 || loading ? (
          <table className="w-full">
            <tbody>
              {loading ? (
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
                      "p-6 space-y-4 border-r align-top",
                      isDarkMode ? "border-slate-700/50" : "border-gray-200"
                    )}>
                      {/* Department */}
                      <div className="flex items-center gap-2">
                        <Building2 className={cn(
                          "h-5 w-5",
                          isDarkMode ? "text-gray-400" : "text-gray-600"
                        )} />
                        <span className={cn(
                          "text-base font-bold",
                          isDarkMode ? "text-white" : "text-gray-900"
                        )}>
                          Department:
                        </span>
                        <span className={cn(
                          "text-base",
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        )}>
                          {event.department || "No Department"}
                        </span>
                      </div>

                      {/* Event Title */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CalendarDays className={cn(
                            "h-5 w-5",
                            isDarkMode ? "text-gray-400" : "text-gray-600"
                          )} />
                          <span className={cn(
                            "text-base font-bold",
                            isDarkMode ? "text-white" : "text-gray-900"
                          )}>
                            Event Title:
                          </span>
                          <span className={cn(
                            "text-base font-bold",
                            isDarkMode ? "text-white" : "text-gray-900"
                          )}>
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
                    <td className="p-6 space-y-4 align-top">
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
                          (event.status === "Approved" || event.status === "approved") ? (isDarkMode ? "bg-emerald-500/20" : "bg-emerald-100") :
                          (event.status === "Pending" || event.status === "pending") ? (isDarkMode ? "bg-amber-500/20" : "bg-amber-100") :
                          (event.status === "Rejected" || event.status === "rejected") ? (isDarkMode ? "bg-rose-500/20" : "bg-rose-100") :
                          (isDarkMode ? "bg-blue-500/20" : "bg-blue-100")
                        )}>
                          <div className={cn(
                            "h-2.5 w-2.5 rounded-full",
                            (event.status === "Approved" || event.status === "approved") ? "bg-emerald-500" :
                            (event.status === "Pending" || event.status === "pending") ? "bg-amber-500" :
                            (event.status === "Rejected" || event.status === "rejected") ? "bg-rose-500" :
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
