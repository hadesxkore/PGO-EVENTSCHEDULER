import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";
import { auth } from "@/lib/firebase/firebase";
import { getUserEventRequests } from "@/lib/firebase/eventRequests";
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
  rejected: "bg-red-500/10 text-red-500",
};

const MyEvents = () => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
      const result = await getUserEventRequests(userId);
      
      if (result.success) {
        // Sort events by date, most recent first
        const sortedEvents = result.requests.sort((a, b) => {
          return new Date(b.date.seconds * 1000) - new Date(a.date.seconds * 1000);
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
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
    return matchesSearch && matchesStatus;
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
      className="max-w-7xl mx-auto"
    >
      {/* Header */}
      <motion.div variants={item} className="mb-8">
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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger
            className={cn(
              "w-[160px]",
              isDarkMode
                ? "bg-slate-900 border-slate-700"
                : "bg-white border-gray-200"
            )}
          >
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <SelectValue placeholder="Filter" />
            </div>
          </SelectTrigger>
          <SelectContent
            className={cn(
              "border-2",
              isDarkMode 
                ? "bg-slate-900 border-slate-700" 
                : "bg-white border-gray-200"
            )}
          >
            <SelectItem 
              value="all" 
              className={cn(
                isDarkMode ? "focus:bg-slate-800" : "focus:bg-gray-100",
                isDarkMode ? "text-gray-100" : "text-gray-900"
              )}
            >
              All Events
            </SelectItem>
            <SelectItem 
              value="pending" 
              className={cn(
                isDarkMode ? "focus:bg-slate-800" : "focus:bg-gray-100",
                isDarkMode ? "text-gray-100" : "text-gray-900"
              )}
            >
              Pending
            </SelectItem>
            <SelectItem 
              value="approved" 
              className={cn(
                isDarkMode ? "focus:bg-slate-800" : "focus:bg-gray-100",
                isDarkMode ? "text-gray-100" : "text-gray-900"
              )}
            >
              Approved
            </SelectItem>
            <SelectItem 
              value="rejected" 
              className={cn(
                isDarkMode ? "focus:bg-slate-800" : "focus:bg-gray-100",
                isDarkMode ? "text-gray-100" : "text-gray-900"
              )}
            >
              Rejected
            </SelectItem>
          </SelectContent>
        </Select>
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
                      <TableHead className="text-center font-semibold">Status</TableHead>
                      <TableHead className="text-right font-semibold">Actions</TableHead>
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
                            )}>{event.userDepartment}</p>
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
                          <Badge
                            variant="secondary"
                            className={cn(
                              "capitalize inline-flex items-center gap-1 font-medium",
                              statusColors[event.status]
                            )}
                          >
                            {event.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
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
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
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
          "sm:max-w-[600px]",
          isDarkMode ? "bg-slate-900" : "bg-white"
        )}>
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle className={cn(
                  "text-xl font-semibold flex items-center justify-between",
                  isDarkMode ? "text-white" : "text-gray-900"
                )}>
                  <span>{selectedEvent.title}</span>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "capitalize",
                      statusColors[selectedEvent.status]
                    )}
                  >
                    {selectedEvent.status}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <Separator className={isDarkMode ? "bg-slate-700" : "bg-gray-200"} />

              <div className="space-y-6 py-4">
                {/* Date and Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className={cn(
                      "text-sm font-medium mb-2",
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    )}>Date & Time</h4>
                    <div className={cn(
                      "p-3 rounded-lg",
                      isDarkMode ? "bg-slate-800" : "bg-gray-50"
                    )}>
                      <p className={cn(
                        "text-sm font-medium",
                        isDarkMode ? "text-gray-100" : "text-gray-900"
                      )}>
                        {format(new Date(selectedEvent.date.seconds * 1000), "PPP")}
                      </p>
                      <p className={cn(
                        "text-sm mt-1",
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      )}>
                        {format(new Date(selectedEvent.date.seconds * 1000), "h:mm a")}
                      </p>
                    </div>
                  </div>
                  <div>
                    <h4 className={cn(
                      "text-sm font-medium mb-2",
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    )}>Duration</h4>
                    <div className={cn(
                      "p-3 rounded-lg",
                      isDarkMode ? "bg-slate-800" : "bg-gray-50"
                    )}>
                      <p className={cn(
                        "text-sm font-medium",
                        isDarkMode ? "text-gray-100" : "text-gray-900"
                      )}>
                        {selectedEvent.duration} minutes
                      </p>
                    </div>
                  </div>
                </div>

                {/* Location and Participants */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className={cn(
                      "text-sm font-medium mb-2",
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    )}>Location</h4>
                    <div className={cn(
                      "p-3 rounded-lg",
                      isDarkMode ? "bg-slate-800" : "bg-gray-50"
                    )}>
                      <p className={cn(
                        "text-sm font-medium",
                        isDarkMode ? "text-gray-100" : "text-gray-900"
                      )}>
                        {selectedEvent.location}
                      </p>
                    </div>
                  </div>
                  <div>
                    <h4 className={cn(
                      "text-sm font-medium mb-2",
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    )}>Participants</h4>
                    <div className={cn(
                      "p-3 rounded-lg",
                      isDarkMode ? "bg-slate-800" : "bg-gray-50"
                    )}>
                      <p className={cn(
                        "text-sm font-medium",
                        isDarkMode ? "text-gray-100" : "text-gray-900"
                      )}>
                        {selectedEvent.participants} attendees
                      </p>
                    </div>
                  </div>
                </div>

                {/* Provisions */}
                <div>
                  <h4 className={cn(
                    "text-sm font-medium mb-2",
                    isDarkMode ? "text-gray-400" : "text-gray-500"
                  )}>Provisions Required</h4>
                  <div className={cn(
                    "p-3 rounded-lg",
                    isDarkMode ? "bg-slate-800" : "bg-gray-50"
                  )}>
                    <p className={cn(
                      "text-sm",
                      isDarkMode ? "text-gray-100" : "text-gray-900"
                    )}>
                      {selectedEvent.provisions}
                    </p>
                  </div>
                </div>

                {/* Attachments */}
                {selectedEvent.attachments && selectedEvent.attachments.length > 0 && (
                  <div>
                    <h4 className={cn(
                      "text-sm font-medium mb-2",
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    )}>Attachments</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedEvent.attachments.map((file, index) => (
                        <a
                          key={index}
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg transition-colors",
                            isDarkMode 
                              ? "bg-slate-800 hover:bg-slate-700" 
                              : "bg-gray-50 hover:bg-gray-100"
                          )}
                        >
                          <FileText className={cn(
                            "h-5 w-5",
                            isDarkMode ? "text-gray-400" : "text-gray-500"
                          )} />
                          <div>
                            <p className={cn(
                              "text-sm font-medium",
                              isDarkMode ? "text-gray-100" : "text-gray-900"
                            )}>{file.name}</p>
                            <p className={cn(
                              "text-xs",
                              isDarkMode ? "text-gray-400" : "text-gray-500"
                            )}>{(file.size / 1024).toFixed(1)} KB</p>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default MyEvents;