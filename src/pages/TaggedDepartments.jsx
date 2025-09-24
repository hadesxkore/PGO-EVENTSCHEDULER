import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";
import { 
  FileText, 
  Calendar, 
  Clock, 
  Users, 
  MapPin, 
  ArrowLeft, 
  CalendarDays, 
  Building2, 
  Target, 
  UserCheck, 
  AlertCircle, 
  
  CheckCircle2, 
  UserPlus, 
  ChevronRight,
  ArrowRight,
  Search,
  X
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { useLocation, useNavigate } from "react-router-dom";
import { auth } from "@/lib/firebase/firebase";
import { db } from "@/lib/firebase/firebase";
import { doc, getDoc } from 'firebase/firestore';
import useEventStore from "@/store/eventStore";
import useMessageStore from "@/store/messageStore";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const TaggedDepartments = () => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [events, setEvents] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState(location.state?.selectedTab || "created");

  // Get message store actions
  const { usersWhoTaggedMe, setUsersWhoTaggedMe } = useMessageStore();

  // Reset badge count when component mounts
  useEffect(() => {
    setUsersWhoTaggedMe([]);
  }, [setUsersWhoTaggedMe]);

  // Fetch tagged departments events using Zustand
  useEffect(() => {
    const fetchTaggedEvents = async () => {
      setLoading(true);
      try {
        // Get current user's document to get their department
        const user = auth.currentUser;
        if (!user) {
          throw new Error("User not authenticated");
        }

        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (!userDocSnap.exists()) {
          throw new Error("User not found");
        }
        const userData = userDocSnap.data();
        const userDepartment = userData.department;

        // Use Zustand store to get all events (with caching)
        const result = await useEventStore.getState().fetchAllEvents();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch events');
        }

        // Filter events where user's department is tagged OR where user has tagged others
        const taggedEvents = result.events
          .map(event => {
            const departmentRequirements = event.departmentRequirements || [];

            // Case 1: User's department is tagged in this event
            const taggedDept = departmentRequirements.find(
              dept => dept.departmentName === userDepartment
            );

            if (taggedDept && event.userId !== user.uid) {
              return {
                id: event.id,
                title: event.title,
                department: event.department,
                startDate: event.startDate,
                endDate: event.endDate,
                date: event.date,
                start: event.start, // EventStore transformed field
                actualEndDate: event.actualEndDate, // EventStore transformed field
                recentActivity: event.recentActivity || [], // Include recent activity
                location: event.location,
                locations: event.locations,
                isMultipleLocations: event.isMultipleLocations,
                participants: event.participants,
                tagType: 'received',
                requirements: taggedDept.requirements || []
              };
            }

            // Case 2: User created this event and tagged other departments
            if (event.userId === user.uid && departmentRequirements.length > 0) {
              // Flatten all requirements from all departments for display
              const allRequirements = departmentRequirements.reduce((acc, dept) => {
                if (dept.requirements && dept.requirements.length > 0) {
                  // Add department name prefix to each requirement for clarity
                  const deptRequirements = dept.requirements.map(req => {
                    return {
                      name: `${dept.departmentName}: ${req.name || req}`,
                      note: req.note || null,
                      departmentName: dept.departmentName,
                      originalReq: req
                    };
                  });
                  return [...acc, ...deptRequirements];
                }
                return acc;
              }, []);
              
              return {
                id: event.id,
                title: event.title,
                department: event.department,
                startDate: event.startDate,
                endDate: event.endDate,
                date: event.date,
                start: event.start, // EventStore transformed field
                actualEndDate: event.actualEndDate, // EventStore transformed field
                recentActivity: event.recentActivity || [], // Include recent activity
                location: event.location,
                locations: event.locations,
                isMultipleLocations: event.isMultipleLocations,
                participants: event.participants,
                tagType: 'sent',
                requirements: allRequirements
              };
            }

            return null;
          })
          .filter(event => event !== null);

        setEvents(taggedEvents);
        setError(null);
      } catch (err) {
        setError('Failed to fetch tagged events');
        toast.error('Failed to fetch tagged events');
      } finally {
        setLoading(false);
      }
    };

    fetchTaggedEvents();
  }, []);

  // Show error toast if there's an error
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  // Helper function to get location display text
  const getLocationDisplay = (event) => {
    if (event.isMultipleLocations && event.locations && event.locations.length > 0) {
      const validLocations = event.locations.filter(loc => loc.location && loc.location.trim());
      if (validLocations.length === 1) {
        return validLocations[0].location;
      } else if (validLocations.length > 1) {
        return `${validLocations.length} locations`;
      }
    }
    return event.location || 'TBD';
  };

  // Helper function to get date display for multiple locations
  const getDateDisplay = (event) => {
    if (event.isMultipleLocations && event.locations && event.locations.length > 0) {
      const validLocations = event.locations.filter(loc => loc.startDate);
      if (validLocations.length > 0) {
        // Show the earliest start date
        const earliestDate = validLocations.reduce((earliest, loc) => {
          const locDate = loc.startDate?.toDate ? loc.startDate.toDate() : new Date(loc.startDate);
          const earliestDate = earliest?.toDate ? earliest.toDate() : new Date(earliest);
          return locDate < earliestDate ? loc.startDate : earliest;
        }, validLocations[0].startDate);
        
        const dateObj = earliestDate?.toDate ? earliestDate.toDate() : new Date(earliestDate);
        return format(dateObj, "MMM d");
      }
    }
    
    // Try to get from recentActivity first
    if (event.recentActivity && event.recentActivity.length > 0) {
      const startDateActivity = event.recentActivity
        .filter(activity => activity.type === 'startDateTime')
        .sort((a, b) => (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0))[0];
      
      if (startDateActivity && startDateActivity.newValue) {
        try {
          const date = new Date(startDateActivity.newValue);
          if (!isNaN(date.getTime())) {
            return format(date, "MMM d");
          }
        } catch (e) {
          // Continue to fallback options
        }
      }
    }
    
    // Fallback to eventStore transformed fields
    if (event.start) {
      return format(event.start, "MMM d");
    }
    
    // Fallback to direct startDate field
    if (event.startDate?.toDate) {
      return format(event.startDate.toDate(), "MMM d");
    }
    
    if (event.startDate) {
      try {
        const date = new Date(event.startDate);
        if (!isNaN(date.getTime())) {
          return format(date, "MMM d");
        }
      } catch (e) {
        // Continue to TBD
      }
    }
    
    return 'TBD';
  };

  // Filter events based on search query
  const filterEvents = (eventsList, query) => {
    if (!query.trim()) return eventsList;
    
    const searchTerm = query.toLowerCase().trim();
    return eventsList.filter(event => {
      // Search in title
      if (event.title?.toLowerCase().includes(searchTerm)) return true;
      
      // Search in department
      if (event.department?.toLowerCase().includes(searchTerm)) return true;
      
      // Search in location (single location)
      if (event.location?.toLowerCase().includes(searchTerm)) return true;
      
      // Search in multiple locations
      if (event.isMultipleLocations && event.locations) {
        return event.locations.some(loc => 
          loc.location?.toLowerCase().includes(searchTerm)
        );
      }
      
      return false;
    });
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };



  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={cn(
          "min-h-screen rounded-lg",
          isDarkMode ? "bg-slate-950" : "bg-white"
        )}
      >
        {/* Simple Header */}
        <div className={cn(
          "sticky top-0 z-50 w-full border-b",
          isDarkMode 
            ? "bg-slate-950 border-slate-800" 
            : "bg-white border-slate-200"
        )}>
          <div className="container flex h-16 items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className={cn(
                "mr-4",
                isDarkMode 
                  ? "hover:bg-slate-800 text-slate-400 hover:text-white" 
                  : "hover:bg-slate-100 text-slate-600 hover:text-slate-900"
              )}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                isDarkMode 
                  ? "bg-blue-500/20" 
                  : "bg-blue-50"
              )}>
                <Building2 className={cn(
                  "h-5 w-5",
                  isDarkMode ? "text-blue-400" : "text-blue-600"
                )} />
              </div>
              
              <div>
                <h1 className={cn(
                  "text-lg font-semibold",
                  isDarkMode ? "text-white" : "text-slate-900"
                )}>
                  Tagged Departments
                </h1>
                <p className={cn(
                  "text-sm",
                  isDarkMode ? "text-slate-400" : "text-slate-500"
                )}>
                  Department collaboration events
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Simple Title Section */}
        <div className="container py-8">
          <div className="text-center">
            <h2 className={cn(
              "text-2xl font-bold mb-2",
              isDarkMode ? "text-white" : "text-slate-900"
            )}>
              Department Events
            </h2>
            <p className={cn(
              "text-base",
              isDarkMode ? "text-slate-400" : "text-slate-600"
            )}>
              View and manage collaborative events
            </p>
          </div>
        </div>

      {/* Events List */}
      {!selectedEvent && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="container mt-6"
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-6xl mx-auto">
            <TabsList className={cn(
              "grid w-full grid-cols-2 mb-6 p-1 rounded-lg h-auto",
              isDarkMode 
                ? "bg-slate-800" 
                : "bg-slate-100"
            )}>
              <TabsTrigger 
                value="created" 
                className={cn(
                  "py-3 px-4 font-medium transition-all duration-200 rounded-md h-full flex items-center justify-center",
                  isDarkMode 
                    ? "data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-300 hover:text-slate-100 hover:bg-slate-700" 
                    : "data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-700 hover:text-slate-900 hover:bg-slate-200"
                )}
              >
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">Created Events</span>
                </div>
              </TabsTrigger>
              <TabsTrigger 
                value="tagged" 
                className={cn(
                  "py-3 px-4 font-medium transition-all duration-200 rounded-md h-full flex items-center justify-center",
                  isDarkMode 
                    ? "data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-300 hover:text-slate-100 hover:bg-slate-700" 
                    : "data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-700 hover:text-slate-900 hover:bg-slate-200"
                )}
              >
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">Tagged Events</span>
                  {events.filter(event => event.tagType === 'received').length > 0 && (
                    <span className={cn(
                      "ml-1 min-w-[20px] h-5 rounded-full px-1.5 text-xs font-bold flex items-center justify-center flex-shrink-0",
                      "bg-blue-600 text-white"
                    )}>
                      {events.filter(event => event.tagType === 'received').length}
                    </span>
                  )}
                </div>
              </TabsTrigger>
            </TabsList>

            {/* Search Input */}
            <div className="mb-6">
              <div className="relative max-w-md">
                <Search className={cn(
                  "absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4",
                  isDarkMode ? "text-slate-400" : "text-slate-500"
                )} />
                <input
                  type="text"
                  placeholder={`Search ${activeTab === 'created' ? 'created' : 'tagged'} events...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn(
                    "w-full pl-10 pr-10 py-2.5 rounded-lg border text-sm transition-colors",
                    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                    isDarkMode 
                      ? "bg-slate-800 border-slate-700 text-white placeholder-slate-400" 
                      : "bg-white border-slate-300 text-slate-900 placeholder-slate-500"
                  )}
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSearchQuery("")}
                    className={cn(
                      "absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6",
                      isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900"
                    )}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className={cn(
                  "h-8 w-8 animate-spin mb-4",
                  isDarkMode ? "text-blue-400" : "text-blue-600"
                )} />
                <p className={cn(
                  "text-base font-medium",
                  isDarkMode ? "text-slate-300" : "text-slate-700"
                )}>
                  Loading events...
                </p>
              </div>
            ) : (
              <>
                <TabsContent value="created" className="space-y-6">
                  {(() => {
                    const createdEvents = events.filter(event => event.tagType === 'sent');
                    const filteredEvents = filterEvents(createdEvents, searchQuery);
                    
                    if (createdEvents.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center py-12">
                          <AlertCircle className={cn(
                            "h-12 w-12",
                            isDarkMode ? "text-slate-600" : "text-slate-300"
                          )} />
                          <h3 className={cn(
                            "mt-4 text-lg font-medium",
                            isDarkMode ? "text-slate-300" : "text-slate-700"
                          )}>No Created Events</h3>
                          <p className={cn(
                            "mt-2 text-sm text-center",
                            isDarkMode ? "text-slate-400" : "text-slate-500"
                          )}>
                            You haven't created any events that tag other departments.
                          </p>
                        </div>
                      );
                    }

                    if (filteredEvents.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center py-12">
                          <Search className={cn(
                            "h-12 w-12",
                            isDarkMode ? "text-slate-600" : "text-slate-300"
                          )} />
                          <h3 className={cn(
                            "mt-4 text-lg font-medium",
                            isDarkMode ? "text-slate-300" : "text-slate-700"
                          )}>No Results Found</h3>
                          <p className={cn(
                            "mt-2 text-sm text-center",
                            isDarkMode ? "text-slate-400" : "text-slate-500"
                          )}>
                            No created events match "{searchQuery}". Try a different search term.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-6 py-4">
                        {filteredEvents.map((event) => (
                
                          <motion.div
                            key={event.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ y: -4 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => setSelectedEvent(event)}
                            className="cursor-pointer"
                          >
                            <Card className={cn(
                              "border transition-all duration-200 hover:shadow-lg",
                              isDarkMode 
                                ? "bg-slate-900 border-slate-700 hover:border-blue-500/50" 
                                : "bg-white border-slate-200 hover:border-blue-300"
                            )}>
                              <CardHeader className="pb-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-3">
                                      <div className={cn(
                                        "p-2 rounded-lg",
                                        isDarkMode 
                                          ? "bg-blue-500/20" 
                                          : "bg-blue-50"
                                      )}>
                                        <Building2 className={cn(
                                          "h-4 w-4",
                                          isDarkMode ? "text-blue-400" : "text-blue-600"
                                        )} />
                                      </div>
                                      <div>
                                        <CardTitle className={cn(
                                          "text-lg font-semibold",
                                          isDarkMode ? "text-white" : "text-slate-900"
                                        )}>
                                          {event.title}
                                        </CardTitle>
                                        <CardDescription className={cn(
                                          "text-sm mt-1",
                                          isDarkMode ? "text-slate-400" : "text-slate-500"
                                        )}>
                                          {event.department}
                                        </CardDescription>
                                      </div>
                                    </div>
                                    
                                    <Badge 
                                      className={cn(
                                        "w-fit font-medium",
                                        event.tagType === 'received' 
                                          ? "bg-blue-600 text-white hover:bg-blue-700" 
                                          : "bg-slate-600 text-white hover:bg-slate-700"
                                      )}
                                    >
                                      {event.tagType === 'received' ? 'Tagged Event' : 'Created Event'}
                                    </Badge>
                                  </div>
                                  
                                  <ArrowRight className={cn(
                                    "h-5 w-5 opacity-50",
                                    isDarkMode ? "text-slate-400" : "text-slate-500"
                                  )} />
                                </div>
                              </CardHeader>
                              
                              <CardContent>
                                <div className="space-y-4">
                                  {/* Event Info Grid */}
                                  <div className="grid grid-cols-3 gap-4 text-sm">
                                    <div className="flex items-center gap-2">
                                      <CalendarDays className={cn(
                                        "h-4 w-4",
                                        isDarkMode ? "text-blue-400" : "text-blue-600"
                                      )} />
                                      <span className={cn(
                                        "font-medium",
                                        isDarkMode ? "text-slate-300" : "text-slate-700"
                                      )}>
                                        {getDateDisplay(event)}
                                      </span>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                      <MapPin className={cn(
                                        "h-4 w-4",
                                        isDarkMode ? "text-blue-400" : "text-blue-600"
                                      )} />
                                      <span className={cn(
                                        "font-medium truncate",
                                        isDarkMode ? "text-slate-300" : "text-slate-700"
                                      )}>
                                        {getLocationDisplay(event)}
                                      </span>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                      <Users className={cn(
                                        "h-4 w-4",
                                        isDarkMode ? "text-blue-400" : "text-blue-600"
                                      )} />
                                      <span className={cn(
                                        "font-medium",
                                        isDarkMode ? "text-slate-300" : "text-slate-700"
                                      )}>
                                        {event.participants || '0'}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  {/* Requirements */}
                                  {event.requirements && event.requirements.length > 0 && (
                                    <div>
                                      <div className="flex flex-wrap gap-2">
                                        {event.requirements.slice(0, 2).map((req, reqIndex) => (
                                          <Badge
                                            key={reqIndex}
                                            variant="outline"
                                            className={cn(
                                              "text-xs",
                                              isDarkMode 
                                                ? "border-slate-600 text-slate-300" 
                                                : "border-slate-300 text-slate-600"
                                            )}
                                          >
                                            {typeof req === 'string' ? req : req.name}
                                          </Badge>
                                        ))}
                                        {event.requirements.length > 2 && (
                                          <Badge
                                            variant="outline"
                                            className={cn(
                                              "text-xs",
                                              isDarkMode 
                                                ? "border-slate-600 text-slate-400" 
                                                : "border-slate-300 text-slate-500"
                                            )}
                                          >
                                            +{event.requirements.length - 2} more
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </div>
                    );
                  })()}
                </TabsContent>

                <TabsContent value="tagged" className="space-y-6">
                  {(() => {
                    const taggedEvents = events.filter(event => event.tagType === 'received');
                    const filteredEvents = filterEvents(taggedEvents, searchQuery);
                    
                    if (taggedEvents.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center py-12">
                          <AlertCircle className={cn(
                            "h-12 w-12",
                            isDarkMode ? "text-slate-600" : "text-slate-300"
                          )} />
                          <h3 className={cn(
                            "mt-4 text-lg font-medium",
                            isDarkMode ? "text-slate-300" : "text-slate-700"
                          )}>No Tagged Events</h3>
                          <p className={cn(
                            "mt-2 text-sm text-center",
                            isDarkMode ? "text-slate-400" : "text-slate-500"
                          )}>
                            There are no events where your department has been tagged.
                          </p>
                        </div>
                      );
                    }

                    if (filteredEvents.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center py-12">
                          <Search className={cn(
                            "h-12 w-12",
                            isDarkMode ? "text-slate-600" : "text-slate-300"
                          )} />
                          <h3 className={cn(
                            "mt-4 text-lg font-medium",
                            isDarkMode ? "text-slate-300" : "text-slate-700"
                          )}>No Results Found</h3>
                          <p className={cn(
                            "mt-2 text-sm text-center",
                            isDarkMode ? "text-slate-400" : "text-slate-500"
                          )}>
                            No tagged events match "{searchQuery}". Try a different search term.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-6 py-4">
                        {filteredEvents.map((event) => (
                          <motion.div
                            key={event.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ y: -4 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => setSelectedEvent(event)}
                            className="cursor-pointer"
                          >
                            <Card className={cn(
                              "border transition-all duration-200 hover:shadow-lg",
                              isDarkMode 
                                ? "bg-slate-900 border-slate-700 hover:border-blue-500/50" 
                                : "bg-white border-slate-200 hover:border-blue-300"
                            )}>
                              <CardHeader className="pb-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-3">
                                      <div className={cn(
                                        "p-2 rounded-lg",
                                        isDarkMode 
                                          ? "bg-blue-500/20" 
                                          : "bg-blue-50"
                                      )}>
                                        <Building2 className={cn(
                                          "h-4 w-4",
                                          isDarkMode ? "text-blue-400" : "text-blue-600"
                                        )} />
                                      </div>
                                      <div>
                                        <CardTitle className={cn(
                                          "text-lg font-semibold",
                                          isDarkMode ? "text-white" : "text-slate-900"
                                        )}>
                                          {event.title}
                                        </CardTitle>
                                        <CardDescription className={cn(
                                          "text-sm mt-1",
                                          isDarkMode ? "text-slate-400" : "text-slate-500"
                                        )}>
                                          {event.department}
                                        </CardDescription>
                                      </div>
                                    </div>
                                    
                                    <Badge 
                                      className={cn(
                                        "w-fit font-medium",
                                        event.tagType === 'received' 
                                          ? "bg-blue-600 text-white hover:bg-blue-700" 
                                          : "bg-slate-600 text-white hover:bg-slate-700"
                                      )}
                                    >
                                      {event.tagType === 'received' ? 'Tagged Event' : 'Created Event'}
                                    </Badge>
                                  </div>
                                  
                                  <ArrowRight className={cn(
                                    "h-5 w-5 opacity-50",
                                    isDarkMode ? "text-slate-400" : "text-slate-500"
                                  )} />
                                </div>
                              </CardHeader>
                              
                              <CardContent>
                                <div className="space-y-4">
                                  {/* Event Info Grid */}
                                  <div className="grid grid-cols-3 gap-4 text-sm">
                                    <div className="flex items-center gap-2">
                                      <CalendarDays className={cn(
                                        "h-4 w-4",
                                        isDarkMode ? "text-blue-400" : "text-blue-600"
                                      )} />
                                      <span className={cn(
                                        "font-medium",
                                        isDarkMode ? "text-slate-300" : "text-slate-700"
                                      )}>
                                        {getDateDisplay(event)}
                                      </span>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                      <MapPin className={cn(
                                        "h-4 w-4",
                                        isDarkMode ? "text-blue-400" : "text-blue-600"
                                      )} />
                                      <span className={cn(
                                        "font-medium truncate",
                                        isDarkMode ? "text-slate-300" : "text-slate-700"
                                      )}>
                                        {getLocationDisplay(event)}
                                      </span>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                      <Users className={cn(
                                        "h-4 w-4",
                                        isDarkMode ? "text-blue-400" : "text-blue-600"
                                      )} />
                                      <span className={cn(
                                        "font-medium",
                                        isDarkMode ? "text-slate-300" : "text-slate-700"
                                      )}>
                                        {event.participants || '0'}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  {/* Requirements */}
                                  {event.requirements && event.requirements.length > 0 && (
                                    <div>
                                      <div className="flex flex-wrap gap-2">
                                        {event.requirements.slice(0, 2).map((req, reqIndex) => (
                                          <Badge
                                            key={reqIndex}
                                            variant="outline"
                                            className={cn(
                                              "text-xs",
                                              isDarkMode 
                                                ? "border-slate-600 text-slate-300" 
                                                : "border-slate-300 text-slate-600"
                                            )}
                                          >
                                            {typeof req === 'string' ? req : req.name}
                                          </Badge>
                                        ))}
                                        {event.requirements.length > 2 && (
                                          <Badge
                                            variant="outline"
                                            className={cn(
                                              "text-xs",
                                              isDarkMode 
                                                ? "border-slate-600 text-slate-400" 
                                                : "border-slate-300 text-slate-500"
                                            )}
                                          >
                                            +{event.requirements.length - 2} more
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </div>
                    );
                  })()}
                </TabsContent>
              </>
            )}
          </Tabs>
        </motion.div>
      )}

      {/* Selected Event Details */}
      {selectedEvent && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="container py-6"
        >
          <div className="flex items-center gap-4 mb-6 px-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedEvent(null)}
              className={cn(
                "shrink-0",
                isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
              )}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className={cn(
                "text-2xl font-semibold tracking-tight",
                isDarkMode ? "text-white" : "text-slate-900"
              )}>{selectedEvent.title}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={selectedEvent.tagType === 'received' ? "default" : "secondary"}>
                  {selectedEvent.tagType === 'received' ? 'Tagged' : 'Created'}
                </Badge>
                <span className={cn(
                  "text-sm",
                  isDarkMode ? "text-slate-400" : "text-slate-600"
                )}>
                  {selectedEvent.department}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-6 px-6">
                        {/* Event Overview */}
                <Card className={cn(
                  "overflow-hidden border shadow-lg",
                  isDarkMode 
                    ? "bg-slate-800 border-slate-700/50" 
                    : "bg-white border-slate-200/50"
                )}>
               <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <div className={cn(
                        "p-2 rounded-full",
                        isDarkMode ? "bg-purple-500/20" : "bg-purple-100"
                      )}>
                        <CalendarDays className="h-5 w-5 text-purple-500" />
                      </div>
                      <span>Event Overview</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedEvent.isMultipleLocations && selectedEvent.locations && selectedEvent.locations.length > 0 ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                          <div className={cn(
                            "p-1.5 rounded-lg",
                            isDarkMode ? "bg-blue-500/20" : "bg-blue-100"
                          )}>
                            <MapPin className={cn(
                              "h-4 w-4",
                              isDarkMode ? "text-blue-400" : "text-blue-600"
                            )} />
                          </div>
                          <h4 className={cn(
                            "text-sm font-medium",
                            isDarkMode ? "text-slate-300" : "text-slate-600"
                          )}>Multiple Locations ({selectedEvent.locations.length})</h4>
                        </div>
                        
                        {selectedEvent.locations.map((location, index) => (
                            <div key={index} className={cn(
                              "p-4 rounded-xl border",
                              isDarkMode 
                                ? "bg-slate-800 border-slate-700" 
                                : "bg-slate-50 border-slate-200"
                            )}>
                              <div className="grid gap-3 md:grid-cols-3">
                                <div>
                                  <h5 className={cn(
                                    "text-xs font-medium mb-1",
                                    isDarkMode ? "text-slate-400" : "text-slate-500"
                                  )}>Location</h5>
                                  <p className={cn(
                                    "text-sm font-medium",
                                    isDarkMode ? "text-white" : "text-slate-900"
                                  )}>
                                    {location.location || 'Not specified'}
                                  </p>
                                </div>
                                
                                <div>
                                  <h5 className={cn(
                                    "text-xs font-medium mb-1",
                                    isDarkMode ? "text-slate-400" : "text-slate-500"
                                  )}>Start</h5>
                                  <div className="space-y-1">
                                    <p className={cn(
                                      "text-sm font-medium",
                                      isDarkMode ? "text-white" : "text-slate-900"
                                    )}>
                                      {(() => {
                                        const startDate = location.startDate || location.date;
                                        if (startDate) {
                                          try {
                                            const dateObj = startDate?.toDate ? startDate.toDate() : new Date(startDate);
                                            return format(dateObj, "MMM d, yyyy");
                                          } catch (e) {
                                            return startDate.toString();
                                          }
                                        }
                                        return 'Date not specified';
                                      })()}
                                    </p>
                                    <p className={cn(
                                      "text-xs",
                                      isDarkMode ? "text-slate-400" : "text-slate-500"
                                    )}>
                                      {(() => {
                                        // Extract start time from startDate timestamp
                                        if (location.startDate) {
                                          try {
                                            const startDateTime = location.startDate?.toDate ? location.startDate.toDate() : new Date(location.startDate);
                                            return format(startDateTime, "h:mm a");
                                          } catch (e) {
                                            return 'Time parsing error';
                                          }
                                        }
                                        
                                        return 'Time not specified';
                                      })()}
                                    </p>
                                  </div>
                                </div>
                                
                                <div>
                                  <h5 className={cn(
                                    "text-xs font-medium mb-1",
                                    isDarkMode ? "text-slate-400" : "text-slate-500"
                                  )}>End</h5>
                                  <div className="space-y-1">
                                    <p className={cn(
                                      "text-sm font-medium",
                                      isDarkMode ? "text-white" : "text-slate-900"
                                    )}>
                                      {(() => {
                                        const endDate = location.endDate;
                                        if (endDate) {
                                          try {
                                            const dateObj = endDate?.toDate ? endDate.toDate() : new Date(endDate);
                                            return format(dateObj, "MMM d, yyyy");
                                          } catch (e) {
                                            return endDate.toString();
                                          }
                                        }
                                        return 'Date not specified';
                                      })()}
                                    </p>
                                    <p className={cn(
                                      "text-xs",
                                      isDarkMode ? "text-slate-400" : "text-slate-500"
                                    )}>
                                      {(() => {
                                        // Extract end time from endDate timestamp
                                        if (location.endDate) {
                                          try {
                                            const endDateTime = location.endDate?.toDate ? location.endDate.toDate() : new Date(location.endDate);
                                            return format(endDateTime, "h:mm a");
                                          } catch (e) {
                                            return 'Time parsing error';
                                          }
                                        }
                                        
                                        return 'Time not specified';
                                      })()}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid gap-6 md:grid-cols-3">
                        {/* Start Time */}
                        <div className={cn(
                          "p-4 rounded-xl space-y-2",
                          isDarkMode 
                            ? "bg-slate-800 border border-slate-700" 
                            : "bg-slate-50 border border-slate-200"
                        )}>
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "p-1.5 rounded-lg",
                              isDarkMode ? "bg-blue-500/20" : "bg-blue-100"
                            )}>
                              <Clock className={cn(
                                "h-4 w-4",
                                isDarkMode ? "text-blue-400" : "text-blue-600"
                              )} />
                            </div>
                            <h4 className={cn(
                              "text-sm font-medium",
                              isDarkMode ? "text-slate-300" : "text-slate-600"
                            )}>Start Time</h4>
                          </div>
                          <p className={cn(
                            "text-sm font-medium",
                            isDarkMode ? "text-white" : "text-slate-900"
                          )}>
                            {(() => {
                              // First try to get from recentActivity
                              if (selectedEvent.recentActivity && selectedEvent.recentActivity.length > 0) {
                                const startDateActivity = selectedEvent.recentActivity
                                  .filter(activity => activity.type === 'startDateTime')
                                  .sort((a, b) => (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0))[0];
                                
                                if (startDateActivity && startDateActivity.newValue) {
                                  try {
                                    const date = new Date(startDateActivity.newValue);
                                    if (!isNaN(date.getTime())) {
                                      return format(date, "MMMM d, yyyy 'at' h:mm a");
                                    }
                                  } catch (e) {
                                    // If parsing fails, return the raw value
                                    return startDateActivity.newValue;
                                  }
                                }
                              }
                              
                              // Fallback to eventStore transformed fields
                              if (selectedEvent.start) {
                                return format(selectedEvent.start, "MMMM d, yyyy 'at' h:mm a");
                              }
                              
                              // Fallback to direct startDate field
                              if (selectedEvent.startDate) {
                                const date = selectedEvent.startDate?.toDate ? 
                                  selectedEvent.startDate.toDate() : 
                                  new Date(selectedEvent.startDate);
                                return format(date, "MMMM d, yyyy 'at' h:mm a");
                              }
                              
                              return 'Not specified';
                            })()}
                          </p>
                        </div>

                        {/* End Time */}
                        <div className={cn(
                          "p-4 rounded-xl space-y-2",
                          isDarkMode 
                            ? "bg-slate-800 border border-slate-700" 
                            : "bg-slate-50 border border-slate-200"
                        )}>
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "p-1.5 rounded-lg",
                              isDarkMode ? "bg-blue-500/20" : "bg-blue-100"
                            )}>
                              <Clock className={cn(
                                "h-4 w-4",
                                isDarkMode ? "text-blue-400" : "text-blue-600"
                              )} />
                            </div>
                            <h4 className={cn(
                              "text-sm font-medium",
                              isDarkMode ? "text-slate-300" : "text-slate-600"
                            )}>End Time</h4>
                          </div>
                          <p className={cn(
                            "text-sm font-medium",
                            isDarkMode ? "text-white" : "text-slate-900"
                          )}>
                            {(() => {
                              // First try to get from recentActivity
                              if (selectedEvent.recentActivity && selectedEvent.recentActivity.length > 0) {
                                const endDateActivity = selectedEvent.recentActivity
                                  .filter(activity => activity.type === 'endDateTime')
                                  .sort((a, b) => (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0))[0];
                                
                                if (endDateActivity && endDateActivity.newValue) {
                                  try {
                                    const date = new Date(endDateActivity.newValue);
                                    if (!isNaN(date.getTime())) {
                                      return format(date, "MMMM d, yyyy 'at' h:mm a");
                                    }
                                  } catch (e) {
                                    // If parsing fails, return the raw value
                                    return endDateActivity.newValue;
                                  }
                                }
                              }
                              
                              // Fallback to eventStore transformed fields
                              if (selectedEvent.actualEndDate) {
                                return format(selectedEvent.actualEndDate, "MMMM d, yyyy 'at' h:mm a");
                              }
                              
                              // Fallback to direct endDate field
                              if (selectedEvent.endDate) {
                                const date = selectedEvent.endDate?.toDate ? 
                                  selectedEvent.endDate.toDate() : 
                                  new Date(selectedEvent.endDate);
                                return format(date, "MMMM d, yyyy 'at' h:mm a");
                              }
                              
                              return 'Not specified';
                            })()}
                          </p>
                        </div>

                        {/* Location */}
                        <div className={cn(
                          "p-4 rounded-xl space-y-2",
                          isDarkMode 
                            ? "bg-slate-800 border border-slate-700" 
                            : "bg-slate-50 border border-slate-200"
                        )}>
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "p-1.5 rounded-lg",
                              isDarkMode ? "bg-blue-500/20" : "bg-blue-100"
                            )}>
                              <MapPin className={cn(
                                "h-4 w-4",
                                isDarkMode ? "text-blue-400" : "text-blue-600"
                              )} />
                            </div>
                            <h4 className={cn(
                              "text-sm font-medium",
                              isDarkMode ? "text-slate-300" : "text-slate-600"
                            )}>Location</h4>
                          </div>
                          <p className={cn(
                            "text-sm font-medium",
                            isDarkMode ? "text-white" : "text-slate-900"
                          )}>
                            {selectedEvent.location || 'Not specified'}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

              {/* Requirements */}
              <Card className={cn(
                "overflow-hidden border shadow-lg",
                isDarkMode 
                  ? "bg-slate-800 border-slate-700/50" 
                  : "bg-white border-slate-200/50"
              )}>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className={cn(
                      "p-2 rounded-full",
                      isDarkMode ? "bg-purple-500/20" : "bg-purple-100"
                    )}>
                      <CheckCircle2 className="h-5 w-5 text-purple-500" />
                    </div>
                    <span>Department Requirements</span>
                  </CardTitle>
                  <CardDescription className="ml-10">
                    Resources and requirements needed for this event
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {selectedEvent.requirements?.map((req, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.1 }}
                      >
                                                <div
                          className={cn(
                            "flex flex-col gap-4 rounded-xl p-4 transition-all shadow-sm",
                            isDarkMode 
                              ? "bg-slate-900/50 ring-1 ring-slate-700/50" 
                              : "bg-slate-50 ring-1 ring-slate-200/50"
                          )}
                        >
                          <div className="flex items-start gap-4">
                            <div className={cn(
                              "p-3 rounded-xl shrink-0",
                              isDarkMode ? "bg-purple-500/10" : "bg-purple-50"
                            )}>
                              <FileText className={cn(
                                "h-5 w-5",
                                isDarkMode ? "text-purple-400" : "text-purple-500"
                              )} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className={cn(
                                "font-medium flex items-center gap-2",
                                isDarkMode ? "text-white" : "text-slate-900"
                              )}>
                                {req.name}
                                <Badge className={cn(
                                  "ml-2 px-2 py-0.5 text-[10px] font-medium",
                                  isDarkMode 
                                    ? "bg-purple-500/10 text-purple-300 border border-purple-500/20" 
                                    : "bg-purple-50 text-purple-700 border border-purple-100"
                                )}>
                                  Required
                                </Badge>
                              </h4>

                              {req.note && (
                                <div className={cn(
                                  "mt-4 pt-3 space-y-2 border-t",
                                  isDarkMode ? "border-slate-800" : "border-slate-200"
                                )}>
                                  {req.note.split('\n').map((line, index) => {
                                    const [key, value] = line.split(':').map(s => s.trim());
                                    return (
                                      <div key={index} className="flex items-center gap-2">
                                        <span className={cn(
                                          "text-base font-medium",
                                          isDarkMode ? "text-slate-300" : "text-slate-700"
                                        )}>
                                          {key}
                                        </span>
                                        {value && (
                                          <>
                                            <span className={cn(
                                              "text-base",
                                              isDarkMode ? "text-slate-400" : "text-slate-600"
                                            )}>
                                              : {value}
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    {(!selectedEvent.requirements || selectedEvent.requirements.length === 0) && (
                      <div className="flex flex-col items-center justify-center py-8">
                        <div className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center mb-4",
                          isDarkMode ? "bg-slate-800" : "bg-slate-100"
                        )}>
                          <FileText className={cn(
                            "w-6 h-6",
                            isDarkMode ? "text-slate-400" : "text-slate-400"
                          )} />
                        </div>
                        <h3 className={cn(
                          "text-sm font-medium mb-2",
                          isDarkMode ? "text-slate-300" : "text-slate-700"
                        )}>No Requirements</h3>
                        <p className={cn(
                          "text-xs text-center max-w-[200px]",
                          isDarkMode ? "text-slate-400" : "text-slate-500"
                        )}>
                          This event doesn't have any specific requirements.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
          </div>
        </motion.div>
      )}
    </motion.div>
    </AnimatePresence>
  );
};

export default TaggedDepartments;
