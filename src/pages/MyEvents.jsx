import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { downloadFile } from "@/lib/utils/downloadFile";
import { getCloudinaryFileUrl } from "@/lib/cloudinary";
import { useTheme } from "@/contexts/ThemeContext";
import { auth } from "@/lib/firebase/firebase";
import { getUserEventRequests, deleteEventRequest } from "@/lib/firebase/eventRequests";
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
  Trash2,
  Download,
} from "lucide-react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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



const MyEvents = () => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  const itemsPerPage = 10;

  const handleDelete = async () => {
    if (!eventToDelete) return;
    
    try {
      const result = await deleteEventRequest(eventToDelete.id);
      if (result.success) {
        toast.success("Event deleted successfully");
        // Refresh events list
        const currentUser = auth.currentUser;
        if (currentUser) {
          await fetchUserEvents(currentUser.uid);
        }
      } else {
        toast.error("Failed to delete event");
      }
    } catch (error) {
      console.error("Error deleting event:", error);
      toast.error("An error occurred while deleting the event");
    } finally {
      setIsDeleteDialogOpen(false);
      setEventToDelete(null);
    }
  };

  useEffect(() => {
    // Check if user is authenticated
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        toast.error("Please login to view your events");
        navigate('/');
      } else {
        fetchUserEvents(user.uid);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const fetchUserEvents = async (userId) => {
    try {
      setLoading(true);
      console.log("Fetching events for user:", userId);
      const result = await getUserEventRequests(userId);
      console.log("Got result:", result);
      
      if (result.success) {
        // Sort events by date, most recent first
        const sortedEvents = result.requests.sort((a, b) => {
          const dateA = a.date?.seconds ? new Date(a.date.seconds * 1000) : new Date(0);
          const dateB = b.date?.seconds ? new Date(b.date.seconds * 1000) : new Date(0);
          return dateB - dateA;
        });
        setEvents(sortedEvents);
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
          <Button
            onClick={() => navigate('/request-event')}
            className="bg-black hover:bg-gray-800 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Request Event
          </Button>
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
                      <TableHead className="text-center font-semibold">Date & Time</TableHead>
                      <TableHead className="text-center font-semibold">Duration</TableHead>
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
                          <span className={cn(
                            "px-3 py-1.5 rounded-md inline-block font-medium",
                            isDarkMode 
                              ? "bg-blue-500/10 text-blue-400" 
                              : "bg-blue-50 text-blue-600"
                          )}>
                            {event.title}
                          </span>
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
                              "text-sm font-medium",
                              isDarkMode ? "text-gray-100" : "text-gray-900"
                            )}>{format(new Date(event.date.seconds * 1000), "MMM d, yyyy")}</p>
                            <p className={cn(
                              "text-sm",
                              isDarkMode ? "text-gray-400" : "text-gray-500"
                            )}>{format(new Date(event.date.seconds * 1000), "h:mm a")}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className={cn(
                            "px-3 py-1.5 rounded-md text-sm font-medium inline-block",
                            isDarkMode 
                              ? "bg-purple-500/10 text-purple-400" 
                              : "bg-purple-50 text-purple-600"
                          )}>
                            {event.duration} mins
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <p className={cn(
                            "text-sm",
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
                                setEventToDelete(event);
                                setIsDeleteDialogOpen(true);
                              }}
                              size="sm"
                              className="gap-2 bg-red-500 hover:bg-red-600 text-white"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
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

      {/* View Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className={cn(
          "sm:max-w-[800px] border-0 p-0 shadow-lg",
          isDarkMode ? "bg-slate-900" : "bg-white"
        )}>
          {selectedEvent && (
            <>
              {/* Header Section */}
              <div className={cn(
                "p-6 border-b",
                isDarkMode ? "border-slate-800" : "border-gray-100"
              )}>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                  <DialogTitle className={cn(
                      "text-xl font-semibold tracking-tight",
                    isDarkMode ? "text-white" : "text-gray-900"
                  )}>
                    {selectedEvent.title}
                  </DialogTitle>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className={cn(
                          "text-sm",
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        )}>
                          {selectedEvent.requestor}
                        </span>
                      </div>
                      <span className={cn(
                        "h-1 w-1 rounded-full",
                        isDarkMode ? "bg-gray-700" : "bg-gray-300"
                      )} />
                      <span className={cn(
                        "text-sm",
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      )}>
                        {selectedEvent.department}
                      </span>
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "capitalize text-sm font-medium px-3 py-1",
                      selectedEvent.status === 'approved' ? "bg-green-500/10 text-green-500" :
                      selectedEvent.status === 'rejected' ? "bg-red-500/10 text-red-500" :
                      "bg-yellow-500/10 text-yellow-500"
                    )}
                  >
                    {selectedEvent.status}
                  </Badge>
                </div>
              </div>

              {/* Content Section */}
              <div className="p-6 space-y-8">
                {/* Event Details Grid */}
                <div className="grid grid-cols-2 gap-6">
                  <div className={cn(
                    "p-4 rounded-xl",
                    isDarkMode ? "bg-slate-800" : "bg-gray-50"
                  )}>
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="h-5 w-5 text-blue-500" />
                      <h3 className={cn(
                        "font-medium",
                        isDarkMode ? "text-gray-200" : "text-gray-700"
                      )}>Date & Time</h3>
                    </div>
                    <div className="space-y-1">
                      <p className={cn(
                        "text-lg font-medium",
                        isDarkMode ? "text-gray-100" : "text-gray-900"
                      )}>
                        {format(new Date(selectedEvent.date.seconds * 1000), "MMMM d, yyyy")}
                      </p>
                      <p className={cn(
                        "text-sm",
                        isDarkMode ? "text-blue-400" : "text-blue-600"
                      )}>
                        {format(new Date(selectedEvent.date.seconds * 1000), "h:mm a")}
                      </p>
                    </div>
                  </div>

                  <div className={cn(
                    "p-4 rounded-xl",
                    isDarkMode ? "bg-slate-800" : "bg-gray-50"
                  )}>
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin className="h-5 w-5 text-green-500" />
                      <h3 className={cn(
                        "font-medium",
                        isDarkMode ? "text-gray-200" : "text-gray-700"
                      )}>Location</h3>
                    </div>
                    <p className={cn(
                      "text-lg font-medium",
                      isDarkMode ? "text-gray-100" : "text-gray-900"
                    )}>
                      {selectedEvent.location}
                    </p>
                  </div>

                  <div className={cn(
                    "p-4 rounded-xl",
                    isDarkMode ? "bg-slate-800" : "bg-gray-50"
                  )}>
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="h-5 w-5 text-purple-500" />
                      <h3 className={cn(
                        "font-medium",
                        isDarkMode ? "text-gray-200" : "text-gray-700"
                      )}>Duration</h3>
                    </div>
                    <p className={cn(
                      "text-lg font-medium",
                      isDarkMode ? "text-gray-100" : "text-gray-900"
                    )}>
                      {selectedEvent.duration} minutes
                    </p>
                  </div>

                  <div className={cn(
                    "p-4 rounded-xl",
                    isDarkMode ? "bg-slate-800" : "bg-gray-50"
                  )}>
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="h-5 w-5 text-orange-500" />
                      <h3 className={cn(
                        "font-medium",
                        isDarkMode ? "text-gray-200" : "text-gray-700"
                      )}>Participants</h3>
                    </div>
                    <p className={cn(
                      "text-lg font-medium",
                      isDarkMode ? "text-gray-100" : "text-gray-900"
                    )}>
                      {selectedEvent.participants} attendees
                    </p>
                  </div>
                </div>

                {/* Requirements Section */}
                <div className={cn(
                  "p-4 rounded-xl",
                  isDarkMode ? "bg-slate-800" : "bg-gray-50"
                )}>
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="h-5 w-5 text-pink-500" />
                    <h3 className={cn(
                      "font-medium",
                      isDarkMode ? "text-gray-200" : "text-gray-700"
                    )}>Requirements</h3>
                  </div>
                  <div className={cn(
                    "text-sm leading-relaxed",
                    isDarkMode ? "text-gray-300" : "text-gray-600"
                  )}>
                    {selectedEvent.provisions}
                  </div>
                </div>

                {/* Attachments Section */}
                {selectedEvent.attachments && selectedEvent.attachments.length > 0 && (
                  <div className={cn(
                    "p-4 rounded-xl",
                    isDarkMode ? "bg-slate-800" : "bg-gray-50"
                  )}>
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="h-5 w-5 text-teal-500" />
                      <h3 className={cn(
                        "font-medium",
                        isDarkMode ? "text-gray-200" : "text-gray-700"
                      )}>Attachments</h3>
                      </div>
                    <div className="grid grid-cols-1 gap-2">
                        {selectedEvent.attachments.map((file, index) => (
                        <div
                            key={index}
                            className={cn(
                            "flex items-center justify-between p-3 rounded-lg transition-colors",
                              isDarkMode 
                              ? "bg-slate-900" 
                              : "bg-white"
                            )}
                          >
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-teal-500 flex-shrink-0" />
                            <div>
                              <p className={cn(
                                "font-medium",
                                isDarkMode ? "text-gray-100" : "text-gray-900"
                              )}>{file.name}</p>
                              <p className={cn(
                                "text-sm",
                                isDarkMode ? "text-gray-400" : "text-gray-500"
                              )}>{(file.size / 1024).toFixed(1)} KB</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className={cn(
                                "text-sm font-medium",
                                isDarkMode ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"
                              )}
                              onClick={() => {
                                const viewUrl = getCloudinaryFileUrl(file.url);
                                window.open(viewUrl, '_blank');
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={cn(
                                "text-sm font-medium",
                                isDarkMode ? "text-teal-400 hover:text-teal-300" : "text-teal-600 hover:text-teal-700"
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
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                          </div>
                        </div>
                        ))}
                      </div>
                    </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className={cn(
          isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white"
        )}>
          <AlertDialogHeader>
            <AlertDialogTitle className={isDarkMode ? "text-white" : "text-gray-900"}>
              Delete Event Request
            </AlertDialogTitle>
            <AlertDialogDescription className={isDarkMode ? "text-gray-400" : "text-gray-500"}>
              Are you sure you want to delete this event request? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              className={cn(
                "border-0",
                isDarkMode ? "bg-slate-800 hover:bg-slate-700 text-gray-100" : ""
              )}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600 text-white border-0"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default MyEvents;