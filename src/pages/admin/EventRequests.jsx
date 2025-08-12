import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";
import { downloadFile } from "@/lib/utils/downloadFile";
import { getAllEventRequests } from "@/lib/firebase/eventRequests";
import { toast } from "sonner";
import {
  Search,
  Filter,
  Calendar,
  Clock,
  MapPin,
  Users,
  User,
  Eye,
  FileText,
  ChevronDown,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";



const EventRequests = () => {
  const { isDarkMode } = useTheme();
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isRequirementsDialogOpen, setIsRequirementsDialogOpen] = useState(false);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const result = await getAllEventRequests();
      
      if (result.success) {
        setEvents(result.requests);
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
    const searchLower = searchTerm.toLowerCase().trim();
    return event.title?.toLowerCase().includes(searchLower) ||
           event.requestor?.toLowerCase().includes(searchLower);
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
      className="max-w-[1400px] mx-auto px-8 pt-4 pb-8"
    >
      {/* Header */}
      <motion.div variants={item} className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1
              className={cn(
                "text-4xl font-bold tracking-tight",
                isDarkMode ? "text-white" : "text-gray-900"
              )}
            >
              Event Requests
            </h1>
            <p
              className={cn(
                "text-lg mt-2",
                isDarkMode ? "text-gray-400" : "text-gray-500"
              )}
            >
              Review and manage event requests from users
            </p>
          </div>

        </div>
      </motion.div>



      {/* Requests Table */}
      <motion.div variants={item}>
        <div className={cn(
          "rounded-xl border shadow-sm",
          isDarkMode ? "border-slate-700 bg-slate-900" : "border-gray-100 bg-white"
        )}>
          <div className="p-8">
            {/* Table Header */}
                          <div className="mb-8">
                              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className={cn(
                    "text-2xl font-bold mb-2",
                    isDarkMode ? "text-gray-100" : "text-gray-900"
                  )}>
                    Event Requests
                  </h3>
                  <p className={cn(
                    "text-base",
                    isDarkMode ? "text-gray-400" : "text-gray-500"
                  )}>
                    Manage and review all event requests from users
                  </p>
                </div>
                <Badge variant="outline" className={cn(
                  "h-10 px-4 text-base font-medium",
                  isDarkMode ? "border-slate-700" : "border-gray-200"
                )}>
                  {events.length} requests
                </Badge>
              </div>

              {/* Search and Sort */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by event title, requestor, or location..."
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
                <Select defaultValue="desc" onValueChange={(value) => {
                  const sorted = [...filteredEvents].sort((a, b) => {
                    const dateA = new Date(a.createdAt.seconds * 1000);
                    const dateB = new Date(b.createdAt.seconds * 1000);
                    return value === "asc" ? dateA - dateB : dateB - dateA;
                  });
                  setEvents(sorted);
                }}>
                  <SelectTrigger
                    className={cn(
                      "w-[180px]",
                      isDarkMode
                        ? "bg-slate-900 border-slate-700"
                        : "bg-white border-gray-200"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-gray-400" />
                      <SelectValue placeholder="Sort by date" />
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
                      value="desc" 
                      className={cn(
                        isDarkMode ? "focus:bg-slate-800" : "focus:bg-gray-100",
                        isDarkMode ? "text-gray-100" : "text-gray-900"
                      )}
                    >
                      Newest First
                    </SelectItem>
                    <SelectItem 
                      value="asc" 
                      className={cn(
                        isDarkMode ? "focus:bg-slate-800" : "focus:bg-gray-100",
                        isDarkMode ? "text-gray-100" : "text-gray-900"
                      )}
                    >
                      Oldest First
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow className={cn(
                  isDarkMode ? "border-slate-700 hover:bg-transparent" : "border-gray-100 hover:bg-transparent"
                )}>
                  <TableHead className="w-[220px] py-3 text-sm font-semibold">Event Details</TableHead>
                  <TableHead className="py-3 text-sm font-semibold">Requestor</TableHead>
                  <TableHead className="py-3 text-sm font-semibold">Date & Time</TableHead>
                  <TableHead className="py-3 text-sm font-semibold">Location</TableHead>
                  <TableHead className="text-right py-3 text-sm font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <p className={isDarkMode ? "text-gray-400" : "text-gray-500"}>
                        Loading events...
                      </p>
                    </TableCell>
                  </TableRow>
                ) : filteredEvents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <p className={isDarkMode ? "text-gray-400" : "text-gray-500"}>
                        No events found
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEvents
                  .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                  .map((event) => (
                    <TableRow 
                      key={event.id} 
                      className={cn(
                        isDarkMode 
                          ? "border-slate-700" 
                          : "border-gray-100"
                      )}
                    >
                      <TableCell className="py-3">
                        <div>
                          <p className={cn(
                            "text-sm font-medium",
                            isDarkMode ? "text-gray-100" : "text-gray-900"
                          )}>{event.title}</p>

                        </div>
                      </TableCell>
                      <TableCell className="py-3">
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
                      <TableCell className="py-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-gray-400" />
                            <span className={cn(
                              "text-sm font-medium",
                              isDarkMode ? "text-gray-100" : "text-gray-900"
                            )}>{event.date ? format(new Date(event.date.seconds * 1000), "MMM d, yyyy") : "No date"}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-gray-400" />
                            <span className={cn(
                              "text-xs",
                              isDarkMode ? "text-gray-400" : "text-gray-500"
                            )}>{event.date ? format(new Date(event.date.seconds * 1000), "h:mm a") : "No time"}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-gray-400" />
                          <span className={cn(
                            "text-sm",
                            isDarkMode ? "text-gray-100" : "text-gray-900"
                          )}>{event.location}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center justify-end">
                          <Button
                            size="sm"
                            className="bg-black hover:bg-gray-800 text-white gap-1.5 h-8 text-xs"
                            onClick={() => {
                              setSelectedRequest(event);
                              setIsViewDialogOpen(true);
                            }}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View Details
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Table Footer */}
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className={cn(
                  "text-sm",
                  isDarkMode ? "text-gray-400" : "text-gray-500"
                )}>
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredEvents.length)} of {filteredEvents.length} events
                </p>
                <p className={cn(
                  "text-sm",
                  isDarkMode ? "text-gray-400" : "text-gray-500"
                )}>
                  Last updated {format(new Date(), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>

              {/* Pagination */}
              {Math.ceil(filteredEvents.length / itemsPerPage) > 1 && (
                <div className="flex justify-center">
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
          </div>
        </div>
      </motion.div>

      {/* View Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className={cn(
          "sm:max-w-[600px] border-none shadow-lg p-6",
          isDarkMode ? "bg-slate-900" : "bg-white"
        )}>
          {selectedRequest && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h2 className={cn(
                    "text-2xl font-semibold tracking-tight",
                    isDarkMode ? "text-white" : "text-gray-900"
                  )}>
                    {selectedRequest.title}
                  </h2>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn(
                      "font-medium",
                      isDarkMode ? "border-blue-500/20 text-blue-400" : "border-blue-500/20 text-blue-500"
                    )}>
                      {selectedRequest.userDepartment}
                    </Badge>
                    <span className={cn(
                      "text-sm",
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    )}>
                      Requested on {selectedRequest.createdAt ? format(new Date(selectedRequest.createdAt.seconds * 1000), "MMM d, yyyy") : "No date"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Main Content */}
              <div className="grid grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  {/* Requestor */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-500">Requestor</label>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={selectedRequest.userAvatar} />
                        <AvatarFallback className={isDarkMode ? "bg-slate-700" : "bg-gray-100"}>
                          <User className="h-4 w-4 text-blue-500" />
                        </AvatarFallback>
                      </Avatar>
                      <span className={cn(
                        "font-medium",
                        isDarkMode ? "text-gray-200" : "text-gray-900"
                      )}>
                        {selectedRequest.requestor}
                      </span>
                    </div>
                  </div>

                  {/* Date & Time */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-500">Date & Time</label>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-blue-500" />
                        <span className={cn(
                          "text-sm",
                          isDarkMode ? "text-gray-200" : "text-gray-900"
                        )}>
                          {selectedRequest.date ? format(new Date(selectedRequest.date.seconds * 1000), "MMM d, yyyy") : "No date"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-purple-500" />
                        <span className={cn(
                          "text-sm",
                          isDarkMode ? "text-gray-200" : "text-gray-900"
                        )}>
                          {selectedRequest.date ? format(new Date(selectedRequest.date.seconds * 1000), "h:mm a") : "No time"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-500">Location</label>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-green-500" />
                      <span className={cn(
                        "text-sm",
                        isDarkMode ? "text-gray-200" : "text-gray-900"
                      )}>
                        {selectedRequest.location}
                      </span>
                    </div>
                  </div>

                  {/* Participants */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-500">Participants</label>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-orange-500" />
                      <span className={cn(
                        "text-sm",
                        isDarkMode ? "text-gray-200" : "text-gray-900"
                      )}>
                        {selectedRequest.participants} attendees
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  {/* Requirements */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-500">Requirements</label>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-500 hover:text-blue-600 px-0"
                        onClick={() => setIsRequirementsDialogOpen(true)}
                      >
                        View More
                      </Button>
                    </div>
                  </div>

                  {/* Attachments */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-500">Attachments</label>
                    <div className="space-y-2">
                      {selectedRequest.attachments && selectedRequest.attachments.length > 0 ? (
                        selectedRequest.attachments.map((file, index) => (
                          <div
                            key={index}
                            className={cn(
                              "flex items-center justify-between p-3 rounded-lg",
                              isDarkMode ? "bg-slate-800" : "bg-gray-50"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-blue-500" />
                              <div>
                                <p className={cn(
                                  "font-medium",
                                  isDarkMode ? "text-gray-200" : "text-gray-900"
                                )}>
                                  {file.name}
                                </p>
                                <p className={cn(
                                  "text-xs",
                                  isDarkMode ? "text-gray-400" : "text-gray-500"
                                )}>
                                  {(file.size / 1024).toFixed(1)} KB
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-blue-500 hover:text-blue-600 gap-1"
                                onClick={() => window.open(file.url, '_blank')}
                              >
                                <Eye className="h-4 w-4" />
                                View
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-blue-500 hover:text-blue-600 gap-1"
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
                        ))
                      ) : (
                        <p className={cn(
                          "text-sm italic",
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        )}>
                          No attachments provided
                        </p>
                      )}
                    </div>
                  </div>
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
          {selectedRequest && (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className={cn(
                    "text-xl font-semibold tracking-tight",
                    isDarkMode ? "text-white" : "text-gray-900"
                  )}>
                    Event Requirements
                  </DialogTitle>
                  <DialogDescription className="text-sm text-gray-500 mt-1">
                    Detailed requirements for {selectedRequest.title}
                  </DialogDescription>
                </div>
                <Badge variant="outline" className={cn(
                  "font-medium",
                  isDarkMode ? "border-blue-500/20 text-blue-400" : "border-blue-500/20 text-blue-500"
                )}>
                  {selectedRequest.userDepartment}
                </Badge>
              </div>

              {/* Content */}
              <div className={cn(
                "mt-4 rounded-lg p-6",
                isDarkMode ? "bg-slate-800" : "bg-gray-50"
              )}>
                <ScrollArea className="h-[400px] pr-4">
                  <div className={cn(
                    "prose max-w-none",
                    isDarkMode ? "prose-invert" : "",
                    "prose-sm",
                    "prose-p:leading-relaxed"
                  )}>
                    <pre className={cn(
                      "whitespace-pre-wrap font-sans text-base",
                      isDarkMode ? "text-gray-200" : "text-gray-900"
                    )}>
                      {selectedRequest.provisions}
                    </pre>
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </motion.div>
  );
};

export default EventRequests;