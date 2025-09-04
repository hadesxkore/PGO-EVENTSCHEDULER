import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import "./styles.css";
import { downloadFile } from "@/lib/utils/downloadFile";
import { getCloudinaryFileUrl } from "@/lib/cloudinary";
import { useTheme } from "@/contexts/ThemeContext";
import { auth, db } from "@/lib/firebase/firebase";
import { doc, updateDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
import useEventStore from "@/store/eventStore";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Calendar,
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
  Pencil,
  RotateCw,
  MessageCircle,
} from "lucide-react";
import { format } from "date-fns";
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
import { Badge } from "@/components/ui/badge";
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
  const [eventToEdit, setEventToEdit] = useState(null);
  const [editFormData, setEditFormData] = useState({
    title: "",
    location: "",
    participants: "",
    vip: "",
    vvip: "",
    classifications: "",
  });
  const itemsPerPage = 10;

  // Zustand store
  const { 
    events, 
    loading, 
    error,
    fetchUserEvents, 
    deleteEvent,
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
      const eventsRef = collection(db, 'eventRequests');
      const q = query(eventsRef, where('userId', '==', userId));
      const snapshot = await getDocs(q);
      
      const updatedEvents = [];
      snapshot.forEach((doc) => {
        updatedEvents.push({ id: doc.id, ...doc.data() });
      });

      // Transform events to handle both old and new date formats
      const transformedEvents = updatedEvents.map(event => {
        let parsedDate;
        
        // Handle different date formats
        if (event.startDate) {
          // New format: startDate field
          if (event.startDate.toDate) {
            parsedDate = event.startDate.toDate();
          } else if (event.startDate.seconds) {
            parsedDate = new Date(event.startDate.seconds * 1000);
          } else {
            parsedDate = new Date(event.startDate);
          }
        } else if (event.date?.seconds) {
          // Old format: date field with seconds
          parsedDate = new Date(event.date.seconds * 1000);
        } else {
          // Fallback: try to parse as string or use current date
          parsedDate = new Date(event.date || Date.now());
        }
        
        return {
          ...event,
          parsedDate,
          displayDate: parsedDate
        };
      });

      // Sort events by parsed date, most recent first
      const sortedEvents = transformedEvents.sort((a, b) => {
        if (!a.parsedDate || !b.parsedDate) return 0;
        return new Date(b.parsedDate) - new Date(a.parsedDate);
      });

      useEventStore.setState({ events: sortedEvents });
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
    return event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.location.toLowerCase().includes(searchTerm.toLowerCase());
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
      className="max-w-7xl mx-auto px-6 pt-4 pb-6"
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
          <div className="px-6">
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
                      isDarkMode ? "border-slate-700 hover:bg-transparent" : "border-gray-100 hover:bg-transparent"
                    )}>
                      <TableHead className="w-[180px] py-4 font-semibold">Event Title</TableHead>
                      <TableHead className="text-center font-semibold">Requestor</TableHead>
                      <TableHead className="text-center font-semibold">Start Date</TableHead>
                      <TableHead className="text-center font-semibold">End Date</TableHead>
                      <TableHead className="text-center font-semibold">Location</TableHead>
                      <TableHead className="text-center font-semibold">Participants</TableHead>
                      <TableHead className="text-center font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEvents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((event) => (
                      <TableRow 
                        key={event.id} 
                        className={cn(
                          isDarkMode 
                            ? "border-slate-700" 
                            : "border-gray-100"
                        )}
                      >
                        <TableCell>
                          <div className="max-w-[250px]">
                            <span className={cn(
                              "px-3 py-1.5 rounded-md inline-block font-medium whitespace-nowrap overflow-hidden text-ellipsis",
                              isDarkMode 
                                ? "bg-blue-500/10 text-blue-400" 
                                : "bg-blue-50 text-blue-600"
                            )} title={event.title}>
                              {event.title.length > 35 
                                ? `${event.title.substring(0, 35)}...` 
                                : event.title}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div>
                            <p className={cn(
                              "text-sm font-medium",
                              isDarkMode ? "text-gray-100" : "text-gray-900"
                            )}>{event.requestor}</p>
                            <p className={cn(
                              "text-xs",
                              isDarkMode ? "text-gray-400" : "text-gray-500"
                            )}>{event.department}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="space-y-1">
                            <p className={cn(
                              "text-xs",
                              isDarkMode ? "text-gray-100" : "text-gray-900"
                            )}>{event.startDate?.seconds ? format(new Date(event.startDate.seconds * 1000), "MMM d, yyyy h:mm a") : "Not set"}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="space-y-1">
                            <p className={cn(
                              "text-xs",
                              isDarkMode ? "text-gray-100" : "text-gray-900"
                            )}>{event.endDate?.seconds ? format(new Date(event.endDate.seconds * 1000), "MMM d, yyyy h:mm a") : "Not set"}</p>
                          </div>
                        </TableCell>

                        <TableCell className="text-center">
                          <p className={cn(
                            "text-xs",
                            isDarkMode ? "text-gray-100" : "text-gray-900"
                          )}>{event.location}</p>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className={cn(
                            "px-3 py-1.5 rounded-md text-sm font-medium inline-block",
                            isDarkMode 
                              ? "bg-green-500/10 text-green-400" 
                              : "bg-green-50 text-green-600"
                          )}>
                            {event.participants} attendees
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              onClick={() => {
                                setSelectedEvent(event);
                                setIsViewDialogOpen(true);
                              }}
                              className="bg-black hover:bg-gray-800 text-white gap-2"
                              size="sm"
                            >
                              <Eye className="h-4 w-4" />
                              View
                            </Button>
                            <Button
                              onClick={() => {
                                setEventToEdit(event);
                                setEditFormData({
                                  title: event.title,
                                  location: event.location,
                                  participants: event.participants,
                                  vip: event.vip || "",
                                  vvip: event.vvip || "",
                                  classifications: event.classifications || "",
                                });
                                setIsEditDialogOpen(true);
                              }}
                              size="sm"
                              className="gap-2 bg-black hover:bg-gray-800 text-white"
                            >
                              <Pencil className="h-4 w-4" />
                              Edit
                            </Button>
                            <Button
                              onClick={() => navigate('/messages', {
                                state: {
                                  selectedUser: {
                                    isDepartmentMessage: true,
                                    department: event.departmentRequirements?.[0]?.departmentName || event.department,
                                    eventTitle: event.title,
                                    eventId: event.id
                                  }
                                }
                              })}
                              size="sm"
                              className="gap-2 bg-blue-400 hover:bg-blue-500 text-white"
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
                {filteredEvents.length > itemsPerPage && (
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
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            className={cn(
                              "cursor-pointer",
                              currentPage === 1 && "pointer-events-none opacity-50"
                            )}
                          />
                        </PaginationItem>
                        {Array.from({ length: Math.min(5, Math.ceil(filteredEvents.length / itemsPerPage)) }).map((_, i) => (
                          <PaginationItem key={i}>
                            <PaginationLink
                              onClick={() => setCurrentPage(i + 1)}
                              isActive={currentPage === i + 1}
                              className="cursor-pointer"
                            >
                              {i + 1}
                            </PaginationLink>
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
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* View Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className={cn(
          "sm:max-w-[700px] p-0 border-none",
          isDarkMode ? "bg-slate-900" : "bg-white"
        )}>
          {selectedEvent && (
            <ScrollArea className="h-[80vh]">
              {/* Content Section */}
              <div className="p-4">
                {/* Title and Department Section */}
                <div className="mb-4 px-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className={cn(
                      "font-medium px-2 py-0.5 text-xs",
                      isDarkMode ? "border-blue-500/20 text-blue-400" : "border-blue-500/20 text-blue-500"
                    )}>
                      {selectedEvent.department}
                    </Badge>
                  </div>
                  <DialogTitle className={cn(
                    "text-lg font-bold tracking-tight",
                    isDarkMode ? "text-white" : "text-gray-900"
                  )}>
                    {selectedEvent.title}
                  </DialogTitle>
                </div>

                {/* Event Details Grid */}
                <div className="grid grid-cols-3 gap-3">
                  {/* Requestor Card */}
                  <div className={cn(
                    "rounded-md p-3 border",
                    isDarkMode 
                      ? "bg-slate-800/50 border-slate-700" 
                      : "bg-white border-gray-100"
                  )}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={cn(
                        "p-1.5 rounded",
                        isDarkMode ? "bg-blue-500/10" : "bg-blue-50"
                      )}>
                        <User className="h-4 w-4 text-blue-500" />
                      </div>
                      <h3 className={cn(
                        "font-semibold",
                        isDarkMode ? "text-white" : "text-gray-900"
                      )}>Requestor</h3>
                    </div>
                    <div className="flex flex-col">
                      <p className={cn(
                        "text-lg font-medium mb-1",
                        isDarkMode ? "text-gray-200" : "text-gray-700"
                      )}>
                        {selectedEvent.requestor}
                      </p>
                      <p className={cn(
                        "text-sm",
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      )}>
                        {selectedEvent.department}
                      </p>
                    </div>
                  </div>

                  {/* Date & Time Card */}
                  <div className={cn(
                    "rounded-md p-3 border",
                    isDarkMode 
                      ? "bg-slate-800/50 border-slate-700" 
                      : "bg-white border-gray-100"
                  )}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={cn(
                        "p-1.5 rounded",
                        isDarkMode ? "bg-blue-500/10" : "bg-blue-50"
                      )}>
                        <Calendar className="h-4 w-4 text-blue-500" />
                      </div>
                      <h3 className={cn(
                        "font-semibold",
                        isDarkMode ? "text-white" : "text-gray-900"
                      )}>Date & Time</h3>
                    </div>
                    <div className="space-y-3">
                      {/* Start Date */}
                      <div>
                        <p className={cn(
                          "text-sm font-medium mb-1",
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        )}>
                          Start Date & Time
                        </p>
                        <p className={cn(
                          "text-base font-medium",
                          isDarkMode ? "text-gray-200" : "text-gray-700"
                        )}>
                          {selectedEvent.startDate ? 
                            format(selectedEvent.startDate.toDate ? selectedEvent.startDate.toDate() : new Date(selectedEvent.startDate), "MMMM d, yyyy h:mm a") :
                            selectedEvent.date?.seconds ? 
                              format(new Date(selectedEvent.date.seconds * 1000), "MMMM d, yyyy h:mm a") :
                              "Not available"
                          }
                        </p>
                      </div>
                      {/* End Date */}
                      <div>
                        <p className={cn(
                          "text-sm font-medium mb-1",
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        )}>
                          End Date & Time
                        </p>
                        <p className={cn(
                          "text-base font-medium",
                          isDarkMode ? "text-gray-200" : "text-gray-700"
                        )}>
                          {selectedEvent.endDate ? 
                            format(selectedEvent.endDate.toDate ? selectedEvent.endDate.toDate() : new Date(selectedEvent.endDate), "MMMM d, yyyy h:mm a") :
                            "Not available"
                          }
                        </p>
                      </div>

                    </div>
                  </div>

                  {/* Location Card */}
                  <div className={cn(
                    "rounded-md p-3 border",
                    isDarkMode 
                      ? "bg-slate-800/50 border-slate-700" 
                      : "bg-white border-gray-100"
                  )}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={cn(
                        "p-1.5 rounded",
                        isDarkMode ? "bg-green-500/10" : "bg-green-50"
                      )}>
                        <MapPin className="h-4 w-4 text-green-500" />
                      </div>
                      <h3 className={cn(
                        "font-semibold",
                        isDarkMode ? "text-white" : "text-gray-900"
                      )}>Location</h3>
                    </div>
                    <p className={cn(
                      "text-lg font-medium mb-1",
                      isDarkMode ? "text-gray-200" : "text-gray-700"
                    )}>
                      {selectedEvent.location}
                    </p>
                    <p className={cn(
                      "text-sm",
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    )}>
                      Venue
                    </p>
                  </div>

                  {/* Participants Card */}
                  <div className={cn(
                    "rounded-md p-3 border",
                    isDarkMode 
                      ? "bg-slate-800/50 border-slate-700" 
                      : "bg-white border-gray-100"
                  )}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={cn(
                        "p-1.5 rounded",
                        isDarkMode ? "bg-orange-500/10" : "bg-orange-50"
                      )}>
                        <Users className="h-4 w-4 text-orange-500" />
                      </div>
                      <h3 className={cn(
                        "font-semibold",
                        isDarkMode ? "text-white" : "text-gray-900"
                      )}>Participants</h3>
                    </div>
                    <p className={cn(
                      "text-lg font-medium mb-1",
                      isDarkMode ? "text-gray-200" : "text-gray-700"
                    )}>
                      {selectedEvent.participants} attendees
                    </p>
                    <p className={cn(
                      "text-sm",
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    )}>
                      Expected Attendance
                    </p>
                  </div>

                  {/* VIP Card */}
                  <div className={cn(
                    "rounded-md p-3 border",
                    isDarkMode 
                      ? "bg-slate-800/50 border-slate-700" 
                      : "bg-white border-gray-100"
                  )}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={cn(
                        "p-1.5 rounded",
                        isDarkMode ? "bg-purple-500/10" : "bg-purple-50"
                      )}>
                        <User className="h-4 w-4 text-purple-500" />
                      </div>
                      <h3 className={cn(
                        "font-semibold",
                        isDarkMode ? "text-white" : "text-gray-900"
                      )}>VIP</h3>
                    </div>
                    <p className={cn(
                      "text-lg font-medium mb-1",
                      isDarkMode ? "text-gray-200" : "text-gray-700"
                    )}>
                      {selectedEvent.vip || 0} VIPs
                    </p>
                    <p className={cn(
                      "text-sm",
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    )}>
                      VIP Attendees
                    </p>
                  </div>

                  {/* VVIP Card */}
                  <div className={cn(
                    "rounded-md p-3 border",
                    isDarkMode 
                      ? "bg-slate-800/50 border-slate-700" 
                      : "bg-white border-gray-100"
                  )}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={cn(
                        "p-1.5 rounded",
                        isDarkMode ? "bg-red-500/10" : "bg-red-50"
                      )}>
                        <User className="h-4 w-4 text-red-500" />
                      </div>
                      <h3 className={cn(
                        "font-semibold",
                        isDarkMode ? "text-white" : "text-gray-900"
                      )}>VVIP</h3>
                    </div>
                    <p className={cn(
                      "text-lg font-medium mb-1",
                      isDarkMode ? "text-gray-200" : "text-gray-700"
                    )}>
                      {selectedEvent.vvip || 0} VVIPs
                    </p>
                    <p className={cn(
                      "text-sm",
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    )}>
                      VVIP Attendees
                    </p>
                  </div>
                </div>

                {/* Requirements Card */}
                <div className={cn(
                  "rounded-xl p-5 border",
                  isDarkMode 
                    ? "bg-slate-800/50 border-slate-700" 
                    : "bg-white border-gray-100"
                )}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-1.5 rounded",
                        isDarkMode ? "bg-pink-500/10" : "bg-pink-50"
                      )}>
                        <FileText className="h-5 w-5 text-pink-500" />
                      </div>
                      <h3 className={cn(
                        "font-semibold",
                        isDarkMode ? "text-white" : "text-gray-900"
                      )}>Requirements</h3>
                    </div>
                    <Button
                      size="sm"
                      className={cn(
                        "gap-2 bg-black hover:bg-gray-900 text-white border-0"
                      )}
                                             onClick={() => {
                         setIsRequirementsDialogOpen(true);
                       }}
                    >
                      <Eye className="h-4 w-4" />
                      View Full Details
                    </Button>
                  </div>
                  <div className="relative">
                    <div className={cn(
                      "rounded-lg p-4 text-sm relative",
                      isDarkMode 
                        ? "bg-slate-900/50 text-gray-300" 
                        : "bg-gray-50 text-gray-600"
                    )}>
                      {selectedEvent.departmentRequirements && selectedEvent.departmentRequirements.slice(0, 2).map((dept, deptIndex) => (
                        <div key={deptIndex} className="mb-4 last:mb-0">
                          <h4 className={cn(
                            "text-sm font-medium mb-2",
                            isDarkMode ? "text-gray-200" : "text-gray-700"
                          )}>
                            {dept.departmentName}
                          </h4>
                          {dept.requirements.slice(0, 2).map((req, reqIndex) => {
                            const requirement = typeof req === 'string' ? { name: req } : req;
                            return (
                              <div
                                key={`${deptIndex}-${reqIndex}`}
                                className={cn(
                                  "mb-2 last:mb-0 flex items-start gap-2",
                                  isDarkMode ? "text-gray-300" : "text-gray-600"
                                )}
                              >
                                <div className={cn(
                                  "p-1.5 rounded-md mt-0.5",
                                  isDarkMode ? "bg-slate-800" : "bg-white",
                                  "shadow-sm"
                                )}>
                                  <FileText className="h-4 w-4 text-blue-500" />
                                </div>
                                <div>
                                  <div>
                                    <span className={cn(
                                      "font-semibold block",
                                      isDarkMode ? "text-gray-200" : "text-gray-700"
                                    )}>
                                      {requirement.name}
                                    </span>
                                    <div className="mt-1 space-y-0.5">
                                      <span className={cn(
                                        "text-xs block",
                                        isDarkMode ? "text-gray-400" : "text-gray-500"
                                      )}>
                                        Sample 1: orem ipsum dolor sit amet, consectetur adipiscing elit.
                                      </span>
                                      <span className={cn(
                                        "text-xs block",
                                        isDarkMode ? "text-gray-400" : "text-gray-500"
                                      )}>
                                        Sample 2: orem ipsum dolor sit amet, consectetur adipiscing elit.
                                      </span>
                                      <span className={cn(
                                        "text-xs block",
                                        isDarkMode ? "text-gray-400" : "text-gray-500"
                                      )}>
                                        Sample 3: orem ipsum dolor sit amet, consectetur adipiscing elit.
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                      
                      {selectedEvent.departmentRequirements && (
                        selectedEvent.departmentRequirements.length > 2 || 
                        selectedEvent.departmentRequirements.some(dept => dept.requirements.length > 2)
                      ) && (
                        <>
                          <div className={cn(
                            "absolute bottom-0 left-0 right-0 h-24 rounded-b-lg",
                            isDarkMode
                              ? "bg-gradient-to-t from-slate-900/90 via-slate-900/50 to-transparent"
                              : "bg-gradient-to-t from-gray-50/90 via-gray-50/50 to-transparent"
                          )} />
                          <div className={cn(
                            "absolute bottom-2 left-0 right-0 text-sm font-medium text-center",
                            isDarkMode ? "text-blue-400" : "text-blue-600"
                          )}>
                            Click "View Full Details" to see all requirements
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Classifications Card */}
                <div className={cn(
                  "rounded-xl p-5 border mb-4",
                  isDarkMode 
                    ? "bg-slate-800/50 border-slate-700" 
                    : "bg-white border-gray-100"
                )}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={cn(
                      "p-2.5 rounded-lg",
                      isDarkMode ? "bg-indigo-500/10" : "bg-indigo-50"
                    )}>
                      <FileText className="h-5 w-5 text-indigo-500" />
                    </div>
                    <h3 className={cn(
                      "font-semibold",
                      isDarkMode ? "text-white" : "text-gray-900"
                    )}>Classifications</h3>
                  </div>
                  <div className={cn(
                    "rounded-lg p-4",
                    isDarkMode ? "bg-slate-900/50" : "bg-gray-50"
                  )}>
                    <p className={cn(
                      "text-base leading-relaxed whitespace-pre-wrap",
                      isDarkMode ? "text-gray-300" : "text-gray-700"
                    )}>
                      {selectedEvent.classifications || "No classifications provided"}
                    </p>
                  </div>
                </div>

                {/* Attachments Card */}
                <div className={cn(
                  "rounded-xl p-4 border",
                  isDarkMode 
                    ? "bg-slate-800/50 border-slate-700" 
                    : "bg-white border-gray-100"
                )}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={cn(
                      "p-2 rounded-lg",
                      isDarkMode ? "bg-teal-500/10" : "bg-teal-50"
                    )}>
                      <FileText className="h-5 w-5 text-teal-500" />
                    </div>
                    <h3 className={cn(
                      "font-semibold",
                      isDarkMode ? "text-white" : "text-gray-900"
                    )}>Attachments</h3>
                  </div>
                  <div className={cn(
                    "rounded-lg mt-2",
                    isDarkMode ? "bg-slate-900/50" : "bg-gray-50"
                  )}>
                    {selectedEvent.attachments && selectedEvent.attachments.length > 0 ? (
                      <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {selectedEvent.attachments.map((file, index) => (
                          <div
                            key={index}
                            className={cn(
                              "flex items-center justify-between py-2 px-3",
                              "first:rounded-t-lg last:rounded-b-lg",
                              isDarkMode 
                                ? "hover:bg-slate-900/80" 
                                : "hover:bg-gray-100"
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={cn(
                                "p-1.5 rounded-md shrink-0",
                                isDarkMode ? "bg-teal-500/10" : "bg-teal-50"
                              )}>
                                <FileText className="h-3.5 w-3.5 text-teal-500" />
                              </div>
                              <div className="min-w-0">
                                <p className={cn(
                                  "text-sm font-medium truncate",
                                  isDarkMode ? "text-gray-200" : "text-gray-900"
                                )}>{file.name}</p>
                                <p className={cn(
                                  "text-xs",
                                  isDarkMode ? "text-gray-400" : "text-gray-500"
                                )}>{(file.size / 1024).toFixed(1)} KB</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 ml-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className={cn(
                                  "h-7 w-7 p-0",
                                  isDarkMode ? "hover:bg-slate-800" : "hover:bg-gray-200"
                                )}
                                onClick={() => {
                                  const viewUrl = getCloudinaryFileUrl(file.url);
                                  window.open(viewUrl, '_blank');
                                }}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className={cn(
                                  "h-7 w-7 p-0",
                                  isDarkMode ? "hover:bg-slate-800" : "hover:bg-gray-200"
                                )}
                                onClick={async () => {
                                  try {
                                    await downloadFile(file.url, file.name);
                                  } catch (error) {
                                    console.error('Download error:', error);
                                    toast.error('Failed to download file');
                                  }
                                }}
                              >
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-3 px-4 text-center">
                        <p className={cn(
                          "text-sm",
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        )}>
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
        <DialogContent className={cn(
          "sm:max-w-[800px] border-none shadow-lg p-6",
          isDarkMode ? "bg-slate-900" : "bg-white"
        )}>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "absolute right-4 top-4 h-8 w-8 p-0 rounded-full",
              isDarkMode ? "hover:bg-gray-700 text-gray-400 hover:text-gray-100" : "hover:bg-gray-100 text-gray-500 hover:text-gray-900"
            )}
            onClick={() => setIsRequirementsDialogOpen(false)}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>

          {selectedEvent && (
            <div className="space-y-6">
              {/* Header */}
              <div>
                <DialogTitle className={cn(
                  "text-xl font-bold tracking-tight pr-8",
                  isDarkMode ? "text-white" : "text-gray-900"
                )}>
                  Event Requirements
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-500 mt-2">
                  Requirements and specifications for {selectedEvent.title}
                </DialogDescription>
              </div>

              {/* Requirements List */}
              <div className="space-y-4">
                {selectedEvent.departmentRequirements && selectedEvent.departmentRequirements.length > 0 ? (
                  selectedEvent.departmentRequirements.map((dept, deptIndex) => (
                    <div key={deptIndex} className="space-y-4">
                      <h3 className={cn(
                        "text-lg font-semibold",
                        isDarkMode ? "text-white" : "text-gray-900"
                      )}>
                        {dept.departmentName}
                      </h3>
                      <div className={cn(
                        "grid gap-3",
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
                              className={cn(
                                "rounded-lg p-3",
                                isDarkMode ? "bg-black" : "bg-gray-50"
                              )}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <div className={cn(
                                  "p-1.5 rounded-lg shrink-0",
                                  isDarkMode ? "bg-slate-800" : "bg-white"
                                )}>
                                  <FileText className="h-4 w-4 text-blue-500" />
                                </div>
                                <h3 className={cn(
                                  "text-sm font-semibold",
                                  isDarkMode ? "text-white" : "text-gray-900"
                                )}>
                                  {requirement.name}
                                </h3>
                              </div>
                              <div className="mt-1 pl-8 space-y-0.5">
                                <span className={cn(
                                  "text-xs block",
                                  isDarkMode ? "text-gray-400" : "text-gray-600"
                                )}>
                                  Sample 1: orem ipsum dolor sit amet, consectetur adipiscing elit.
                                </span>
                                <span className={cn(
                                  "text-xs block",
                                  isDarkMode ? "text-gray-400" : "text-gray-600"
                                )}>
                                  Sample 2: orem ipsum dolor sit amet, consectetur adipiscing elit.
                                </span>
                                <span className={cn(
                                  "text-xs block",
                                  isDarkMode ? "text-gray-400" : "text-gray-600"
                                )}>
                                  Sample 3: orem ipsum dolor sit amet, consectetur adipiscing elit.
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={cn(
                    "rounded-lg p-6 text-center",
                    isDarkMode ? "bg-black" : "bg-gray-50"
                  )}>
                    <p className={cn(
                      "text-sm",
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    )}>
                      No requirements specified for this event
                    </p>
                  </div>
                )}
              </div>
            </div>
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
                onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
                className={cn(
                  "h-10",
                  isDarkMode 
                    ? "bg-slate-800 border-slate-700" 
                    : "bg-white border-gray-200"
                )}
              />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label className={cn(
                "text-sm font-medium",
                isDarkMode ? "text-gray-200" : "text-gray-700"
              )}>
                Location
              </Label>
              <Input
                name="location"
                value={editFormData.location}
                onChange={(e) => setEditFormData(prev => ({ ...prev, location: e.target.value }))}
                className={cn(
                  "h-10",
                  isDarkMode 
                    ? "bg-slate-800 border-slate-700" 
                    : "bg-white border-gray-200"
                )}
              />
            </div>

            {/* Participants, VIP, VVIP Grid */}
            <div className="grid grid-cols-3 gap-4">
              {/* Participants */}
              <div className="space-y-2">
                <Label className={cn(
                  "text-sm font-medium",
                  isDarkMode ? "text-gray-200" : "text-gray-700"
                )}>
                  No. of Participants
                </Label>
                <Input
                  name="participants"
                  type="number"
                  value={editFormData.participants}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, participants: e.target.value }))}
                  className={cn(
                    "h-10",
                    isDarkMode 
                      ? "bg-slate-800 border-slate-700" 
                      : "bg-white border-gray-200"
                  )}
                />
              </div>

              {/* VIP */}
              <div className="space-y-2">
                <Label className={cn(
                  "text-sm font-medium",
                  isDarkMode ? "text-gray-200" : "text-gray-700"
                )}>
                  No. of VIP
                </Label>
                <Input
                  name="vip"
                  type="number"
                  value={editFormData.vip}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, vip: e.target.value }))}
                  className={cn(
                    "h-10",
                    isDarkMode 
                      ? "bg-slate-800 border-slate-700" 
                      : "bg-white border-gray-200"
                  )}
                />
              </div>

              {/* VVIP */}
              <div className="space-y-2">
                <Label className={cn(
                  "text-sm font-medium",
                  isDarkMode ? "text-gray-200" : "text-gray-700"
                )}>
                  No. of VVIP
                </Label>
                <Input
                  name="vvip"
                  type="number"
                  value={editFormData.vvip}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, vvip: e.target.value }))}
                  className={cn(
                    "h-10",
                    isDarkMode 
                      ? "bg-slate-800 border-slate-700" 
                      : "bg-white border-gray-200"
                  )}
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className={cn(
                "text-sm font-medium",
                isDarkMode ? "text-gray-200" : "text-gray-700"
              )}>
                Description
              </Label>
              <textarea
                name="classifications"
                value={editFormData.classifications}
                onChange={(e) => setEditFormData(prev => ({ ...prev, classifications: e.target.value }))}
                className={cn(
                  "w-full min-h-[100px] rounded-lg p-3 text-base resize-none border",
                  isDarkMode 
                    ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" 
                    : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
                )}
              />
            </div>

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
                    // Optimistically update the UI
                    const updatedEvent = {
                      ...eventToEdit,
                      ...editFormData,
                      updatedAt: new Date()
                    };
                    
                    useEventStore.setState(state => ({
                      events: state.events.map(event => 
                        event.id === eventToEdit.id ? updatedEvent : event
                      )
                    }));

                    setIsEditDialogOpen(false);

                    // Update in Firestore
                    const docRef = doc(db, "eventRequests", eventToEdit.id);
                    await updateDoc(docRef, {
                      ...editFormData,
                      updatedAt: serverTimestamp()
                    });

                    toast.success("Event updated successfully");
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
    </motion.div>
  );
};

export default MyEvents;