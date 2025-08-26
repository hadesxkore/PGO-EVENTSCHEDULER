import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { downloadFile } from "@/lib/utils/downloadFile";
import { getCloudinaryFileUrl } from "@/lib/cloudinary";
import { useTheme } from "@/contexts/ThemeContext";
import { auth } from "@/lib/firebase/firebase";
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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isRequirementsDialogOpen, setIsRequirementsDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
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

  useEffect(() => {
    // Check if user is authenticated
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        toast.error("Please login to view your events");
        clearStore();
        navigate('/');
      } else {
        fetchUserEvents(user.uid);
      }
    });

    return () => {
      unsubscribe();
      clearStore();
    };
  }, [navigate, fetchUserEvents, clearStore]);

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
                              "text-sm font-medium",
                              isDarkMode ? "text-gray-100" : "text-gray-900"
                            )}>{format(new Date(event.date.seconds * 1000), "MMM d, yyyy")}</p>
                            <p className={cn(
                              "text-xs",
                              isDarkMode ? "text-gray-400" : "text-gray-500"
                            )}>{format(new Date(event.date.seconds * 1000), "h:mm a")}</p>
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
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className={cn(
          "sm:max-w-[700px] p-0 border-none overflow-hidden",
          isDarkMode ? "bg-slate-900" : "bg-white"
        )}>
          {selectedEvent && (
            <div>
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
                <div className="grid grid-cols-2 gap-3">
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
                        "text-sm font-medium mb-1",
                        isDarkMode ? "text-gray-200" : "text-gray-700"
                      )}>
                        {selectedEvent.requestor}
                      </p>
                      <p className={cn(
                        "text-xs",
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      )}>
                        {selectedEvent.department}
                      </p>
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
                    <div className="space-y-2">
                      <div>
                        <p className={cn(
                          "text-sm font-medium",
                          isDarkMode ? "text-gray-200" : "text-gray-700"
                        )}>
                          {format(new Date(selectedEvent.date.seconds * 1000), "MMMM d, yyyy")}
                        </p>
                        <p className={cn(
                          "text-xs",
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        )}>
                          {format(new Date(selectedEvent.date.seconds * 1000), "h:mm a")}
                        </p>
                      </div>
                      <div className={cn(
                        "inline-flex items-center gap-2 px-3 py-1 rounded-md text-sm",
                        isDarkMode ? "bg-purple-500/10 text-purple-400" : "bg-purple-50 text-purple-600"
                      )}>
                        <Clock className="h-4 w-4" />
                        {selectedEvent.duration} minutes
                      </div>
                    </div>
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
                      {selectedEvent.requirements && selectedEvent.requirements.slice(0, 2).map((req, index) => {
                        const requirement = typeof req === 'string' ? { name: req } : req;
                        return (
                          <div
                            key={index}
                            className={cn(
                              "mb-3 last:mb-0 flex items-start gap-2",
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
                              <span className={cn(
                                "font-semibold block",
                                isDarkMode ? "text-gray-200" : "text-gray-700"
                              )}>
                                {requirement.name}
                              </span>
                              {requirement.note && (
                                <span className={cn(
                                  "text-xs block mt-0.5",
                                  isDarkMode ? "text-gray-400" : "text-gray-500"
                                )}>
                                  {requirement.note}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      
                      {selectedEvent.requirements && selectedEvent.requirements.length > 2 && (
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

                {/* Attachments Card */}
                <div className={cn(
                  "rounded-xl p-5 border",
                  isDarkMode 
                    ? "bg-slate-800/50 border-slate-700" 
                    : "bg-white border-gray-100"
                )}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={cn(
                      "p-2.5 rounded-lg",
                      isDarkMode ? "bg-teal-500/10" : "bg-teal-50"
                    )}>
                      <FileText className="h-5 w-5 text-teal-500" />
                    </div>
                    <h3 className={cn(
                      "font-semibold",
                      isDarkMode ? "text-white" : "text-gray-900"
                    )}>Attachments</h3>
                  </div>
                  {selectedEvent.attachments && selectedEvent.attachments.length > 0 ? (
                    <div className="space-y-3">
                      {selectedEvent.attachments.map((file, index) => (
                        <div
                          key={index}
                          className={cn(
                            "flex items-center justify-between rounded-lg p-3",
                            isDarkMode 
                              ? "bg-slate-900/50 hover:bg-slate-900/80" 
                              : "bg-gray-50 hover:bg-gray-100"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "p-2 rounded-lg",
                              isDarkMode ? "bg-teal-500/10" : "bg-teal-50"
                            )}>
                              <FileText className="h-4 w-4 text-teal-500" />
                            </div>
                            <div>
                              <p className={cn(
                                "text-sm font-medium",
                                isDarkMode ? "text-gray-200" : "text-gray-900"
                              )}>{file.name}</p>
                              <p className={cn(
                                "text-xs",
                                isDarkMode ? "text-gray-400" : "text-gray-500"
                              )}>{(file.size / 1024).toFixed(1)} KB</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              className="gap-2 bg-black hover:bg-gray-800 text-white"
                              onClick={() => {
                                const viewUrl = getCloudinaryFileUrl(file.url);
                                window.open(viewUrl, '_blank');
                              }}
                            >
                              <Eye className="h-4 w-4" />
                              View
                            </Button>
                            <Button
                              size="sm"
                              className="gap-2 bg-black hover:bg-gray-800 text-white"
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
                              Download
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={cn(
                      "rounded-lg p-4 text-center",
                      isDarkMode 
                        ? "bg-slate-900/50" 
                        : "bg-gray-50"
                    )}>
                      <p className={cn(
                        "text-xs",
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      )}>
                        No attachments uploaded for this event
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Requirements Dialog */}
      <Dialog open={isRequirementsDialogOpen} onOpenChange={setIsRequirementsDialogOpen}>
        <DialogContent className={cn(
          "sm:max-w-[800px] border-none shadow-lg p-6",
          isDarkMode ? "bg-slate-900" : "bg-white"
        )}>
          {selectedEvent && (
            <div className="space-y-6">
              {/* Header */}
              <div>
                <DialogTitle className={cn(
                  "text-xl font-bold tracking-tight",
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
                {selectedEvent.requirements.map((req, index) => {
                  const requirement = typeof req === 'string' ? { name: req } : req;
                  return (
                    <div
                      key={index}
                      className={cn(
                        "rounded-lg p-4",
                        isDarkMode ? "bg-black" : "bg-gray-50"
                      )}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className={cn(
                          "p-2 rounded-lg",
                          isDarkMode ? "bg-slate-800" : "bg-white"
                        )}>
                          <FileText className="h-5 w-5 text-blue-500" />
                        </div>
                        <h3 className={cn(
                          "font-semibold",
                          isDarkMode ? "text-white" : "text-gray-900"
                        )}>
                          {requirement.name}
                        </h3>
                      </div>
                      {requirement.note && (
                        <div className={cn(
                          "mt-2 pl-11 text-sm",
                          isDarkMode ? "text-gray-400" : "text-gray-600"
                        )}>
                          {requirement.note}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
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