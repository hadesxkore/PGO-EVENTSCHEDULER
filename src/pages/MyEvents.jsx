import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import "./styles.css";
import { downloadFile } from "@/lib/utils/downloadFile";
import { getCloudinaryFileUrl } from "@/lib/cloudinary";
import { useTheme } from "@/contexts/ThemeContext";
import { auth, db } from "@/lib/firebase/firebase";
import { doc, updateDoc, serverTimestamp, collection, query, where, getDocs, Timestamp, deleteField } from "firebase/firestore";
import useEventStore from "@/store/eventStore";
import useMessageStore from "@/store/messageStore";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Calendar,
  CalendarIcon,
  Clock,
  MapPin,
  Users,
  FileText,
  Plus,
  Search,
  Filter,
  Eye,
  User,
  Download,
  X,
  Check,
  Pencil,
  RotateCw,
  MessageCircle,
  AlertCircle,
  ChevronDown,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import ModernCalendar from "@/components/ModernCalendar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const statusColors = {
  pending: "bg-yellow-500/10 text-yellow-500",
  approved: "bg-green-500/10 text-green-500",
  rejected: "bg-red-500/10 text-red-500"
};

const MyEvents = () => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isRequirementsDialogOpen, setIsRequirementsDialogOpen] = useState(false);
  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false);
  const [selectedActivityType, setSelectedActivityType] = useState(null);
  const [selectedEventActivity, setSelectedEventActivity] = useState(null);
  const [eventToEdit, setEventToEdit] = useState(null);
  const [editFormData, setEditFormData] = useState({
    title: "",
    location: "",
  });
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [customLocation, setCustomLocation] = useState("");
  const [showCustomLocationInput, setShowCustomLocationInput] = useState(false);
  const [editStartDate, setEditStartDate] = useState(new Date());
  const [editEndDate, setEditEndDate] = useState(new Date());
  const [editStartTime, setEditStartTime] = useState("10:30");
  const [editEndTime, setEditEndTime] = useState("11:30");
  const [isStartCalendarOpen, setIsStartCalendarOpen] = useState(false);
  const [isEndCalendarOpen, setIsEndCalendarOpen] = useState(false);
  
  // Multiple locations state for edit modal
  const [editMultipleLocations, setEditMultipleLocations] = useState([]);
  const [editUseMultipleLocations, setEditUseMultipleLocations] = useState(false);
  const [isEditMultipleLocationsOpen, setIsEditMultipleLocationsOpen] = useState(false);
  const [editMultipleLocationDropdowns, setEditMultipleLocationDropdowns] = useState({});
  const [editMultipleCustomLocations, setEditMultipleCustomLocations] = useState({});
  const [editMultipleShowCustomInputs, setEditMultipleShowCustomInputs] = useState({});
  const itemsPerPage = 7;

  // Default locations from RequestEvent page
  const defaultLocations = [
    "Atrium",
    "Grand Lobby Entrance",
    "Main Entrance Lobby",
    "Main Entrance Leasable Area",
    "4th Flr. Conference Room 1",
    "4th Flr. Conference Room 2",
    "4th Flr. Conference Room 3",
    "5th Flr. Training Room 1 (BAC)",
    "5th Flr. Training Room 2",
    "6th Flr. Meeting Room 7",
    "6th Flr. DPOD",
    "Bataan Peoples Center",
    "Capitol Quadrangle",
    "1BOSSCO",
    "Emiliana Hall",
    "Pavilion"
  ];

  // Zustand store
  const { 
    events, 
    loading, 
    error,
    fetchUserEvents, 
    deleteEvent,
    updateEvent,
    clearStore
  } = useEventStore();

  // Watch for errors
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const handleDelete = async () => {
    if (!eventToDelete) return;
    
    const result = await deleteEvent(eventToDelete.id);
    if (result.success) {
      toast.success("Event deleted successfully");
    } else {
      toast.error(result.error || "Failed to delete event");
    }
    
    setIsDeleteDialogOpen(false);
    setEventToDelete(null);
  };

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Function to fetch events
  const fetchEvents = async (userId) => {
    try {
      await fetchUserEvents(userId, true); // Force fetch to get latest data
    } catch (error) {
      console.error("Error fetching events:", error);
      toast.error("Error fetching events");
    }
  };

  // Manual refresh function
  const handleRefresh = async () => {
    if (!auth.currentUser) return;
    setIsRefreshing(true);
    await fetchEvents(auth.currentUser.uid);
    setIsRefreshing(false);
  };

  useEffect(() => {
    let unsubscribeAuth;
    let refreshInterval;

    // Check if user is authenticated
    unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user) {
        toast.error("Please login to view your events");
        clearStore();
        navigate('/');
      } else {
        // Initial fetch
        fetchEvents(user.uid);

        // Set up refresh interval (every 5 minutes)
        refreshInterval = setInterval(() => {
          fetchEvents(user.uid);
        }, 5 * 60 * 1000); // 5 minutes
      }
    });

    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
      if (refreshInterval) clearInterval(refreshInterval);
      clearStore();
    };
  }, [navigate, clearStore]);

  // Show error toast if there's an error in the store
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const filteredEvents = events.filter(event => {
    const titleMatch = event.title?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    
    // Handle both single location and multiple locations
    let locationMatch = false;
    if (event.location) {
      // Single location
      locationMatch = event.location.toLowerCase().includes(searchTerm.toLowerCase());
    } else if (event.locations && Array.isArray(event.locations)) {
      // Multiple locations
      locationMatch = event.locations.some(loc => 
        loc.location?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return titleMatch || locationMatch;
  });

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={container}
      className="mx-auto px-4 pt-4 pb-6 w-full"
    >
      {/* Header */}
      <motion.div variants={item} className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1
              className={cn(
                "text-3xl font-bold",
                isDarkMode ? "text-white" : "text-gray-900"
              )}
            >
              My Events
            </h1>
            <p
              className={cn(
                "text-sm mt-1",
                isDarkMode ? "text-gray-400" : "text-gray-500"
              )}
            >
              View and manage your event requests
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="icon"
              disabled={isRefreshing}
              className={cn(
                "h-10 w-10",
                isDarkMode 
                  ? "border-slate-700 text-gray-300 hover:bg-slate-800" 
                  : "border-gray-200 text-gray-700 hover:bg-gray-100"
              )}
            >
              <RotateCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            </Button>
            <Button
              onClick={() => navigate('/request-event')}
              className="bg-black hover:bg-gray-800 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Request Event
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Search and Filter */}
      <motion.div
        variants={item}
        className="flex flex-col sm:flex-row gap-4 mb-6"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={cn(
              "pl-9",
              isDarkMode
                ? "bg-slate-900 border-slate-700"
                : "bg-white border-gray-200"
            )}
          />
        </div>
      </motion.div>

      {/* Events Table */}
      <motion.div variants={item}>
        <div className={cn(
          "rounded-xl border shadow-sm",
          isDarkMode ? "border-slate-700 bg-slate-900" : "border-gray-100 bg-white"
        )}>
          {/* Card Header */}
          <div className={cn(
            "flex items-center justify-between px-6 py-5 border-b",
            isDarkMode ? "border-slate-700" : "border-gray-100"
          )}>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className={cn(
                  "text-lg font-semibold",
                  isDarkMode ? "text-gray-100" : "text-gray-900"
                )}>
                  Event Requests
                </h2>
                <Badge variant="secondary" className={cn(
                  "rounded-lg font-medium",
                  isDarkMode ? "bg-slate-800 text-gray-300" : "bg-gray-100 text-gray-600"
                )}>
                  {filteredEvents.length} total
                </Badge>
              </div>
              <p className={cn(
                "text-sm",
                isDarkMode ? "text-gray-400" : "text-gray-500"
              )}>
                View all your event requests and their status
              </p>
            </div>
          </div>

          {/* Table */}
          <div className="px-2">
            {loading ? (
              <div className="py-8 text-center">
                <p className={isDarkMode ? "text-gray-400" : "text-gray-500"}>
                  Loading events...
                </p>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="py-8 text-center">
                <p className={isDarkMode ? "text-gray-400" : "text-gray-500"}>
                  No events found
                </p>
              </div>
            ) : (
              <div>
                <Table>
                  <TableHeader>
                    <TableRow className={cn(
                      "border-b-2",
                      isDarkMode 
                        ? "border-slate-600 bg-slate-800/50 hover:bg-slate-800/50" 
                        : "border-gray-300 bg-gray-50/80 hover:bg-gray-50/80"
                    )}>
                      <TableHead className={cn(
                        "w-[280px] py-5 px-6 font-bold text-sm uppercase tracking-wider border-r",
                        isDarkMode 
                          ? "text-slate-200 border-slate-600" 
                          : "text-gray-700 border-gray-200"
                      )}>
                        Event Title
                      </TableHead>
                      <TableHead className={cn(
                        "w-[160px] text-center py-5 px-4 font-bold text-sm uppercase tracking-wider border-r",
                        isDarkMode 
                          ? "text-slate-200 border-slate-600" 
                          : "text-gray-700 border-gray-200"
                      )}>
                        Requestor
                      </TableHead>
                      <TableHead className={cn(
                        "w-[140px] text-center py-5 px-4 font-bold text-sm uppercase tracking-wider border-r",
                        isDarkMode 
                          ? "text-slate-200 border-slate-600" 
                          : "text-gray-700 border-gray-200"
                      )}>
                        Start Date
                      </TableHead>
                      <TableHead className={cn(
                        "w-[140px] text-center py-5 px-4 font-bold text-sm uppercase tracking-wider border-r",
                        isDarkMode 
                          ? "text-slate-200 border-slate-600" 
                          : "text-gray-700 border-gray-200"
                      )}>
                        End Date
                      </TableHead>
                      <TableHead className={cn(
                        "w-[180px] text-center py-5 px-4 font-bold text-sm uppercase tracking-wider border-r",
                        isDarkMode 
                          ? "text-slate-200 border-slate-600" 
                          : "text-gray-700 border-gray-200"
                      )}>
                        Location
                      </TableHead>
                      <TableHead className={cn(
                        "w-[120px] text-center py-5 px-4 font-bold text-sm uppercase tracking-wider border-r",
                        isDarkMode 
                          ? "text-slate-200 border-slate-600" 
                          : "text-gray-700 border-gray-200"
                      )}>
                        Status
                      </TableHead>
                      <TableHead className={cn(
                        "w-[160px] text-center py-5 px-4 font-bold text-sm uppercase tracking-wider",
                        isDarkMode 
                          ? "text-slate-200" 
                          : "text-gray-700"
                      )}>
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEvents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((event, index) => (
                      <TableRow 
                        key={event.id} 
                        className={cn(
                          "border-b border-gray-300 dark:border-slate-600 transition-all duration-200 hover:shadow-sm",
                          isDarkMode 
                            ? "hover:bg-slate-800/30" 
                            : "hover:bg-gray-50/50",
                          index % 2 === 0 
                            ? isDarkMode 
                              ? "bg-slate-900/20" 
                              : "bg-white" 
                            : isDarkMode 
                              ? "bg-slate-800/30" 
                              : "bg-gray-100/60"
                        )}
                      >
                        <TableCell className={cn(
                          "py-4 px-6 border-r align-top",
                          isDarkMode ? "border-slate-600" : "border-gray-200"
                        )}>
                          <div className="max-w-[250px]">
                            <span className={cn(
                              "px-3 py-2 rounded-lg inline-block font-semibold text-sm whitespace-nowrap overflow-hidden text-ellipsis shadow-sm",
                              isDarkMode 
                                ? "bg-blue-500/15 text-blue-300 border border-blue-500/20" 
                                : "bg-blue-50 text-blue-700 border border-blue-100"
                            )} title={event.title}>
                              {event.title.length > 20 
                                ? `${event.title.substring(0, 20)}...` 
                                : event.title}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className={cn(
                          "text-center py-4 px-4 border-r align-top",
                          isDarkMode ? "border-slate-600" : "border-gray-200"
                        )}>
                          <div className="space-y-1">
                            <p className={cn(
                              "text-sm font-semibold",
                              isDarkMode ? "text-slate-100" : "text-gray-900"
                            )}>{event.requestor}</p>
                            <p className={cn(
                              "text-xs font-medium px-2 py-1 rounded-md",
                              isDarkMode 
                                ? "text-slate-300 bg-slate-700/50" 
                                : "text-gray-600 bg-gray-100"
                            )}>{event.department}</p>
                          </div>
                        </TableCell>
                        <TableCell className={cn(
                          "text-center py-4 px-4 border-r align-top",
                          isDarkMode ? "border-slate-600" : "border-gray-200"
                        )}>
                          <div className="space-y-2">
                            {event.locations && event.locations.length > 0 ? (
                              <div className="space-y-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedEvent(event);
                                    setIsViewDialogOpen(true);
                                  }}
                                  className={cn(
                                    "text-xs px-3 py-2 h-auto font-medium shadow-sm border transition-all duration-200",
                                    isDarkMode
                                      ? "text-slate-200 border-slate-500 bg-slate-800/50 hover:bg-slate-700/50 hover:border-slate-400"
                                      : "text-gray-700 border-gray-300 bg-white hover:bg-gray-50 hover:border-gray-400 hover:shadow-md"
                                  )}
                                >
                                  View Schedule
                                </Button>
                                {event.recentActivity && event.recentActivity.length > 0 && (
                                  <motion.div 
                                    className="flex items-center justify-center gap-1 cursor-pointer hover:bg-gray-100 rounded px-1 py-0.5"
                                    whileHover={{ scale: 1.05 }}
                                    transition={{ duration: 0.2 }}
                                    onClick={() => {
                                      setSelectedEventActivity(event);
                                      setIsActivityDialogOpen(true);
                                    }}
                                  >
                                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                                    <span className="text-xs font-medium text-black">Updated</span>
                                  </motion.div>
                                )}
                              </div>
                            ) : (
                              <div className={cn(
                                "text-xs font-medium px-3 py-2 rounded-md",
                                isDarkMode 
                                  ? "text-slate-200 bg-slate-800/30" 
                                  : "text-gray-800 bg-gray-100/80"
                              )}>
                                {event.startDate?.seconds ? format(new Date(event.startDate.seconds * 1000), "MMM d, yyyy h:mm a") : "Not set"}
                              </div>
                            )}
                            {event.recentActivity && event.recentActivity.some(activity => activity.type === 'startDateTime') && (
                              <motion.div 
                                className="flex items-center justify-center gap-1 cursor-pointer hover:bg-gray-100 rounded px-1 py-0.5"
                                whileHover={{ scale: 1.05 }}
                                transition={{ duration: 0.2 }}
                                onClick={() => {
                                  setSelectedEventActivity(event);
                                  setIsActivityDialogOpen(true);
                                }}
                              >
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="text-xs font-medium text-black">Updated</span>
                              </motion.div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className={cn(
                          "text-center py-4 px-4 border-r align-top",
                          isDarkMode ? "border-slate-600" : "border-gray-200"
                        )}>
                          <div className="space-y-2">
                            {event.locations && event.locations.length > 0 ? (
                              <div className="space-y-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedEvent(event);
                                    setIsViewDialogOpen(true);
                                  }}
                                  className={cn(
                                    "text-xs px-3 py-2 h-auto font-medium shadow-sm border transition-all duration-200",
                                    isDarkMode
                                      ? "text-slate-200 border-slate-500 bg-slate-800/50 hover:bg-slate-700/50 hover:border-slate-400"
                                      : "text-gray-700 border-gray-300 bg-white hover:bg-gray-50 hover:border-gray-400 hover:shadow-md"
                                  )}
                                >
                                  View Schedule
                                </Button>
                                {event.recentActivity && event.recentActivity.length > 0 && (
                                  <motion.div 
                                    className="flex items-center justify-center gap-1 cursor-pointer hover:bg-gray-100 rounded px-1 py-0.5"
                                    whileHover={{ scale: 1.05 }}
                                    transition={{ duration: 0.2 }}
                                    onClick={() => {
                                      setSelectedEventActivity(event);
                                      setIsActivityDialogOpen(true);
                                    }}
                                  >
                                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"></div>
                                    <span className="text-xs font-medium text-black">Updated</span>
                                  </motion.div>
                                )}
                              </div>
                            ) : (
                              <div className={cn(
                                "text-xs font-medium px-3 py-2 rounded-md",
                                isDarkMode 
                                  ? "text-slate-200 bg-slate-800/30" 
                                  : "text-gray-800 bg-gray-100/80"
                              )}>
                                {event.endDate?.seconds ? format(new Date(event.endDate.seconds * 1000), "MMM d, yyyy h:mm a") : "Not set"}
                              </div>
                            )}
                            {event.recentActivity && event.recentActivity.some(activity => activity.type === 'endDateTime') && (
                              <motion.div 
                                className="flex items-center justify-center gap-1 cursor-pointer hover:bg-gray-100 rounded px-1 py-0.5"
                                whileHover={{ scale: 1.05 }}
                                transition={{ duration: 0.2 }}
                                onClick={() => {
                                  setSelectedEventActivity(event);
                                  setIsActivityDialogOpen(true);
                                }}
                              >
                                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"></div>
                                <span className="text-xs font-medium text-black">Updated</span>
                              </motion.div>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className={cn(
                          "text-center py-4 px-4 border-r align-top",
                          isDarkMode ? "border-slate-600" : "border-gray-200"
                        )}>
                          <div className="space-y-2">
                            {event.locations && event.locations.length > 0 ? (
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "text-xs px-3 py-2 font-semibold shadow-sm border",
                                  isDarkMode
                                    ? "text-purple-300 border-purple-500/30 bg-purple-500/10"
                                    : "text-purple-700 border-purple-200 bg-purple-50"
                                )}
                              >
                                {event.locations.length} locations
                              </Badge>
                            ) : (
                              <div className={cn(
                                "text-xs font-medium px-3 py-2 rounded-md",
                                isDarkMode 
                                  ? "text-slate-200 bg-slate-800/30" 
                                  : "text-gray-800 bg-gray-100/80"
                              )}>
                                {event.location}
                              </div>
                            )}
                            {event.recentActivity && event.recentActivity.length > 0 && (
                              <motion.div 
                                className="flex items-center justify-center gap-1 cursor-pointer hover:bg-gray-100 rounded px-1 py-0.5"
                                whileHover={{ scale: 1.05 }}
                                transition={{ duration: 0.2 }}
                                onClick={() => {
                                  setSelectedEventActivity(event);
                                  setIsActivityDialogOpen(true);
                                }}
                              >
                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                                <span className="text-xs font-medium text-black">Updated</span>
                              </motion.div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className={cn(
                          "py-4 px-4 border-r align-top relative",
                          isDarkMode ? "border-slate-600" : "border-gray-200"
                        )}>
                          {event.status === 'disapproved' ? (
                            <div className="flex items-center justify-center gap-2">
                              <div className="relative">
                                <Badge
                                  variant="destructive"
                                  className={cn(
                                    "font-semibold px-3 py-2 text-xs shadow-sm",
                                    isDarkMode
                                      ? "bg-red-500/15 text-red-300 border border-red-500/30"
                                      : "bg-red-50 text-red-700 border border-red-200"
                                  )}
                                >
                                  Disapproved
                                </Badge>
                                {/* Floating Alert Badge with Hover */}
                                <HoverCard>
                                  <HoverCardTrigger>
                                    <div className="absolute -top-1 -right-1 z-10 cursor-pointer">
                                      <div className="relative">
                                        <div className="w-4 h-4 bg-red-600 rounded-full flex items-center justify-center shadow-lg animate-pulse hover:bg-red-700 transition-colors">
                                          <AlertCircle className="h-2.5 w-2.5 text-white" />
                                        </div>
                                        <div className="absolute inset-0 w-4 h-4 bg-red-600 rounded-full animate-ping opacity-75"></div>
                                      </div>
                                    </div>
                                  </HoverCardTrigger>
                                  <HoverCardContent className="w-80 p-4 bg-white border border-gray-200 shadow-lg rounded-lg">
                                    <div className="space-y-2">
                                      <h4 className={cn(
                                        "font-medium",
                                        isDarkMode ? "text-gray-200" : "text-gray-900"
                                      )}>
                                        Reason for Disapproval
                                      </h4>
                                      <p className={cn(
                                        "text-sm",
                                        isDarkMode ? "text-gray-400" : "text-gray-500"
                                      )}>
                                        {event.disapprovalReason || "No reason provided"}
                                      </p>
                                    </div>
                                  </HoverCardContent>
                                </HoverCard>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-center">
                              <Badge
                                variant={event.status === 'approved' ? 'success' : 'secondary'}
                                className={cn(
                                  "font-semibold px-3 py-2 text-xs shadow-sm border",
                                  event.status === 'approved' 
                                    ? isDarkMode
                                      ? "bg-green-500/15 text-green-300 border-green-500/30"
                                      : "bg-green-50 text-green-700 border-green-200"
                                    : isDarkMode 
                                      ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" 
                                      : "bg-yellow-50 text-yellow-700 border-yellow-200"
                                )}
                              >
                                {event.status ? event.status.charAt(0).toUpperCase() + event.status.slice(1) : 'Pending'}
                              </Badge>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className={cn(
                          "text-center py-4 px-4 align-top"
                        )}>
                          <div className="flex items-center justify-center gap-3">
                            <Button
                              onClick={() => {
                                setSelectedEvent(event);
                                setIsViewDialogOpen(true);
                              }}
                              className={cn(
                                "gap-2 font-medium text-xs px-4 py-2 shadow-sm transition-all duration-200",
                                isDarkMode
                                  ? "bg-slate-700 hover:bg-slate-600 text-slate-100 border border-slate-600"
                                  : "bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 hover:shadow-md"
                              )}
                              size="sm"
                            >
                              <Eye className="h-4 w-4" />
                              View
                            </Button>
                            <Button
                              onClick={() => {
                                setEventToEdit(event);
                                
                                // Automatically detect if event has multiple locations
                                const hasMultipleLocations = event.isMultipleLocations && event.locations && event.locations.length > 0;
                                
                                // Always set the mode based on the event data - no user choice needed
                                setEditUseMultipleLocations(hasMultipleLocations);
                                
                                if (hasMultipleLocations) {
                                  // Initialize multiple locations mode
                                  setEditMultipleLocations(event.locations.map((loc, idx) => {
                                    // Handle the data structure where date and time are separate fields
                                    let startDate, endDate;
                                    
                                    if (loc.startDate && loc.startTime) {
                                      // Combine date string and time string into a proper Date object
                                      const startDateTime = `${loc.startDate}T${loc.startTime}:00`;
                                      startDate = new Date(startDateTime);
                                    } else if (loc.startDate?.toDate) {
                                      startDate = loc.startDate.toDate();
                                    } else if (loc.startDate?.seconds) {
                                      startDate = new Date(loc.startDate.seconds * 1000);
                                    } else {
                                      startDate = new Date();
                                    }
                                    
                                    if (loc.endDate && loc.endTime) {
                                      // Combine date string and time string into a proper Date object
                                      const endDateTime = `${loc.endDate}T${loc.endTime}:00`;
                                      endDate = new Date(endDateTime);
                                    } else if (loc.endDate?.toDate) {
                                      endDate = loc.endDate.toDate();
                                    } else if (loc.endDate?.seconds) {
                                      endDate = new Date(loc.endDate.seconds * 1000);
                                    } else {
                                      endDate = new Date();
                                    }

                                    return {
                                      id: loc.id || Date.now() + Math.random(),
                                      location: loc.location || "",
                                      startDate: startDate,
                                      endDate: endDate,
                                      startTime: loc.startTime || format(startDate, "HH:mm"),
                                      endTime: loc.endTime || format(endDate, "HH:mm")
                                    };
                                  }));
                                  
                                  // Set form data for title only
                                  setEditFormData({
                                    title: event.title,
                                    location: "",
                                  });
                                } else {
                                  // Initialize single location mode
                                  setEditMultipleLocations([]);
                                  setEditFormData({
                                    title: event.title,
                                    location: event.location,
                                  });
                                  
                                  // Check if location is in default list
                                  const isDefaultLocation = defaultLocations.includes(event.location);
                                  setShowCustomLocationInput(!isDefaultLocation);
                                  if (!isDefaultLocation) {
                                    setCustomLocation(event.location);
                                  }
                                  
                                  // Set dates and times
                                  if (event.startDate) {
                                    const startDate = event.startDate.toDate ? event.startDate.toDate() : new Date(event.startDate.seconds * 1000);
                                    setEditStartDate(startDate);
                                    setEditStartTime(format(startDate, "HH:mm"));
                                  }
                                  if (event.endDate) {
                                    const endDate = event.endDate.toDate ? event.endDate.toDate() : new Date(event.endDate.seconds * 1000);
                                    setEditEndDate(endDate);
                                    setEditEndTime(format(endDate, "HH:mm"));
                                  }
                                }
                                
                                setIsEditDialogOpen(true);
                              }}
                              size="sm"
                              className={cn(
                                "gap-2 font-medium text-xs px-4 py-2 shadow-sm transition-all duration-200",
                                isDarkMode
                                  ? "bg-blue-600 hover:bg-blue-500 text-white border border-blue-500"
                                  : "bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 hover:shadow-md"
                              )}
                            >
                              <Pencil className="h-4 w-4" />
                              Edit
                            </Button>
                            <Button
                              onClick={() => {
                                try {
                                  // Create the selected user object
                                  const selectedUser = {
                                    isDepartmentMessage: true,
                                    department: event.departmentRequirements?.[0]?.departmentName || event.department,
                                    eventTitle: event.title,
                                    eventId: event.id,
                                    email: `department@${(event.departmentRequirements?.[0]?.departmentName || event.department).toLowerCase().replace(/\s+/g, '')}`
                                  };

                                  // Navigate to messages page
                                  navigate('/messages', { 
                                    state: { 
                                      selectedUser,
                                      from: 'myEvents'
                                    }
                                  });
                                } catch (error) {
                                  console.error('Navigation error:', error);
                                  toast.error('Failed to open messages');
                                }
                              }}
                              size="sm"
                              className={cn(
                                "gap-2 font-medium text-xs px-4 py-2 shadow-sm transition-all duration-200",
                                isDarkMode
                                  ? "bg-green-600 hover:bg-green-500 text-white border border-green-500"
                                  : "bg-green-600 hover:bg-green-700 text-white border border-green-600 hover:shadow-md"
                              )}
                            >
                              <MessageCircle className="h-4 w-4" />
                              Message
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* View Details Label */}
                <div className={cn(
                  "px-6 pt-5 pb-3 text-sm border-t",
                  isDarkMode ? "border-slate-700 text-gray-400" : "border-gray-100 text-gray-500"
                )}>
                  <p>Click the "View" button to see complete event details and requirements</p>
                </div>
                
                {/* Pagination */}
                {filteredEvents.length >= 7 && (
                  <div className={cn(
                    "flex items-center justify-between px-6 py-4 border-t",
                    isDarkMode ? "border-slate-700" : "border-gray-100"
                  )}>
                    <p className={cn(
                      "text-sm",
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    )}>
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredEvents.length)} of {filteredEvents.length} entries
                    </p>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Pagination>
                      <PaginationContent className="gap-1">
                        <PaginationItem>
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                          >
                            <PaginationPrevious 
                              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                              className={cn(
                                "cursor-pointer transition-all duration-200 hover:shadow-md",
                                isDarkMode
                                  ? "hover:bg-slate-700 border-slate-600"
                                  : "hover:bg-gray-100 border-gray-200",
                                currentPage === 1 && "pointer-events-none opacity-50"
                              )}
                            />
                          </motion.div>
                        </PaginationItem>
                        {Array.from({ length: Math.min(5, Math.ceil(filteredEvents.length / itemsPerPage)) }).map((_, i) => (
                          <PaginationItem key={i}>
                            <motion.div
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              transition={{ duration: 0.2 }}
                            >
                              <PaginationLink
                                onClick={() => setCurrentPage(i + 1)}
                                isActive={currentPage === i + 1}
                                className={cn(
                                  "cursor-pointer transition-all duration-200 hover:shadow-md",
                                  currentPage === i + 1
                                    ? isDarkMode
                                      ? "bg-blue-600 text-white border-blue-500 shadow-lg"
                                      : "bg-blue-600 text-white border-blue-500 shadow-lg"
                                    : isDarkMode
                                      ? "hover:bg-slate-700 border-slate-600"
                                      : "hover:bg-gray-100 border-gray-200"
                                )}
                              >
                                {i + 1}
                              </PaginationLink>
                            </motion.div>
                          </PaginationItem>
                        ))}
                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredEvents.length / itemsPerPage), p + 1))}
                            className={cn(
                              "cursor-pointer",
                              currentPage === Math.ceil(filteredEvents.length / itemsPerPage) && "pointer-events-none opacity-50"
                            )}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                    </motion.div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* View Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[900px] p-0 border-0 bg-white rounded-2xl overflow-hidden">
          {selectedEvent && (
            <ScrollArea className="h-[85vh]">
              {/* Header Section */}
              <div className="relative bg-white p-8 border-b border-gray-200">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-4 h-8 w-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                  onClick={() => setIsViewDialogOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
                
                <div className="space-y-3">
                  <Badge variant="outline" className="border-gray-300 text-gray-700 bg-gray-50">
                    {selectedEvent.department}
                  </Badge>
                  <DialogTitle className="text-2xl font-bold text-gray-900 leading-tight">
                    {selectedEvent.title}
                  </DialogTitle>
                  <p className="text-gray-600 text-sm">
                    Event Details & Requirements
                  </p>
                </div>
              </div>

              {/* Content Section */}
              <div className="p-8 bg-gray-50 space-y-8">
                {/* Event Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Requestor Card */}
                  <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-black">
                        <User className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="font-semibold text-gray-900">Requestor</h3>
                    </div>
                    <div className="space-y-1">
                      <p className="text-lg font-medium text-gray-900">
                        {selectedEvent.requestor}
                      </p>
                      <p className="text-sm text-gray-500">
                        {selectedEvent.department}
                      </p>
                    </div>
                  </div>

                  {/* Date & Time Card */}
                  {selectedEvent.locations && selectedEvent.locations.length > 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm md:col-span-2">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-black">
                          <Calendar className="h-5 w-5 text-white" />
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
                                  {location.startDate ? (() => {
                                    // Handle Firebase timestamp conversion
                                    let date;
                                    if (location.startDate.toDate) {
                                      date = location.startDate.toDate();
                                    } else if (location.startDate.seconds) {
                                      date = new Date(location.startDate.seconds * 1000);
                                    } else {
                                      date = new Date(location.startDate);
                                    }
                                    return date.toLocaleDateString();
                                  })() : "Not set"}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {(() => {
                                    // Handle time display - either from startTime field or extract from startDate
                                    if (location.startTime) {
                                      const [hours, minutes] = location.startTime.split(':');
                                      const hour = parseInt(hours);
                                      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                                      const ampm = hour < 12 ? 'AM' : 'PM';
                                      return `${displayHour}:${minutes} ${ampm}`;
                                    } else if (location.startDate) {
                                      // Extract time from startDate if startTime is not available
                                      let date;
                                      if (location.startDate.toDate) {
                                        date = location.startDate.toDate();
                                      } else if (location.startDate.seconds) {
                                        date = new Date(location.startDate.seconds * 1000);
                                      } else {
                                        date = new Date(location.startDate);
                                      }
                                      return format(date, "h:mm a");
                                    }
                                    return "Not set";
                                  })()}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                  End
                                </p>
                                <p className="text-sm font-medium text-gray-900">
                                  {location.endDate ? (() => {
                                    // Handle Firebase timestamp conversion
                                    let date;
                                    if (location.endDate.toDate) {
                                      date = location.endDate.toDate();
                                    } else if (location.endDate.seconds) {
                                      date = new Date(location.endDate.seconds * 1000);
                                    } else {
                                      date = new Date(location.endDate);
                                    }
                                    return date.toLocaleDateString();
                                  })() : "Not set"}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {(() => {
                                    // Handle time display - either from endTime field or extract from endDate
                                    if (location.endTime) {
                                      const [hours, minutes] = location.endTime.split(':');
                                      const hour = parseInt(hours);
                                      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                                      const ampm = hour < 12 ? 'AM' : 'PM';
                                      return `${displayHour}:${minutes} ${ampm}`;
                                    } else if (location.endDate) {
                                      // Extract time from endDate if endTime is not available
                                      let date;
                                      if (location.endDate.toDate) {
                                        date = location.endDate.toDate();
                                      } else if (location.endDate.seconds) {
                                        date = new Date(location.endDate.seconds * 1000);
                                      } else {
                                        date = new Date(location.endDate);
                                      }
                                      return format(date, "h:mm a");
                                    }
                                    return "Not set";
                                  })()}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-black">
                          <Calendar className="h-5 w-5 text-white" />
                        </div>
                        <h3 className="font-semibold text-gray-900">Schedule</h3>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                            Start
                          </p>
                          <p className="text-sm font-medium text-gray-900">
                            {(() => {
                              try {
                                if (selectedEvent.startDate) {
                                  const date = selectedEvent.startDate.toDate ? selectedEvent.startDate.toDate() : new Date(selectedEvent.startDate);
                                  return isNaN(date.getTime()) ? "Invalid date" : format(date, "MMM d, yyyy");
                                } else if (selectedEvent.date?.seconds) {
                                  const date = new Date(selectedEvent.date.seconds * 1000);
                                  return isNaN(date.getTime()) ? "Invalid date" : format(date, "MMM d, yyyy");
                                }
                                return "Not available";
                              } catch (error) {
                                console.error("Date formatting error:", error);
                                return "Invalid date";
                              }
                            })()}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(() => {
                              try {
                                if (selectedEvent.startDate) {
                                  const date = selectedEvent.startDate.toDate ? selectedEvent.startDate.toDate() : new Date(selectedEvent.startDate);
                                  return isNaN(date.getTime()) ? "" : format(date, "h:mm a");
                                } else if (selectedEvent.date?.seconds) {
                                  const date = new Date(selectedEvent.date.seconds * 1000);
                                  return isNaN(date.getTime()) ? "" : format(date, "h:mm a");
                                }
                                return "";
                              } catch (error) {
                                console.error("Time formatting error:", error);
                                return "";
                              }
                            })()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                            End
                          </p>
                          <p className="text-sm font-medium text-gray-900">
                            {(() => {
                              try {
                                if (selectedEvent.endDate) {
                                  const date = selectedEvent.endDate.toDate ? selectedEvent.endDate.toDate() : new Date(selectedEvent.endDate);
                                  return isNaN(date.getTime()) ? "Invalid date" : format(date, "MMM d, yyyy");
                                }
                                return "Not available";
                              } catch (error) {
                                console.error("End date formatting error:", error);
                                return "Invalid date";
                              }
                            })()}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(() => {
                              try {
                                if (selectedEvent.endDate) {
                                  const date = selectedEvent.endDate.toDate ? selectedEvent.endDate.toDate() : new Date(selectedEvent.endDate);
                                  return isNaN(date.getTime()) ? "" : format(date, "h:mm a");
                                }
                                return "";
                              } catch (error) {
                                console.error("End time formatting error:", error);
                                return "";
                              }
                            })()}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Location Card */}
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
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-black">
                          <MapPin className="h-5 w-5 text-white" />
                        </div>
                        <h3 className="font-semibold text-gray-900">Location</h3>
                      </div>
                      <p className="text-lg font-medium text-gray-900 mb-1">
                        {selectedEvent.location}
                      </p>
                      <p className="text-sm text-gray-500">Venue</p>
                    </div>
                  )}

                  {/* Participants Card */}
                  <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-black">
                        <Users className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="font-semibold text-gray-900">Attendees</h3>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 mb-1">
                      {selectedEvent.participants}
                    </p>
                    <p className="text-sm text-gray-500">Expected Participants</p>
                  </div>

                  {/* VIP Card */}
                  <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-black">
                        <User className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="font-semibold text-gray-900">VIP</h3>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 mb-1">
                      {selectedEvent.vip || 0}
                    </p>
                    <p className="text-sm text-gray-500">VIP Attendees</p>
                  </div>

                  {/* VVIP Card */}
                  <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-black">
                        <User className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="font-semibold text-gray-900">VVIP</h3>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 mb-1">
                      {selectedEvent.vvip || 0}
                    </p>
                    <p className="text-sm text-gray-500">VVIP Attendees</p>
                  </div>
                </div>

                {/* Requirements Card */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-black">
                        <FileText className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">Requirements</h3>
                    </div>
                    <Button
                      size="sm"
                      className="bg-black hover:bg-gray-800 text-white border-0 gap-2"
                      onClick={() => {
                         setIsRequirementsDialogOpen(true);
                       }}
                    >
                      <Eye className="h-4 w-4" />
                      View All
                    </Button>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      {selectedEvent.departmentRequirements && selectedEvent.departmentRequirements.slice(0, 2).map((dept, deptIndex) => (
                        <div key={deptIndex} className="space-y-3">
                          <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                            {dept.departmentName}
                          </h4>
                          <div className="space-y-2">
                            {dept.requirements.slice(0, 2).map((req, reqIndex) => {
                              const requirement = typeof req === 'string' ? { name: req } : req;
                              return (
                                <div key={`${deptIndex}-${reqIndex}`} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                  <div className="p-1.5 rounded-md bg-white shadow-sm mt-0.5">
                                    <FileText className="h-4 w-4 text-black" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900 text-sm">
                                      {requirement.name}
                                    </p>
                                    {requirement.note ? (
                                      <p className="text-xs text-gray-600 mt-1 whitespace-pre-line">
                                        {requirement.note}
                                      </p>
                                    ) : (
                                      <p className="text-xs text-gray-400 mt-1 italic">
                                        No notes provided
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      
                      {selectedEvent.departmentRequirements && (
                        selectedEvent.departmentRequirements.length > 2 || 
                        selectedEvent.departmentRequirements.some(dept => dept.requirements.length > 2)
                      ) && (
                        <div className="text-center pt-4 border-t border-gray-100">
                          <p className="text-sm text-gray-500">
                            Click "View All" to see complete requirements
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Classifications Card */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-3 p-6 border-b border-gray-100">
                    <div className="p-2 rounded-lg bg-black">
                      <FileText className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Classifications</h3>
                  </div>
                  <div className="p-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {selectedEvent.classifications || "No classifications provided"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Attachments Card */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-3 p-6 border-b border-gray-100">
                    <div className="p-2 rounded-lg bg-black">
                      <FileText className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Attachments</h3>
                  </div>
                  <div className="p-6">
                    {selectedEvent.attachments && selectedEvent.attachments.length > 0 ? (
                      <div className="space-y-2">
                        {selectedEvent.attachments.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="p-2 rounded-md bg-white shadow-sm">
                                <FileText className="h-4 w-4 text-black" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {file.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {(file.size / 1024).toFixed(1)} KB
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-3">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 hover:bg-gray-200"
                                onClick={() => {
                                  const viewUrl = getCloudinaryFileUrl(file.url);
                                  window.open(viewUrl, '_blank');
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 hover:bg-gray-200"
                                onClick={async () => {
                                  try {
                                    await downloadFile(file.url, file.name);
                                  } catch (error) {
                                    console.error('Download error:', error);
                                    toast.error('Failed to download file');
                                  }
                                }}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="p-3 rounded-lg bg-gray-100 inline-block mb-3">
                          <FileText className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-sm text-gray-500">
                          No attachments uploaded for this event
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
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
                className="absolute right-4 top-4 h-8 w-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full z-10"
                onClick={() => setIsRequirementsDialogOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>

              {/* Content Section */}
              <ScrollArea className="flex-1">
                <div className="p-8 space-y-6">
                  {selectedEvent.departmentRequirements && selectedEvent.departmentRequirements.length > 0 ? (
                    selectedEvent.departmentRequirements.map((dept, deptIndex) => (
                      <div key={deptIndex} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        {/* Department Header */}
                        <div className="bg-white border-b border-gray-200 p-6">
                          <h3 className="text-xl font-bold text-gray-900">
                            {dept.departmentName}
                          </h3>
                          <p className="text-gray-600 text-sm mt-1">
                            {dept.requirements.length} requirement{dept.requirements.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        
                        {/* Requirements Grid */}
                        <div className="p-6 bg-gray-50">
                          <div className={cn(
                            "grid gap-4",
                            {
                              'grid-cols-1': dept.requirements.length <= 2,
                              'grid-cols-2': dept.requirements.length > 2 && dept.requirements.length <= 6,
                              'grid-cols-3': dept.requirements.length > 6
                            }
                          )}>
                            {dept.requirements.map((req, reqIndex) => {
                              const requirement = typeof req === 'string' ? { name: req } : req;
                              return (
                                <div
                                  key={`${deptIndex}-${reqIndex}`}
                                  className="bg-white rounded-xl p-4 border border-gray-200 hover:border-gray-300 transition-colors shadow-sm"
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="p-2 rounded-lg bg-black mt-0.5">
                                      <FileText className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-semibold text-gray-900 text-sm mb-2">
                                        {requirement.name}
                                      </h4>
                                      {requirement.note ? (
                                        <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">
                                          {requirement.note}
                                        </p>
                                      ) : (
                                        <p className="text-xs text-gray-400 italic">
                                          No additional notes provided
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
                      <div className="p-4 rounded-xl bg-gray-100 inline-block mb-4">
                        <FileText className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        No Requirements Found
                      </h3>
                      <p className="text-sm text-gray-500">
                        No requirements have been specified for this event
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Event Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className={cn(
          "sm:max-w-[600px] p-6",
          isDarkMode ? "bg-slate-900" : "bg-white"
        )}>
          <DialogHeader>
            <DialogTitle className={cn(
              "text-2xl font-bold tracking-tight",
              isDarkMode ? "text-white" : "text-gray-900"
            )}>
              Edit Event
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500 mt-1">
              Update event details and information
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label className={cn(
                "text-sm font-medium",
                isDarkMode ? "text-gray-200" : "text-gray-700"
              )}>
                Event Title
              </Label>
              <Input
                name="title"
                value={editFormData.title}
                readOnly
                className={cn(
                  "h-10 cursor-not-allowed",
                  isDarkMode 
                    ? "bg-slate-900 border-slate-700 text-gray-400" 
                    : "bg-gray-100 border-gray-200 text-gray-600"
                )}
              />
            </div>

            {/* Location Section */}
            <div className="space-y-4">
              <Label className={cn(
                "text-sm font-medium",
                isDarkMode ? "text-gray-200" : "text-gray-700"
              )}>
                {editUseMultipleLocations ? "Multiple Locations" : "Location & Schedule"}
              </Label>

              {editUseMultipleLocations ? (
                /* Multiple Locations Mode */
                <div className="space-y-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditMultipleLocationsOpen(true)}
                    className={cn(
                      "w-full h-12 justify-between hover:bg-gray-50 hover:border-gray-300 hover:shadow-md transition-all duration-200 hover:scale-[1.02]",
                      isDarkMode 
                        ? "bg-slate-800 border-slate-700 text-white hover:bg-slate-700" 
                        : "bg-white border-gray-200 text-gray-900 hover:bg-gray-50"
                    )}
                  >
                    <div className="flex flex-col items-start">
                      <span>Configure multiple locations...</span>
                      <span className={cn(
                        "text-xs",
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      )}>
                        {editMultipleLocations.filter(loc => loc.location.trim()).length} location{editMultipleLocations.filter(loc => loc.location.trim()).length !== 1 ? 's' : ''} configured
                      </span>
                    </div>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </div>
              ) : (
                /* Single Location Mode */
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className={cn(
                      "text-sm font-medium",
                      isDarkMode ? "text-gray-200" : "text-gray-700"
                    )}>
                      Location
                    </Label>
                    <Popover open={isLocationOpen} onOpenChange={setIsLocationOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={isLocationOpen}
                          className={cn(
                            "w-full justify-between h-10",
                            isDarkMode 
                              ? "bg-slate-800 border-slate-700 text-white hover:bg-slate-700" 
                              : "bg-white border-gray-200 text-gray-900 hover:bg-gray-50"
                          )}
                        >
                          {editFormData.location || "Select location..."}
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent 
                        side="bottom"
                        align="start"
                        sideOffset={4}
                        avoidCollisions={false}
                        className={cn(
                          "w-[--radix-popover-trigger-width] max-h-[300px] p-0",
                          isDarkMode ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200"
                        )}
                      >
                        <Command className={isDarkMode ? "bg-slate-900" : "bg-white"}>
                          <CommandInput 
                            placeholder="Search locations..." 
                            className={isDarkMode ? "text-white" : "text-gray-900"}
                          />
                          <CommandEmpty className={cn(
                            "py-6 text-center text-sm",
                            isDarkMode ? "text-gray-400" : "text-gray-500"
                          )}>
                            No location found.
                          </CommandEmpty>
                          <CommandGroup className="max-h-[200px] overflow-y-auto">
                            <CommandItem
                              onSelect={() => {
                                setShowCustomLocationInput(true);
                                setIsLocationOpen(false);
                              }}
                              className={cn(
                                "cursor-pointer border-b",
                                isDarkMode 
                                  ? "text-blue-400 hover:bg-slate-800 border-slate-700" 
                                  : "text-blue-600 hover:bg-gray-100 border-gray-200"
                              )}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Add custom location
                            </CommandItem>
                            {defaultLocations.map((location) => (
                              <CommandItem
                                key={location}
                                value={location}
                                onSelect={(currentValue) => {
                                  setEditFormData(prev => ({ ...prev, location: currentValue }));
                                  setShowCustomLocationInput(false);
                                  setCustomLocation("");
                                  setIsLocationOpen(false);
                                }}
                                className={cn(
                                  "cursor-pointer",
                                  isDarkMode 
                                    ? "text-gray-200 hover:bg-slate-800" 
                                    : "text-gray-900 hover:bg-gray-100"
                                )}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    editFormData.location === location ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {location}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    
                    {/* Custom Location Input */}
                    {showCustomLocationInput && (
                      <div className="space-y-2 mt-2">
                        <Label className={cn(
                          "text-sm font-medium",
                          isDarkMode ? "text-gray-200" : "text-gray-700"
                        )}>
                          Custom Location
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter custom location"
                            value={customLocation}
                            onChange={(e) => setCustomLocation(e.target.value)}
                            className={cn(
                              "h-10 flex-1",
                              isDarkMode 
                                ? "bg-slate-800 border-slate-700" 
                                : "bg-white border-gray-200"
                            )}
                          />
                          <Button
                            type="button"
                            onClick={() => {
                              if (customLocation.trim()) {
                                setEditFormData(prev => ({ ...prev, location: customLocation.trim() }));
                                setShowCustomLocationInput(false);
                                setCustomLocation("");
                              }
                            }}
                            className="bg-black hover:bg-gray-800 text-white"
                          >
                            Add
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setShowCustomLocationInput(false);
                              setCustomLocation("");
                            }}
                            className={cn(
                              isDarkMode 
                                ? "border-slate-700 text-gray-300 hover:bg-slate-800" 
                                : "border-gray-200 text-gray-700 hover:bg-gray-100"
                            )}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Start Date & Time - Only show in single location mode */}
            {!editUseMultipleLocations && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className={cn(
                      "text-sm font-medium",
                      isDarkMode ? "text-gray-200" : "text-gray-700"
                    )}>
                      Start Date
                    </Label>
                    <Popover open={isStartCalendarOpen} onOpenChange={setIsStartCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start h-10",
                            isDarkMode 
                              ? "bg-slate-800 border-slate-700 text-white hover:bg-slate-700" 
                              : "bg-white border-gray-200 text-gray-900 hover:bg-gray-50"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(editStartDate, "MMM d, yyyy")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent 
                        className="w-auto p-0" 
                        align="start"
                        side="bottom"
                        sideOffset={4}
                      >
                        <ModernCalendar
                          selectedDate={editStartDate}
                          onDateSelect={(date) => {
                            setEditStartDate(date);
                            setIsStartCalendarOpen(false);
                          }}
                          isDarkMode={isDarkMode}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className={cn(
                      "text-sm font-medium",
                      isDarkMode ? "text-gray-200" : "text-gray-700"
                    )}>
                      Start Time
                    </Label>
                    <Select value={editStartTime} onValueChange={setEditStartTime}>
                      <SelectTrigger className={cn(
                        "h-10",
                        isDarkMode 
                          ? "bg-slate-800 border-slate-700 text-white" 
                          : "bg-white border-gray-200 text-gray-900"
                      )}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className={isDarkMode ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200"}>
                        {Array.from({ length: 26 }, (_, i) => {
                          const hour = Math.floor(i / 2) + 7;
                          const minute = i % 2 === 0 ? "00" : "30";
                          const time = `${hour.toString().padStart(2, '0')}:${minute}`;
                          const displayHour = hour > 12 ? hour - 12 : hour;
                          const period = hour >= 12 ? 'PM' : 'AM';
                          return (
                            <SelectItem key={time} value={time}>
                              {displayHour}:{minute} {period}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* End Date & Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className={cn(
                      "text-sm font-medium",
                      isDarkMode ? "text-gray-200" : "text-gray-700"
                    )}>
                      End Date
                    </Label>
                    <Popover open={isEndCalendarOpen} onOpenChange={setIsEndCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start h-10",
                            isDarkMode 
                              ? "bg-slate-800 border-slate-700 text-white hover:bg-slate-700" 
                              : "bg-white border-gray-200 text-gray-900 hover:bg-gray-50"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(editEndDate, "MMM d, yyyy")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent 
                        className="w-auto p-0" 
                        align="start"
                        side="bottom"
                        sideOffset={4}
                      >
                        <ModernCalendar
                          selectedDate={editEndDate}
                          onDateSelect={(date) => {
                            setEditEndDate(date);
                            setIsEndCalendarOpen(false);
                          }}
                          isDarkMode={isDarkMode}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className={cn(
                      "text-sm font-medium",
                      isDarkMode ? "text-gray-200" : "text-gray-700"
                    )}>
                      End Time
                    </Label>
                    <Select value={editEndTime} onValueChange={setEditEndTime}>
                      <SelectTrigger className={cn(
                        "h-10",
                        isDarkMode 
                          ? "bg-slate-800 border-slate-700 text-white" 
                          : "bg-white border-gray-200 text-gray-900"
                      )}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className={isDarkMode ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200"}>
                        {Array.from({ length: 26 }, (_, i) => {
                          const hour = Math.floor(i / 2) + 7;
                          const minute = i % 2 === 0 ? "00" : "30";
                          const time = `${hour.toString().padStart(2, '0')}:${minute}`;
                          const displayHour = hour > 12 ? hour - 12 : hour;
                          const period = hour >= 12 ? 'PM' : 'AM';
                          return (
                            <SelectItem key={time} value={time}>
                              {displayHour}:{minute} {period}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                className={cn(
                  isDarkMode 
                    ? "border-slate-700 text-gray-300 hover:bg-slate-800" 
                    : "border-gray-200 text-gray-700 hover:bg-gray-100"
                )}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  try {
                    // Track what changes were made
                    const changes = [];
                    
                    if (editUseMultipleLocations) {
                      // Handle multiple locations mode
                      
                      // Validate multiple locations
                      const validLocations = editMultipleLocations.filter(loc => loc.location.trim());
                      if (validLocations.length === 0) {
                        toast.error("Please add at least one location");
                        return;
                      }

                      // Validate each location's date/time
                      for (const loc of validLocations) {
                        const [startHours, startMinutes] = loc.startTime.split(':');
                        const startDateTime = new Date(loc.startDate);
                        startDateTime.setHours(parseInt(startHours), parseInt(startMinutes));
                        
                        const [endHours, endMinutes] = loc.endTime.split(':');
                        const endDateTime = new Date(loc.endDate);
                        endDateTime.setHours(parseInt(endHours), parseInt(endMinutes));

                        if (endDateTime <= startDateTime) {
                          toast.error(`End date/time must be after start date/time for location: ${loc.location}`);
                          return;
                        }
                      }

                      // Check for multiple locations changes
                      const originalHasMultiple = eventToEdit.isMultipleLocations && eventToEdit.locations && eventToEdit.locations.length > 0;
                      const currentMultipleLocations = validLocations.map(loc => {
                        const [startHours, startMinutes] = loc.startTime.split(':');
                        const startDateTime = new Date(loc.startDate);
                        startDateTime.setHours(parseInt(startHours), parseInt(startMinutes));
                        
                        const [endHours, endMinutes] = loc.endTime.split(':');
                        const endDateTime = new Date(loc.endDate);
                        endDateTime.setHours(parseInt(endHours), parseInt(endMinutes));

                        return {
                          location: loc.location,
                          startDate: Timestamp.fromDate(startDateTime),
                          endDate: Timestamp.fromDate(endDateTime)
                        };
                      });

                      if (!originalHasMultiple || JSON.stringify(eventToEdit.locations) !== JSON.stringify(currentMultipleLocations)) {
                        // Create detailed old value
                        let oldValueDetails = 'Single location';
                        if (originalHasMultiple && eventToEdit.locations) {
                          oldValueDetails = eventToEdit.locations.map((loc, idx) => 
                            `Location ${idx + 1}: ${loc.location}\n${format(new Date(loc.startDate.seconds * 1000), "MMM d, yyyy h:mm a")} - ${format(new Date(loc.endDate.seconds * 1000), "h:mm a")}`
                          ).join('\n\n');
                        }
                        
                        // Create detailed new value
                        const newValueDetails = validLocations.map((loc, idx) => {
                          const [startHours, startMinutes] = loc.startTime.split(':');
                          const startDateTime = new Date(loc.startDate);
                          startDateTime.setHours(parseInt(startHours), parseInt(startMinutes));
                          
                          const [endHours, endMinutes] = loc.endTime.split(':');
                          const endDateTime = new Date(loc.endDate);
                          endDateTime.setHours(parseInt(endHours), parseInt(endMinutes));
                          
                          return `Location ${idx + 1}: ${loc.location}\n${format(startDateTime, "MMM d, yyyy h:mm a")} - ${format(endDateTime, "h:mm a")}`;
                        }).join('\n\n');
                        
                        changes.push({
                          type: 'multipleLocations',
                          field: 'Multiple Locations',
                          oldValue: oldValueDetails,
                          newValue: newValueDetails,
                          timestamp: new Date(),
                          userId: auth.currentUser.uid,
                          userName: auth.currentUser.displayName || auth.currentUser.email
                        });
                      }

                      // Update in Firestore
                      const docRef = doc(db, 'eventRequests', eventToEdit.id);
                      const updateData = {
                        title: editFormData.title,
                        isMultipleLocations: true,
                        locations: currentMultipleLocations,
                        // Remove single location fields when using multiple locations
                        location: deleteField(),
                        startDate: deleteField(),
                        endDate: deleteField(),
                        updatedAt: serverTimestamp()
                      };

                      // Add recent activity if there are changes
                      if (changes.length > 0) {
                        updateData.recentActivity = [...(eventToEdit.recentActivity || []), ...changes.map(change => ({
                          ...change,
                          timestamp: Timestamp.fromDate(change.timestamp)
                        }))];
                      }

                      await updateDoc(docRef, updateData);

                      // Update Zustand store with the new data
                      await updateEvent(eventToEdit.id, {
                        title: editFormData.title,
                        isMultipleLocations: true,
                        locations: validLocations.map(loc => {
                          const [startHours, startMinutes] = loc.startTime.split(':');
                          const startDateTime = new Date(loc.startDate);
                          startDateTime.setHours(parseInt(startHours), parseInt(startMinutes));
                          
                          const [endHours, endMinutes] = loc.endTime.split(':');
                          const endDateTime = new Date(loc.endDate);
                          endDateTime.setHours(parseInt(endHours), parseInt(endMinutes));

                          return {
                            location: loc.location,
                            startDate: { seconds: Math.floor(startDateTime.getTime() / 1000) },
                            endDate: { seconds: Math.floor(endDateTime.getTime() / 1000) }
                          };
                        }),
                        recentActivity: [...(eventToEdit.recentActivity || []), ...changes]
                      });

                    } else {
                      // Handle single location mode
                      const originalStartDate = new Date(eventToEdit.startDate.seconds * 1000);
                      const originalEndDate = new Date(eventToEdit.endDate.seconds * 1000);
                      
                      // Combine dates and times for comparison
                      const [startHours, startMinutes] = editStartTime.split(':');
                      const newStartDate = new Date(editStartDate);
                      newStartDate.setHours(parseInt(startHours), parseInt(startMinutes));
                      
                      const [endHours, endMinutes] = editEndTime.split(':');
                      const newEndDate = new Date(editEndDate);
                      newEndDate.setHours(parseInt(endHours), parseInt(endMinutes));

                      // Validate that end date/time is after start date/time
                      if (newEndDate <= newStartDate) {
                        toast.error("End date/time must be after start date/time");
                        return;
                      }

                      // Check for location changes
                      if (editFormData.location !== eventToEdit.location) {
                        changes.push({
                          type: 'location',
                          field: 'Location',
                          oldValue: eventToEdit.location,
                          newValue: editFormData.location,
                          timestamp: new Date(),
                          userId: auth.currentUser.uid,
                          userName: auth.currentUser.displayName || auth.currentUser.email
                        });
                      }

                      // Check for start date/time changes
                      if (newStartDate.getTime() !== originalStartDate.getTime()) {
                        changes.push({
                          type: 'startDateTime',
                          field: 'Start Date & Time',
                          oldValue: format(originalStartDate, 'MMM dd, yyyy hh:mm a'),
                          newValue: format(newStartDate, 'MMM dd, yyyy hh:mm a'),
                          timestamp: new Date(),
                          userId: auth.currentUser.uid,
                          userName: auth.currentUser.displayName || auth.currentUser.email
                        });
                      }

                      // Check for end date/time changes
                      if (newEndDate.getTime() !== originalEndDate.getTime()) {
                        changes.push({
                          type: 'endDateTime',
                          field: 'End Date & Time',
                          oldValue: format(originalEndDate, 'MMM dd, yyyy hh:mm a'),
                          newValue: format(newEndDate, 'MMM dd, yyyy hh:mm a'),
                          timestamp: new Date(),
                          userId: auth.currentUser.uid,
                          userName: auth.currentUser.displayName || auth.currentUser.email
                        });
                      }

                      // Update in Firestore
                      const docRef = doc(db, 'eventRequests', eventToEdit.id);
                      const updateData = {
                        title: editFormData.title,
                        location: editFormData.location,
                        startDate: Timestamp.fromDate(newStartDate),
                        endDate: Timestamp.fromDate(newEndDate),
                        // Remove multiple locations when using single location
                        isMultipleLocations: false,
                        locations: deleteField(),
                        updatedAt: serverTimestamp()
                      };

                      // Add recent activity if there are changes
                      if (changes.length > 0) {
                        updateData.recentActivity = [...(eventToEdit.recentActivity || []), ...changes.map(change => ({
                          ...change,
                          timestamp: Timestamp.fromDate(change.timestamp)
                        }))];
                      }

                      await updateDoc(docRef, updateData);

                      // Update Zustand store with the new data
                      await updateEvent(eventToEdit.id, {
                        title: editFormData.title,
                        location: editFormData.location,
                        startDate: { seconds: Math.floor(newStartDate.getTime() / 1000) },
                        endDate: { seconds: Math.floor(newEndDate.getTime() / 1000) },
                        recentActivity: [...(eventToEdit.recentActivity || []), ...changes]
                      });
                    }

                    setIsEditDialogOpen(false);
                    
                    if (changes.length > 0) {
                      toast.success(`Event updated successfully. ${changes.length} change${changes.length > 1 ? 's' : ''} recorded.`);
                    } else {
                      toast.success("Event updated successfully");
                    }
                  } catch (error) {
                    console.error("Error updating event:", error);
                    toast.error("Failed to update event");
                    
                    // Revert optimistic update on error
                    await fetchEvents(auth.currentUser.uid);
                  }
                }}
                className="bg-black hover:bg-gray-800 text-white"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Multiple Locations Modal for Edit */}
      <Dialog open={isEditMultipleLocationsOpen} onOpenChange={setIsEditMultipleLocationsOpen}>
        <DialogContent className={cn(
          "sm:max-w-[800px] max-h-[90vh] overflow-y-auto",
          isDarkMode ? "bg-slate-900" : "bg-white"
        )}>
          <DialogHeader>
            <DialogTitle className={cn(
              "text-2xl font-bold tracking-tight",
              isDarkMode ? "text-white" : "text-gray-900"
            )}>
              Configure Multiple Locations
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500 mt-1">
              Set up different locations with their respective dates and times
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 space-y-4">
            {editMultipleLocations.map((location, index) => (
              <div key={location.id} className={cn(
                "p-6 rounded-lg space-y-4 shadow-sm border",
                isDarkMode ? "border-slate-700 bg-slate-800" : "border-gray-200 bg-white shadow-sm"
              )}>
                <div className="flex items-center justify-between">
                  <h3 className={cn(
                    "text-lg font-semibold",
                    isDarkMode ? "text-white" : "text-gray-900"
                  )}>
                    Location {index + 1}
                  </h3>
                  {editMultipleLocations.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditMultipleLocations(prev => prev.filter((_, i) => i !== index));
                      }}
                      className={cn(
                        "text-red-600 hover:text-red-700 hover:bg-red-50",
                        isDarkMode ? "border-slate-600 hover:bg-red-900/20" : "border-gray-300"
                      )}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Location Name */}
                <div className="space-y-2">
                  <Label className={cn(
                    "text-sm font-medium",
                    isDarkMode ? "text-gray-200" : "text-gray-700"
                  )}>
                    Location Name
                  </Label>
                  <Popover 
                    open={editMultipleLocationDropdowns[location.id]} 
                    onOpenChange={(open) => {
                      setEditMultipleLocationDropdowns(prev => ({
                        ...prev,
                        [location.id]: open
                      }));
                    }}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={editMultipleLocationDropdowns[location.id]}
                        className={cn(
                          "w-full justify-between h-10",
                          isDarkMode 
                            ? "bg-slate-700 border-slate-600 text-white hover:bg-slate-600" 
                            : "bg-white border-gray-300 text-gray-900 hover:bg-gray-50"
                        )}
                      >
                        {location.location || "Select location..."}
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent 
                      side="bottom"
                      align="start"
                      sideOffset={4}
                      avoidCollisions={false}
                      className={cn(
                        "w-[--radix-popover-trigger-width] max-h-[300px] p-0",
                        isDarkMode ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"
                      )}
                    >
                      <Command className={isDarkMode ? "bg-slate-800" : "bg-white"}>
                        <CommandInput 
                          placeholder="Search locations..." 
                          className={isDarkMode ? "text-white" : "text-gray-900"}
                        />
                        <CommandEmpty className={cn(
                          "py-6 text-center text-sm",
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        )}>
                          No location found.
                        </CommandEmpty>
                        <CommandGroup className="max-h-[200px] overflow-y-auto">
                          <CommandItem
                            onSelect={() => {
                              setEditMultipleShowCustomInputs(prev => ({
                                ...prev,
                                [location.id]: true
                              }));
                              setEditMultipleLocationDropdowns(prev => ({
                                ...prev,
                                [location.id]: false
                              }));
                            }}
                            className={cn(
                              "cursor-pointer border-b",
                              isDarkMode 
                                ? "text-blue-400 hover:bg-slate-700 border-slate-600" 
                                : "text-blue-600 hover:bg-gray-100 border-gray-200"
                            )}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add custom location
                          </CommandItem>
                          {defaultLocations.map((defaultLocation) => (
                            <CommandItem
                              key={defaultLocation}
                              value={defaultLocation}
                              onSelect={(currentValue) => {
                                const newLocations = [...editMultipleLocations];
                                newLocations[index].location = currentValue;
                                setEditMultipleLocations(newLocations);
                                setEditMultipleShowCustomInputs(prev => ({
                                  ...prev,
                                  [location.id]: false
                                }));
                                setEditMultipleCustomLocations(prev => ({
                                  ...prev,
                                  [location.id]: ""
                                }));
                                setEditMultipleLocationDropdowns(prev => ({
                                  ...prev,
                                  [location.id]: false
                                }));
                              }}
                              className={cn(
                                "cursor-pointer",
                                isDarkMode 
                                  ? "text-gray-200 hover:bg-slate-700" 
                                  : "text-gray-900 hover:bg-gray-100"
                              )}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  location.location === defaultLocation ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {defaultLocation}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  
                  {/* Custom Location Input */}
                  {editMultipleShowCustomInputs[location.id] && (
                    <div className="space-y-2 mt-2">
                      <Label className={cn(
                        "text-sm font-medium",
                        isDarkMode ? "text-gray-200" : "text-gray-700"
                      )}>
                        Custom Location
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter custom location"
                          value={editMultipleCustomLocations[location.id] || ""}
                          onChange={(e) => {
                            setEditMultipleCustomLocations(prev => ({
                              ...prev,
                              [location.id]: e.target.value
                            }));
                          }}
                          className={cn(
                            "h-10 flex-1",
                            isDarkMode 
                              ? "bg-slate-700 border-slate-600 text-white" 
                              : "bg-white border-gray-300"
                          )}
                        />
                        <Button
                          type="button"
                          onClick={() => {
                            if (editMultipleCustomLocations[location.id]?.trim()) {
                              const newLocations = [...editMultipleLocations];
                              newLocations[index].location = editMultipleCustomLocations[location.id].trim();
                              setEditMultipleLocations(newLocations);
                              setEditMultipleShowCustomInputs(prev => ({
                                ...prev,
                                [location.id]: false
                              }));
                              setEditMultipleCustomLocations(prev => ({
                                ...prev,
                                [location.id]: ""
                              }));
                            }
                          }}
                          className="bg-black hover:bg-gray-800 text-white"
                        >
                          Add
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setEditMultipleShowCustomInputs(prev => ({
                              ...prev,
                              [location.id]: false
                            }));
                            setEditMultipleCustomLocations(prev => ({
                              ...prev,
                              [location.id]: ""
                            }));
                          }}
                          className={cn(
                            isDarkMode 
                              ? "border-slate-600 text-gray-300 hover:bg-slate-700" 
                              : "border-gray-300 text-gray-700 hover:bg-gray-100"
                          )}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Date and Time Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Start Date */}
                  <div className="space-y-2">
                    <Label className={cn(
                      "text-sm font-medium",
                      isDarkMode ? "text-gray-200" : "text-gray-700"
                    )}>
                      Start Date
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start h-10",
                            isDarkMode 
                              ? "bg-slate-700 border-slate-600 text-white hover:bg-slate-600" 
                              : "bg-white border-gray-300 hover:bg-gray-50"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(location.startDate, "MMM d, yyyy")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <ModernCalendar
                          selectedDate={location.startDate}
                          onDateSelect={(date) => {
                            const newLocations = [...editMultipleLocations];
                            newLocations[index].startDate = date;
                            setEditMultipleLocations(newLocations);
                          }}
                          isDarkMode={isDarkMode}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Start Time */}
                  <div className="space-y-2">
                    <Label className={cn(
                      "text-sm font-medium",
                      isDarkMode ? "text-gray-200" : "text-gray-700"
                    )}>
                      Start Time
                    </Label>
                    <Select 
                      value={location.startTime} 
                      onValueChange={(time) => {
                        const newLocations = [...editMultipleLocations];
                        newLocations[index].startTime = time;
                        setEditMultipleLocations(newLocations);
                      }}
                    >
                      <SelectTrigger className={cn(
                        "h-10",
                        isDarkMode 
                          ? "bg-slate-700 border-slate-600 text-white" 
                          : "bg-white border-gray-300"
                      )}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className={isDarkMode ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"}>
                        {Array.from({ length: 26 }, (_, i) => {
                          const hour = Math.floor(i / 2) + 7;
                          const minute = i % 2 === 0 ? "00" : "30";
                          const time = `${hour.toString().padStart(2, '0')}:${minute}`;
                          const displayHour = hour > 12 ? hour - 12 : hour;
                          const period = hour >= 12 ? 'PM' : 'AM';
                          return (
                            <SelectItem key={time} value={time}>
                              {displayHour}:{minute} {period}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* End Date */}
                  <div className="space-y-2">
                    <Label className={cn(
                      "text-sm font-medium",
                      isDarkMode ? "text-gray-200" : "text-gray-700"
                    )}>
                      End Date
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start h-10",
                            isDarkMode 
                              ? "bg-slate-700 border-slate-600 text-white hover:bg-slate-600" 
                              : "bg-white border-gray-300 hover:bg-gray-50"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(location.endDate, "MMM d, yyyy")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <ModernCalendar
                          selectedDate={location.endDate}
                          onDateSelect={(date) => {
                            const newLocations = [...editMultipleLocations];
                            newLocations[index].endDate = date;
                            setEditMultipleLocations(newLocations);
                          }}
                          isDarkMode={isDarkMode}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* End Time */}
                  <div className="space-y-2">
                    <Label className={cn(
                      "text-sm font-medium",
                      isDarkMode ? "text-gray-200" : "text-gray-700"
                    )}>
                      End Time
                    </Label>
                    <Select 
                      value={location.endTime} 
                      onValueChange={(time) => {
                        const newLocations = [...editMultipleLocations];
                        newLocations[index].endTime = time;
                        setEditMultipleLocations(newLocations);
                      }}
                    >
                      <SelectTrigger className={cn(
                        "h-10",
                        isDarkMode 
                          ? "bg-slate-700 border-slate-600 text-white" 
                          : "bg-white border-gray-300"
                      )}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className={isDarkMode ? "bg-slate-800 border-slate-600" : "bg-white border-gray-200"}>
                        {Array.from({ length: 26 }, (_, i) => {
                          const hour = Math.floor(i / 2) + 7;
                          const minute = i % 2 === 0 ? "00" : "30";
                          const time = `${hour.toString().padStart(2, '0')}:${minute}`;
                          const displayHour = hour > 12 ? hour - 12 : hour;
                          const period = hour >= 12 ? 'PM' : 'AM';
                          return (
                            <SelectItem key={time} value={time}>
                              {displayHour}:{minute} {period}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}


            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setIsEditMultipleLocationsOpen(false)}
                className={cn(
                  isDarkMode 
                    ? "border-slate-600 text-gray-300 hover:bg-slate-800" 
                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
                )}
              >
                Cancel
              </Button>
              <Button
                onClick={() => setIsEditMultipleLocationsOpen(false)}
                className="bg-black hover:bg-gray-800 text-white"
              >
                Save Locations
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Activity Changes Dialog */}
      <Dialog open={isActivityDialogOpen} onOpenChange={setIsActivityDialogOpen}>
        <DialogContent className="sm:max-w-[700px] p-0 border-0 bg-white rounded-2xl overflow-hidden">
          {selectedEventActivity && (
            <ScrollArea className="max-h-[80vh]">
              <div className="relative bg-white p-6 border-b border-gray-200">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-4 h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600"
                  onClick={() => setIsActivityDialogOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
                <DialogTitle className="text-xl font-bold text-gray-900 mb-2">
                  Recent Changes
                </DialogTitle>
                <p className="text-gray-600">All change history for {selectedEventActivity.title}</p>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Combined Event Changes */}
                {selectedEventActivity.recentActivity && selectedEventActivity.recentActivity.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-black mb-3 flex items-center gap-2">
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      Event Configuration Changes
                    </h3>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="space-y-4">
                        {/* Updated Configuration */}
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-sm font-semibold text-gray-700">Updated Configuration</span>
                          </div>
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="text-sm text-gray-800 space-y-2">
                              {/* Location Changes */}
                              {selectedEventActivity.recentActivity
                                .filter(activity => activity.type === 'location')
                                .map((activity, index) => (
                                  <div key={`location-new-${index}`}>
                                    <span className="font-medium">Location: </span>
                                    {activity.newValue}
                                  </div>
                                ))
                              }
                              {/* Start Date Changes */}
                              {selectedEventActivity.recentActivity
                                .filter(activity => activity.type === 'startDateTime')
                                .map((activity, index) => (
                                  <div key={`start-new-${index}`}>
                                    <span className="font-medium">Start Date & Time: </span>
                                    {activity.newValue}
                                  </div>
                                ))
                              }
                              {/* End Date Changes */}
                              {selectedEventActivity.recentActivity
                                .filter(activity => activity.type === 'endDateTime')
                                .map((activity, index) => (
                                  <div key={`end-new-${index}`}>
                                    <span className="font-medium">End Date & Time: </span>
                                    {activity.newValue}
                                  </div>
                                ))
                              }
                            </div>
                          </div>
                        </div>

                        {/* Previous Configuration */}
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <span className="text-sm font-semibold text-gray-700">Previous Configuration</span>
                          </div>
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <div className="text-sm text-gray-800 space-y-2">
                              {/* Location Changes */}
                              {selectedEventActivity.recentActivity
                                .filter(activity => activity.type === 'location')
                                .map((activity, index) => (
                                  <div key={`location-old-${index}`}>
                                    <span className="font-medium">Location: </span>
                                    {activity.oldValue || 'Not set'}
                                  </div>
                                ))
                              }
                              {/* Start Date Changes */}
                              {selectedEventActivity.recentActivity
                                .filter(activity => activity.type === 'startDateTime')
                                .map((activity, index) => (
                                  <div key={`start-old-${index}`}>
                                    <span className="font-medium">Start Date & Time: </span>
                                    {activity.oldValue || 'Not set'}
                                  </div>
                                ))
                              }
                              {/* End Date Changes */}
                              {selectedEventActivity.recentActivity
                                .filter(activity => activity.type === 'endDateTime')
                                .map((activity, index) => (
                                  <div key={`end-old-${index}`}>
                                    <span className="font-medium">End Date & Time: </span>
                                    {activity.oldValue || 'Not set'}
                                  </div>
                                ))
                              }
                            </div>
                          </div>
                        </div>

                        <div className="text-sm text-black pt-2 border-t border-gray-200">
                          Changed by {selectedEventActivity.recentActivity[0]?.userName} • {(() => {
                            try {
                              const activity = selectedEventActivity.recentActivity[0];
                              let date;
                              if (activity.timestamp?.toDate) {
                                date = activity.timestamp.toDate();
                              } else if (activity.timestamp?.seconds) {
                                date = new Date(activity.timestamp.seconds * 1000);
                              } else if (activity.timestamp) {
                                date = new Date(activity.timestamp);
                              } else {
                                return "Unknown time";
                              }
                              return format(date, 'MMM d, yyyy h:mm a');
                            } catch (error) {
                              console.error('Date formatting error:', error);
                              return "Invalid date";
                            }
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Multiple Locations Changes */}
                {selectedEventActivity.recentActivity && selectedEventActivity.recentActivity.some(activity => activity.type === 'multipleLocations') && (
                  <div>
                    <h3 className="text-lg font-semibold text-black mb-3 flex items-center gap-2">
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      Multiple Locations Changes
                    </h3>
                    <div className="space-y-3">
                      {selectedEventActivity.recentActivity
                        .filter(activity => activity.type === 'multipleLocations')
                        .map((activity, index) => (
                          <div key={index} className="border border-gray-200 rounded-lg p-4">
                            <div className="space-y-3">
                              {/* Updated Configuration */}
                              <div className="mb-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                  <span className="text-sm font-semibold text-gray-700">Updated Configuration</span>
                                </div>
                                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                  <div className="text-sm text-gray-800 whitespace-pre-line">
                                    {activity.newValue}
                                  </div>
                                </div>
                              </div>

                              {/* Previous Configuration */}
                              <div className="mb-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                  <span className="text-sm font-semibold text-gray-700">Previous Configuration</span>
                                </div>
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                  <div className="text-sm text-gray-800 whitespace-pre-line">
                                    {activity.oldValue || 'Not set'}
                                  </div>
                                </div>
                              </div>
                              <div className="text-sm text-black pt-2 border-t border-gray-200">
                                Changed by {activity.userName} • {(() => {
                                  try {
                                    let date;
                                    if (activity.timestamp?.toDate) {
                                      date = activity.timestamp.toDate();
                                    } else if (activity.timestamp?.seconds) {
                                      date = new Date(activity.timestamp.seconds * 1000);
                                    } else if (activity.timestamp) {
                                      date = new Date(activity.timestamp);
                                    } else {
                                      return "Unknown time";
                                    }
                                    return format(date, 'MMM d, yyyy h:mm a');
                                  } catch (error) {
                                    console.error('Date formatting error:', error);
                                    return "Invalid date";
                                  }
                                })()}
                              </div>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                )}

                {/* No Changes Message */}
                {selectedEventActivity.recentActivity && selectedEventActivity.recentActivity.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No recent changes found for this event.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default MyEvents;