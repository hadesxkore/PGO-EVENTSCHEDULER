import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";
import { downloadFile } from "@/lib/utils/downloadFile";
import { getAllEventRequests, deleteEventRequest, updateEventRequestStatus } from "@/lib/firebase/eventRequests";
import { toast } from "sonner";
import { PDFDownloadLink, PDFViewer } from "@react-pdf/renderer";
import EventReportPDF from "@/components/reports/EventReportPDF";
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
  Trash2,
  Phone,
  Mail,
  FileOutput,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  AlertDialogTrigger,
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
  const [selectedEvents, setSelectedEvents] = useState([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [previewEvents, setPreviewEvents] = useState([]);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isDisapproveDialogOpen, setIsDisapproveDialogOpen] = useState(false);
  const [disapprovalReason, setDisapprovalReason] = useState("");
  const [isReasonDialogOpen, setIsReasonDialogOpen] = useState(false);
  const itemsPerPage = 7;

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const result = await getAllEventRequests();
      
      if (result.success) {
        console.log('Fetched events:', result.requests);
        console.log('First event data:', result.requests[0]);
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
      className="max-w-[1400px] mx-auto px-8 py-8"
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
          <div className="flex items-center gap-3">
            {isSelectMode ? (
              <div className="flex items-center gap-3">
                <Badge variant="outline" className={cn(
                  "h-8 px-3",
                  isDarkMode ? "border-slate-700" : "border-gray-200"
                )}>
                  {selectedEvents.length} events selected
                </Badge>
                                {selectedEvents.length > 0 && (
                  <Button
                    className="gap-2 shadow-sm bg-black hover:bg-gray-800 text-white"
                    onClick={() => {
                      setPreviewEvents(selectedEvents);
                      setIsPreviewDialogOpen(true);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                    Preview Selected Reports
                  </Button>
                )}
                <Button
                  variant="outline"
                  className={cn(
                    "gap-2",
                    isDarkMode ? "border-slate-700 hover:bg-slate-800" : "border-gray-200 hover:bg-gray-100"
                  )}
                  onClick={() => {
                    setIsSelectMode(false);
                    setSelectedEvents([]);
                  }}
                >
                  Cancel Selection
                </Button>
              </div>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    className="bg-black hover:bg-gray-800 text-white gap-2 shadow-sm"
                  >
                    <FileOutput className="h-4 w-4" />
                    Generate Report
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className={cn(
                  "border-none",
                  isDarkMode ? "bg-slate-900" : "bg-white"
                )}>
                  <AlertDialogHeader>
                    <AlertDialogTitle className={cn(
                      isDarkMode ? "text-gray-100" : "text-gray-900"
                    )}>Generate Event Report</AlertDialogTitle>
                    <AlertDialogDescription className={cn(
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    )}>
                      Choose whether to generate a report for all events or select specific events.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="flex flex-col gap-4 py-4">
                    <div className="flex flex-col gap-4">
                      <Button
                        className="w-full gap-2 bg-black hover:bg-gray-800 text-white"
                        onClick={() => {
                          // Close the current dialog
                          const closeButton = document.querySelector('[data-state="open"] button[type="button"]');
                          if (closeButton) closeButton.click();
                          // Open preview dialog
                          setPreviewEvents(filteredEvents);
                          setIsPreviewDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                        Preview Report
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full gap-2"
                        onClick={() => {
                          // Close the current dialog
                          const closeButton = document.querySelector('[data-state="open"] button[type="button"]');
                          if (closeButton) closeButton.click();
                          // Enable select mode
                          setIsSelectMode(true);
                        }}
                      >
                        <Checkbox className="h-4 w-4 mr-1" />
                        Select Specific Events
                      </Button>
                    </div>
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel className={cn(
                      isDarkMode 
                        ? "bg-slate-800 hover:bg-slate-700 text-gray-100" 
                        : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                    )}>Cancel</AlertDialogCancel>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
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
                  isDarkMode 
                    ? "border-slate-700 bg-slate-800/50" 
                    : "border-gray-200 bg-gray-50"
                )}>
                                      <TableHead className="w-[250px] py-4 text-sm font-medium">Event Title</TableHead>
                    <TableHead className="py-4 text-sm font-medium">Requestor</TableHead>
                    <TableHead className="py-4 text-sm font-medium">Start Date</TableHead>
                    <TableHead className="py-4 text-sm font-medium">End Date</TableHead>
                    <TableHead className="py-4 text-sm font-medium">Location</TableHead>
                    <TableHead className="py-4 text-sm font-medium">Participants</TableHead>
                    <TableHead className="py-4 text-sm font-medium">Status</TableHead>
                    <TableHead className="text-center py-4 text-sm font-medium">Actions</TableHead>
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
                  .map((event, index) => (
                    <TableRow 
                      key={event.id} 
                      className={cn(
                        "transition-colors",
                        isDarkMode 
                          ? "border-slate-700" 
                          : "border-gray-100",
                        isSelectMode && (isDarkMode
                          ? "bg-blue-500/5 hover:bg-blue-500/20 cursor-pointer"
                          : "bg-blue-50/50 hover:bg-blue-100 cursor-pointer"),
                        isSelectMode && selectedEvents.includes(event) && (isDarkMode 
                          ? "bg-blue-500/20 hover:bg-blue-500/30" 
                          : "bg-blue-200 hover:bg-blue-300"
                        )
                      )}
                      onClick={() => {
                        if (isSelectMode) {
                          setSelectedEvents(prev =>
                            prev.includes(event)
                              ? prev.filter(e => e !== event)
                              : [...prev, event]
                          );
                        }
                      }}
                    >
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2">
                          {isSelectMode && (
                            <Checkbox
                              checked={selectedEvents.includes(event)}
                              className={cn(
                                "pointer-events-none",
                                isDarkMode 
                                  ? "border-slate-700 data-[state=checked]:bg-blue-600" 
                                  : "border-gray-200 data-[state=checked]:bg-blue-500"
                              )}
                            />
                          )}
                          <span className={cn(
                            "text-blue-500 hover:text-blue-600 cursor-pointer font-medium"
                          )}>
                            {event.title}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex flex-col">
                          <span className={cn(
                            "text-sm font-medium",
                            isDarkMode ? "text-gray-100" : "text-gray-900"
                          )}>
                            {event.requestor}
                          </span>
                          <span className={cn(
                            "text-xs",
                            isDarkMode ? "text-gray-400" : "text-gray-500"
                          )}>
                            {event.userDepartment || event.department || "No department"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <span className={cn(
                          "text-sm",
                          isDarkMode ? "text-gray-100" : "text-gray-900"
                        )}>
                          {event.startDate ? format(new Date(event.startDate.seconds * 1000), "MMM d, yyyy h:mm a") : 
                           event.date ? format(new Date(event.date.seconds * 1000), "MMM d, yyyy h:mm a") : "Not set"}
                        </span>
                      </TableCell>
                      <TableCell className="py-4">
                        <span className={cn(
                          "text-sm",
                          isDarkMode ? "text-gray-100" : "text-gray-900"
                        )}>
                          {event.endDate ? format(new Date(event.endDate.seconds * 1000), "MMM d, yyyy h:mm a") : "Not set"}
                        </span>
                      </TableCell>
                      <TableCell className="py-4">
                        <span className={cn(
                          "text-sm",
                          isDarkMode ? "text-gray-100" : "text-gray-900"
                        )}>
                          {event.location}
                        </span>
                      </TableCell>
                      <TableCell className="py-4">
                        <span className={cn(
                          "text-sm text-green-600 font-medium",
                          isDarkMode ? "text-green-400" : "text-green-600"
                        )}>
                          {event.participants} attendees
                        </span>
                      </TableCell>
                      <TableCell className="py-4">
                        {event.status === 'disapproved' ? (
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="destructive"
                              className="bg-red-500/10 text-red-500"
                            >
                              Disapproved
                            </Badge>
                            <HoverCard>
                              <HoverCardTrigger>
                                <div className="p-1 rounded-full bg-red-500/10 cursor-pointer hover:bg-red-500/20">
                                  <AlertCircle className="h-4 w-4 text-red-500" />
                                </div>
                              </HoverCardTrigger>
                                                              <HoverCardContent
                                className={cn(
                                  "w-80 border",
                                  isDarkMode 
                                    ? "bg-slate-900 border-slate-700/30" 
                                    : "bg-white border-gray-200/70"
                                )}
                              >
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
                        ) : (
                          <Badge
                            variant={event.status === 'approved' ? 'success' : 'secondary'}
                            className={cn(
                              "font-medium",
                              event.status === 'approved' 
                                ? "bg-green-500/10 text-green-500" 
                                : isDarkMode 
                                  ? "bg-gray-500/10 text-gray-400" 
                                  : "bg-gray-500/10 text-gray-500"
                            )}
                          >
                            {event.status ? event.status.charAt(0).toUpperCase() + event.status.slice(1) : 'Pending'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center justify-end gap-2">
                          <div className="flex items-center gap-2">
                            <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    className="bg-green-500 hover:bg-green-600 text-white gap-1.5 h-8 text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setIsApproveDialogOpen(true);
                                    }}
                                  >
                                    Approve
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className={cn(
                                  "sm:max-w-[425px] border-none",
                                  isDarkMode ? "bg-slate-900" : "bg-white"
                                )}>
                                  <DialogHeader>
                                    <DialogTitle className={cn(
                                      isDarkMode ? "text-gray-100" : "text-gray-900"
                                    )}>Approve Event Request</DialogTitle>
                                    <DialogDescription className={cn(
                                      isDarkMode ? "text-gray-400" : "text-gray-500"
                                    )}>
                                      Are you sure you want to approve this event request? This will notify the requestor.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="flex justify-end gap-3 mt-4">
                                    <Button
                                      variant="outline"
                                      className={cn(
                                        isDarkMode 
                                          ? "bg-slate-800 hover:bg-slate-700 text-gray-100 border-slate-700" 
                                          : "bg-gray-100 hover:bg-gray-200 text-gray-900 border-gray-200"
                                      )}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setIsApproveDialogOpen(false);
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      className="bg-green-500 hover:bg-green-600 text-white"
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        try {
                                          // TODO: Get actual admin ID from auth context
                                          const adminId = "admin"; // Temporary admin ID
                                          const result = await updateEventRequestStatus(event.id, 'approved', adminId);
                                          if (result.success) {
                                            toast.success("Event request approved successfully");
                                            await fetchEvents();
                                            setIsApproveDialogOpen(false);
                                          } else {
                                            toast.error("Failed to approve event request");
                                          }
                                        } catch (error) {
                                          console.error('Error approving event:', error);
                                          toast.error("Failed to approve event request");
                                        }
                                      }}
                                    >
                                      Approve
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              <Dialog open={isReasonDialogOpen} onOpenChange={setIsReasonDialogOpen}>
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    className="bg-red-500 hover:bg-red-600 text-white gap-1.5 h-8 text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDisapprovalReason("");
                                      setIsReasonDialogOpen(true);
                                    }}
                                  >
                                    Disapprove
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className={cn(
                                  "sm:max-w-[425px] border-none",
                                  isDarkMode ? "bg-slate-900" : "bg-white"
                                )}>
                                  <DialogHeader>
                                    <DialogTitle className={cn(
                                      isDarkMode ? "text-gray-100" : "text-gray-900"
                                    )}>Provide Disapproval Reason</DialogTitle>
                                    <DialogDescription className={cn(
                                      isDarkMode ? "text-gray-400" : "text-gray-500"
                                    )}>
                                      Please provide a reason for disapproving this event request. This will be shown to the requestor.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="mt-6 space-y-6">
                                    <div className="space-y-2">
                                      <Label className={cn(
                                        isDarkMode ? "text-gray-200" : "text-gray-700"
                                      )}>Reason for Disapproval</Label>
                                      <textarea
                                        value={disapprovalReason}
                                        onChange={(e) => setDisapprovalReason(e.target.value)}
                                        placeholder="Enter the reason for disapproving this event request..."
                                        className={cn(
                                          "w-full min-h-[100px] rounded-lg p-3 text-base resize-none border",
                                          isDarkMode 
                                            ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" 
                                            : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
                                        )}
                                      />
                                    </div>
                                    <div className="flex justify-end gap-3">
                                      <Button
                                        variant="outline"
                                        className={cn(
                                          isDarkMode 
                                            ? "bg-slate-800 hover:bg-slate-700 text-gray-100 border-slate-700" 
                                            : "bg-gray-100 hover:bg-gray-200 text-gray-900 border-gray-200"
                                        )}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setIsReasonDialogOpen(false);
                                        }}
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        className="bg-red-500 hover:bg-red-600 text-white"
                                        disabled={!disapprovalReason.trim()}
                                        onClick={async () => {
                                          try {
                                            // TODO: Get actual admin ID from auth context
                                            const adminId = "admin"; // Temporary admin ID
                                            const result = await updateEventRequestStatus(event.id, 'disapproved', adminId, disapprovalReason.trim());
                                            if (result.success) {
                                              toast.success("Event request disapproved with reason provided");
                                              await fetchEvents();
                                              setIsReasonDialogOpen(false);
                                              setDisapprovalReason(""); // Reset the reason after successful update
                                            } else {
                                              toast.error("Failed to disapprove event request");
                                            }
                                          } catch (error) {
                                            console.error('Error disapproving event:', error);
                                            toast.error("Failed to disapprove event request");
                                          }
                                        }}
                                      >
                                        Submit
                                      </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRequest(event);
                              setIsViewDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
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
          "sm:max-w-[700px] overflow-hidden border-none [&>button]:top-4 [&>button]:right-4 [&>button]:focus:outline-none [&>button]:focus-visible:ring-0 [&>button]:focus:ring-0 [&>button]:ring-0 [&>button]:focus:ring-offset-0 [&>button]:active:ring-0 [&>button]:active:outline-none",
          isDarkMode ? "bg-slate-900" : "bg-white"
        )}>
          {selectedRequest && (
            <>
                            <ScrollArea className="max-h-[80vh] px-6 pt-6">
                <div className="space-y-6">
                  {/* Header */}
                  <div className="mb-6">
                    <Badge
                      variant="secondary"
                      className={cn(
                        "capitalize font-medium px-2 py-0.5 text-xs mb-2",
                        isDarkMode ? "bg-blue-500/10 text-blue-400" : "bg-blue-500/10 text-blue-500"
                      )}
                    >
                      {selectedRequest.userDepartment || selectedRequest.department}
                    </Badge>
                    <DialogTitle className={cn(
                      "text-lg font-bold tracking-tight",
                      isDarkMode ? "text-white" : "text-gray-900"
                    )}>
                      {selectedRequest.title}
                    </DialogTitle>
                  </div>

                  {/* Info Cards Grid */}
                  <div className="grid grid-cols-3 gap-4">
                    {/* Requestor Card */}
                    <div className={cn(
                      "p-4 rounded-xl transition-colors",
                      isDarkMode 
                        ? "bg-slate-800/20 hover:bg-slate-800/30" 
                        : "bg-gray-50/80 hover:bg-gray-50"
                    )}>
                      <div className="flex items-center gap-3 mb-3">
                        <User className="h-5 w-5 text-purple-500" />
                        <h4 className={cn(
                          "font-medium",
                          isDarkMode ? "text-gray-200" : "text-gray-700"
                        )}>Requestor</h4>
                      </div>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={selectedRequest.userAvatar} />
                          <AvatarFallback className={isDarkMode ? "bg-slate-700" : "bg-gray-100"}>
                            <User className="h-4 w-4 text-purple-500" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className={cn(
                            "font-semibold",
                            isDarkMode ? "text-gray-100" : "text-gray-900"
                          )}>
                            {selectedRequest.requestor}
                          </p>
                          <p className={cn(
                            "text-sm",
                            isDarkMode ? "text-gray-400" : "text-gray-500"
                          )}>
                            {selectedRequest.userDepartment}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Date & Time Card */}
                    <div className={cn(
                      "p-4 rounded-xl transition-colors",
                      isDarkMode 
                        ? "bg-slate-800/20 hover:bg-slate-800/30" 
                        : "bg-gray-50/80 hover:bg-gray-50"
                    )}>
                      <div className="flex items-center gap-3 mb-3">
                        <Calendar className="h-5 w-5 text-blue-500" />
                        <h4 className={cn(
                          "font-medium",
                          isDarkMode ? "text-gray-200" : "text-gray-700"
                        )}>Date & Time</h4>
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
                            {selectedRequest.startDate ? 
                              format(selectedRequest.startDate.toDate ? selectedRequest.startDate.toDate() : new Date(selectedRequest.startDate), "MMMM d, yyyy h:mm a") :
                              selectedRequest.date?.seconds ? 
                                format(new Date(selectedRequest.date.seconds * 1000), "MMMM d, yyyy h:mm a") :
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
                            {selectedRequest.endDate ? 
                              format(selectedRequest.endDate.toDate ? selectedRequest.endDate.toDate() : new Date(selectedRequest.endDate), "MMMM d, yyyy h:mm a") :
                              "Not available"
                            }
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Location Card */}
                    <div className={cn(
                      "p-4 rounded-xl transition-colors",
                      isDarkMode 
                        ? "bg-slate-800/20 hover:bg-slate-800/30" 
                        : "bg-gray-50/80 hover:bg-gray-50"
                    )}>
                      <div className="flex items-center gap-3 mb-3">
                        <MapPin className="h-5 w-5 text-green-500" />
                        <h4 className={cn(
                          "font-medium",
                          isDarkMode ? "text-gray-200" : "text-gray-700"
                        )}>Location</h4>
                      </div>
                      <p className={cn(
                        "text-lg font-semibold",
                        isDarkMode ? "text-gray-100" : "text-gray-900"
                      )}>
                        {selectedRequest.location}
                      </p>
                    </div>

                    {/* Participants Card */}
                    <div className={cn(
                      "p-4 rounded-xl transition-colors",
                      isDarkMode 
                        ? "bg-slate-800/20 hover:bg-slate-800/30" 
                        : "bg-gray-50/80 hover:bg-gray-50"
                    )}>
                      <div className="flex items-center gap-3 mb-3">
                        <Users className="h-5 w-5 text-orange-500" />
                        <h4 className={cn(
                          "font-medium",
                          isDarkMode ? "text-gray-200" : "text-gray-700"
                        )}>Participants</h4>
                      </div>
                      <p className={cn(
                        "text-lg font-semibold",
                        isDarkMode ? "text-gray-100" : "text-gray-900"
                      )}>
                        {selectedRequest.participants} attendees
                      </p>
                    </div>

                    {/* VIP Card */}
                    <div className={cn(
                      "p-4 rounded-xl transition-colors",
                      isDarkMode 
                        ? "bg-slate-800/20 hover:bg-slate-800/30" 
                        : "bg-gray-50/80 hover:bg-gray-50"
                    )}>
                      <div className="flex items-center gap-3 mb-3">
                        <User className="h-5 w-5 text-purple-500" />
                        <h4 className={cn(
                          "font-medium",
                          isDarkMode ? "text-gray-200" : "text-gray-700"
                        )}>VIP</h4>
                      </div>
                      <p className={cn(
                        "text-lg font-semibold",
                        isDarkMode ? "text-gray-100" : "text-gray-900"
                      )}>
                        {selectedRequest.vip || 0} VIPs
                      </p>
                    </div>

                    {/* VVIP Card */}
                    <div className={cn(
                      "p-4 rounded-xl transition-colors",
                      isDarkMode 
                        ? "bg-slate-800/20 hover:bg-slate-800/30" 
                        : "bg-gray-50/80 hover:bg-gray-50"
                    )}>
                      <div className="flex items-center gap-3 mb-3">
                        <User className="h-5 w-5 text-red-500" />
                        <h4 className={cn(
                          "font-medium",
                          isDarkMode ? "text-gray-200" : "text-gray-700"
                        )}>VVIP</h4>
                      </div>
                      <p className={cn(
                        "text-lg font-semibold",
                        isDarkMode ? "text-gray-100" : "text-gray-900"
                      )}>
                        {selectedRequest.vvip || 0} VVIPs
                      </p>
                    </div>
                  </div>

                  {/* Requirements Section */}
                  <div className={cn(
                    "p-5 rounded-xl",
                    isDarkMode 
                      ? "bg-slate-800/20" 
                      : "bg-gray-50/80"
                  )}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-pink-500" />
                        <h4 className={cn(
                          "font-medium",
                          isDarkMode ? "text-gray-200" : "text-gray-700"
                        )}>Requirements</h4>
                      </div>
                      <Button
                        size="sm"
                        className="bg-black hover:bg-gray-800 text-white gap-1.5 h-8 text-xs min-w-[140px] transition-all duration-200 ease-in-out"
                        onClick={() => setIsRequirementsDialogOpen(true)}
                      >
                        View Full Details →
                      </Button>
                    </div>
                    <div className="relative">
                      <div className={cn(
                        "rounded-lg p-4 text-sm relative",
                        isDarkMode 
                          ? "bg-slate-900/30 text-gray-300" 
                          : "bg-white/50 text-gray-600"
                      )}>
                        {selectedRequest.departmentRequirements && selectedRequest.departmentRequirements.slice(0, 2).map((dept, deptIndex) => (
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
                          </div>
                        ))}
                        
                        {selectedRequest.departmentRequirements && (
                          selectedRequest.departmentRequirements.length > 2 || 
                          selectedRequest.departmentRequirements.some(dept => dept.requirements.length > 2)
                        ) && (
                          <>
                            <div className={cn(
                              "absolute bottom-0 left-0 right-0 h-24 rounded-b-lg",
                              isDarkMode
                                ? "bg-gradient-to-t from-slate-900/90 via-slate-900/50 to-transparent"
                                : "bg-gradient-to-t from-white/90 via-white/50 to-transparent"
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

                  {/* Classifications Section */}
                  <div className={cn(
                    "p-5 rounded-xl",
                    isDarkMode 
                      ? "bg-slate-800/20" 
                      : "bg-gray-50/80"
                  )}>
                    <div className="flex items-center gap-3 mb-4">
                      <FileText className="h-5 w-5 text-indigo-500" />
                      <h4 className={cn(
                        "font-medium",
                        isDarkMode ? "text-gray-200" : "text-gray-700"
                      )}>Classifications</h4>
                    </div>
                    <div className={cn(
                      "rounded-lg p-4",
                      isDarkMode ? "bg-slate-900/30" : "bg-white/50"
                    )}>
                      <p className={cn(
                        "text-base leading-relaxed whitespace-pre-wrap",
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      )}>
                        {selectedRequest.classifications || "No classifications provided"}
                      </p>
                    </div>
                  </div>

                  {/* Contact Details Card */}
                  <div className={cn(
                    "p-5 rounded-xl",
                    isDarkMode 
                      ? "bg-slate-800/20" 
                      : "bg-gray-50/80"
                  )}>
                    <div className="flex items-center gap-3 mb-4">
                      <Phone className="h-5 w-5 text-indigo-500" />
                      <h4 className={cn(
                        "font-medium",
                        isDarkMode ? "text-gray-200" : "text-gray-700"
                      )}>Contact Details</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Phone Number */}
                      <div className={cn(
                        "p-4 rounded-lg",
                        isDarkMode 
                          ? "bg-slate-900/30" 
                          : "bg-white/50"
                      )}>
                        <div className="flex items-center gap-2 mb-2">
                          <Phone className="h-4 w-4 text-indigo-500" />
                          <span className={cn(
                            "text-sm font-medium",
                            isDarkMode ? "text-gray-300" : "text-gray-600"
                          )}>Phone Number</span>
                        </div>
                        <p className={cn(
                          "text-base font-semibold",
                          isDarkMode ? "text-gray-100" : "text-gray-900"
                        )}>{selectedRequest.contactNumber || "Not provided"}</p>
                      </div>

                      {/* Email */}
                      <div className={cn(
                        "p-4 rounded-lg",
                        isDarkMode 
                          ? "bg-slate-900/30" 
                          : "bg-white/50"
                      )}>
                        <div className="flex items-center gap-2 mb-2">
                          <Mail className="h-4 w-4 text-indigo-500" />
                          <span className={cn(
                            "text-sm font-medium",
                            isDarkMode ? "text-gray-300" : "text-gray-600"
                          )}>Email Address</span>
                        </div>
                        <p className={cn(
                          "text-base font-semibold",
                          isDarkMode ? "text-gray-100" : "text-gray-900"
                        )}>{selectedRequest.contactEmail || selectedRequest.userEmail || "Not provided"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Attachments Section */}
                  <div className={cn(
                    "p-5 rounded-xl",
                    isDarkMode 
                      ? "bg-slate-800/20" 
                      : "bg-gray-50/80"
                  )}>
                    <div className="flex items-center gap-3 mb-4">
                      <FileText className="h-5 w-5 text-teal-500" />
                      <h4 className={cn(
                        "font-medium",
                        isDarkMode ? "text-gray-200" : "text-gray-700"
                      )}>Attachments</h4>
                    </div>
                    {selectedRequest.attachments && selectedRequest.attachments.length > 0 ? (
                      <div className="grid grid-cols-1 gap-3">
                        {selectedRequest.attachments.map((file, index) => (
                          <div
                            key={index}
                            className={cn(
                              "flex items-center justify-between p-4 rounded-lg transition-colors",
                              isDarkMode 
                                ? "bg-slate-900/30 hover:bg-slate-900/50" 
                                : "bg-white/50 hover:bg-white"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-teal-500" />
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
                                size="sm"
                                className="bg-black hover:bg-gray-800 text-white gap-1.5"
                                onClick={() => window.open(file.url, '_blank')}
                              >
                                <Eye className="h-4 w-4" />
                                View
                              </Button>
                              <Button
                                size="sm"
                                className="bg-black hover:bg-gray-800 text-white gap-1.5"
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
                    ) : (
                      <div className={cn(
                        "p-4 rounded-lg text-center",
                        isDarkMode 
                          ? "bg-slate-900/30 text-gray-400" 
                          : "bg-white/50 text-gray-500"
                      )}>
                        No attachments uploaded
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </>
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
                  <div className="space-y-4">
                    {selectedRequest.departmentRequirements && selectedRequest.departmentRequirements.length > 0 ? (
                      selectedRequest.departmentRequirements.map((dept, deptIndex) => (
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
                                      "font-semibold text-sm",
                                      isDarkMode ? "text-white" : "text-gray-900"
                                    )}>
                                      {requirement.name}
                                    </h3>
                                  </div>
                                  {requirement.note && (
                                    <div className={cn(
                                      "mt-2 pl-8 text-xs",
                                      isDarkMode ? "text-gray-400" : "text-gray-600"
                                    )}>
                                      {requirement.note}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className={cn(
                        "rounded-xl p-8 text-center border-2 border-dashed",
                        isDarkMode 
                          ? "bg-slate-900 border-slate-700 text-gray-400" 
                          : "bg-white border-gray-200 text-gray-500"
                      )}>
                        <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                        <p className="text-lg font-medium mb-1">No Requirements</p>
                        <p className="text-sm">No requirements specified for this event</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* PDF Preview Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className={cn(
          "max-w-[900px] p-0 border-none",
          isDarkMode ? "bg-slate-900" : "bg-white"
        )}>
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className={cn(
              isDarkMode ? "text-gray-100" : "text-gray-900"
            )}>Preview Report</DialogTitle>
          </DialogHeader>

          <div className={cn(
            "flex flex-col gap-4 p-6 pt-2",
            isDarkMode ? "text-gray-100" : "text-gray-900"
          )}>
            <div className={cn(
              "w-full h-[70vh] rounded-lg overflow-hidden",
              isDarkMode ? "bg-slate-800" : "bg-gray-50"
            )}>
              <PDFViewer
                width="100%"
                height="100%"
                style={{
                  border: 'none',
                  backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                }}
              >
                <EventReportPDF events={previewEvents} />
              </PDFViewer>
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button
                variant="outline"
                className={cn(
                  isDarkMode ? "border-slate-700 hover:bg-slate-800" : "border-gray-200 hover:bg-gray-100"
                )}
                onClick={() => setIsPreviewDialogOpen(false)}
              >
                Close
              </Button>
              <PDFDownloadLink
                document={<EventReportPDF events={previewEvents} />}
                fileName={`event-report-${format(new Date(), "yyyy-MM-dd")}.pdf`}
              >
                {({ loading }) => (
                  <Button
                    className="bg-black hover:bg-gray-800 text-white gap-2"
                    disabled={loading}
                  >
                    <FileOutput className="h-4 w-4" />
                    {loading ? "Preparing..." : "Download PDF"}
                  </Button>
                )}
              </PDFDownloadLink>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default EventRequests;