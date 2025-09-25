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
  FileOutput,
  FileText,
  ChevronDown,
  Download,
  Trash2,
  Phone,
  Mail,
  AlertCircle,
  X,
  MoreHorizontal,
  Check,
  CheckCircle,
  Settings,
  XCircle,
  Shield,
} from "lucide-react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const [isDisapproveDialogOpen, setIsDisapproveDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [disapprovalReason, setDisapprovalReason] = useState("");
  const [isReasonDialogOpen, setIsReasonDialogOpen] = useState(false);
  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false);
  const [selectedEventActivity, setSelectedEventActivity] = useState(null);
  const [selectedEventForAction, setSelectedEventForAction] = useState(null);
  const [sortBy, setSortBy] = useState("startDate-desc"); // Default to latest start date first
  const [statusFilter, setStatusFilter] = useState("all");
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
      toast.error("An error occurred while fetching events");
    } finally {
      setLoading(false);
    }
  };

  // Sorting function
  const sortEvents = (events, sortBy) => {
    return [...events].sort((a, b) => {
      switch (sortBy) {
        case "startDate-desc":
          // Latest start date first
          const aStartDate = a.startDate ? new Date(a.startDate.seconds * 1000) : new Date(0);
          const bStartDate = b.startDate ? new Date(b.startDate.seconds * 1000) : new Date(0);
          return bStartDate - aStartDate;
        
        case "startDate-asc":
          // Earliest start date first
          const aStartDateAsc = a.startDate ? new Date(a.startDate.seconds * 1000) : new Date(0);
          const bStartDateAsc = b.startDate ? new Date(b.startDate.seconds * 1000) : new Date(0);
          return aStartDateAsc - bStartDateAsc;
        
        case "title-asc":
          // Title A-Z
          return (a.title || "").localeCompare(b.title || "");
        
        case "title-desc":
          // Title Z-A
          return (b.title || "").localeCompare(a.title || "");
        
        case "requestor-asc":
          // Requestor A-Z
          return (a.requestor || "").localeCompare(b.requestor || "");
        
        case "requestor-desc":
          // Requestor Z-A
          return (b.requestor || "").localeCompare(a.requestor || "");
        
        case "status-asc":
          // Status A-Z
          return (a.status || "pending").localeCompare(b.status || "pending");
        
        case "status-desc":
          // Status Z-A
          return (b.status || "pending").localeCompare(a.status || "pending");
        
        case "created-desc":
          // Newest created first
          const aCreated = new Date(a.createdAt.seconds * 1000);
          const bCreated = new Date(b.createdAt.seconds * 1000);
          return bCreated - aCreated;
        
        case "created-asc":
          // Oldest created first
          const aCreatedAsc = new Date(a.createdAt.seconds * 1000);
          const bCreatedAsc = new Date(b.createdAt.seconds * 1000);
          return aCreatedAsc - bCreatedAsc;
        
        default:
          return 0;
      }
    });
  };

  const filteredEvents = sortEvents(
    events.filter(event => {
      const searchLower = searchTerm.toLowerCase().trim();
      const matchesSearch = event.title?.toLowerCase().includes(searchLower) ||
                           event.requestor?.toLowerCase().includes(searchLower) ||
                           event.location?.toLowerCase().includes(searchLower);
      
      const matchesStatus = statusFilter === "all" || 
                           (event.status || "pending").toLowerCase() === statusFilter.toLowerCase();
      
      return matchesSearch && matchesStatus;
    }),
    sortBy
  );

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
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <Badge variant="outline" className={cn(
                    "h-10 px-4 text-sm font-semibold shadow-sm",
                    selectedEvents.length > 0 
                      ? isDarkMode
                        ? "bg-slate-700 text-white border-slate-600"
                        : "bg-gray-800 text-white border-gray-700"
                      : isDarkMode 
                        ? "border-slate-600 bg-slate-800/50 text-slate-300" 
                        : "border-gray-300 bg-gray-50 text-gray-700"
                  )}>
                    <motion.span
                      key={selectedEvents.length}
                      initial={{ scale: 1.2 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      {selectedEvents.length}
                    </motion.span>
                    {selectedEvents.length === 1 ? " event selected" : " events selected"}
                  </Badge>
                </motion.div>
                                {selectedEvents.length > 0 && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Button
                      className={cn(
                        "gap-2 shadow-sm transition-all duration-200",
                        isDarkMode
                          ? "bg-slate-700 hover:bg-slate-600 text-white border border-slate-600"
                          : "bg-gray-800 hover:bg-gray-700 text-white border border-gray-700"
                      )}
                      onClick={() => {
                        setPreviewEvents(selectedEvents);
                        setIsPreviewDialogOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                      Preview Selected Reports
                    </Button>
                  </motion.div>
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
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    className={cn(
                      "gap-2 shadow-sm transition-all duration-200",
                      isDarkMode
                        ? "bg-slate-800 hover:bg-slate-700 text-white border border-slate-600"
                        : "bg-gray-900 hover:bg-gray-800 text-white border border-gray-800"
                    )}
                  >
                    <FileOutput className="h-4 w-4" />
                    Generate Report
                  </Button>
                </DialogTrigger>
                <DialogContent className={cn(
                  "sm:max-w-[500px] p-0 border-0 rounded-2xl overflow-hidden",
                  isDarkMode ? "bg-slate-900" : "bg-white"
                )}>
                  {/* Header */}
                  <div className={cn(
                    "p-6 border-b",
                    isDarkMode 
                      ? "bg-slate-800 border-slate-700 text-white" 
                      : "bg-gray-50 border-gray-200 text-gray-900"
                  )}>
                    <DialogTitle className="text-2xl font-bold mb-2">
                      Generate Event Report
                    </DialogTitle>
                    <DialogDescription className={cn(
                      isDarkMode ? "text-slate-300" : "text-gray-600"
                    )}>
                      Create comprehensive PDF reports for your events with detailed information and requirements.
                    </DialogDescription>
                  </div>

                  {/* Content */}
                  <div className="p-6 space-y-6">
                    {/* Action Buttons */}
                    <div className="space-y-3">
                      <Button
                        className={cn(
                          "w-full h-14 gap-3 shadow-sm transition-all duration-200 rounded-xl",
                          isDarkMode
                            ? "bg-slate-700 hover:bg-slate-600 text-white border border-slate-600"
                            : "bg-gray-800 hover:bg-gray-700 text-white border border-gray-700"
                        )}
                        onClick={() => {
                          // Close the current dialog
                          const closeButton = document.querySelector('[data-state="open"] button[type="button"]');
                          if (closeButton) closeButton.click();
                          // Open preview dialog
                          setPreviewEvents(filteredEvents);
                          setIsPreviewDialogOpen(true);
                        }}
                      >
                        <div className={cn(
                          "p-2 rounded-lg",
                          isDarkMode ? "bg-slate-600" : "bg-gray-700"
                        )}>
                          <Eye className="h-5 w-5" />
                        </div>
                        <div className="text-left">
                          <div className="font-semibold">Preview All Events</div>
                          <div className={cn(
                            "text-sm",
                            isDarkMode ? "text-slate-300" : "text-gray-300"
                          )}>Generate report for all {filteredEvents.length} events</div>
                        </div>
                      </Button>
                      
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full h-14 gap-3 rounded-xl border-2 transition-all duration-200",
                          isDarkMode 
                            ? "border-slate-600 bg-slate-800/50 hover:bg-slate-700 text-slate-200" 
                            : "border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
                        )}
                        onClick={() => {
                          // Close the current dialog
                          const closeButton = document.querySelector('[data-state="open"] button[type="button"]');
                          if (closeButton) closeButton.click();
                          // Enable select mode
                          setIsSelectMode(true);
                        }}
                      >
                        <div className={cn(
                          "p-2 rounded-lg",
                          isDarkMode ? "bg-slate-700" : "bg-gray-100"
                        )}>
                          <Checkbox className="h-5 w-5 border-gray-400 data-[state=checked]:bg-black data-[state=checked]:border-black data-[state=checked]:text-white" />
                        </div>
                        <div className="text-left">
                          <div className="font-semibold">Select Specific Events</div>
                          <div className={cn(
                            "text-sm",
                            isDarkMode ? "text-slate-400" : "text-gray-500"
                          )}>Choose which events to include in the report</div>
                        </div>
                      </Button>
                    </div>

                    {/* Info Note */}
                    <div className={cn(
                      "p-4 rounded-xl border-l-4",
                      isDarkMode 
                        ? "border-slate-500 bg-slate-800/50" 
                        : "border-gray-400 bg-gray-50"
                    )}>
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "p-1 rounded-full mt-0.5",
                          isDarkMode ? "bg-slate-700" : "bg-gray-200"
                        )}>
                          <FileText className={cn(
                            "h-4 w-4",
                            isDarkMode ? "text-slate-300" : "text-gray-600"
                          )} />
                        </div>
                        <div>
                          <div className={cn(
                            "font-medium text-sm mb-1",
                            isDarkMode ? "text-slate-200" : "text-gray-800"
                          )}>
                            Report Features
                          </div>
                          <div className={cn(
                            "text-xs",
                            isDarkMode ? "text-slate-400" : "text-gray-600"
                          )}>
                            • Detailed event information and schedules<br/>
                            • Multiple location support<br/>
                            • Department requirements and contact details
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
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
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn(
                    "h-10 px-4 text-base font-medium",
                    isDarkMode ? "border-slate-700" : "border-gray-200"
                  )}>
                    {events.length} total
                  </Badge>
                  {(searchTerm || statusFilter !== "all") && (
                    <Badge variant="secondary" className={cn(
                      "h-10 px-4 text-base font-medium",
                      isDarkMode 
                        ? "bg-slate-700 text-slate-200 border-slate-600" 
                        : "bg-gray-100 text-gray-700 border-gray-300"
                    )}>
                      {filteredEvents.length} filtered
                    </Badge>
                  )}
                </div>
              </div>

              {/* Search and Filters */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[300px]">
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
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger
                    className={cn(
                      "w-[200px]",
                      isDarkMode
                        ? "bg-slate-900 border-slate-700"
                        : "bg-white border-gray-200"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-gray-400" />
                      <SelectValue placeholder="Sort by..." />
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
                    <SelectItem value="startDate-desc" className={cn(
                      isDarkMode ? "focus:bg-slate-800" : "focus:bg-gray-100",
                      isDarkMode ? "text-gray-100" : "text-gray-900"
                    )}>
                      Latest Start Date
                    </SelectItem>
                    <SelectItem value="startDate-asc" className={cn(
                      isDarkMode ? "focus:bg-slate-800" : "focus:bg-gray-100",
                      isDarkMode ? "text-gray-100" : "text-gray-900"
                    )}>
                      Earliest Start Date
                    </SelectItem>
                    <SelectItem value="created-desc" className={cn(
                      isDarkMode ? "focus:bg-slate-800" : "focus:bg-gray-100",
                      isDarkMode ? "text-gray-100" : "text-gray-900"
                    )}>
                      Newest Created
                    </SelectItem>
                    <SelectItem value="created-asc" className={cn(
                      isDarkMode ? "focus:bg-slate-800" : "focus:bg-gray-100",
                      isDarkMode ? "text-gray-100" : "text-gray-900"
                    )}>
                      Oldest Created
                    </SelectItem>
                    <SelectItem value="title-asc" className={cn(
                      isDarkMode ? "focus:bg-slate-800" : "focus:bg-gray-100",
                      isDarkMode ? "text-gray-100" : "text-gray-900"
                    )}>
                      Title A-Z
                    </SelectItem>
                    <SelectItem value="title-desc" className={cn(
                      isDarkMode ? "focus:bg-slate-800" : "focus:bg-gray-100",
                      isDarkMode ? "text-gray-100" : "text-gray-900"
                    )}>
                      Title Z-A
                    </SelectItem>
                    <SelectItem value="requestor-asc" className={cn(
                      isDarkMode ? "focus:bg-slate-800" : "focus:bg-gray-100",
                      isDarkMode ? "text-gray-100" : "text-gray-900"
                    )}>
                      Requestor A-Z
                    </SelectItem>
                    <SelectItem value="requestor-desc" className={cn(
                      isDarkMode ? "focus:bg-slate-800" : "focus:bg-gray-100",
                      isDarkMode ? "text-gray-100" : "text-gray-900"
                    )}>
                      Requestor Z-A
                    </SelectItem>
                    <SelectItem value="status-asc" className={cn(
                      isDarkMode ? "focus:bg-slate-800" : "focus:bg-gray-100",
                      isDarkMode ? "text-gray-100" : "text-gray-900"
                    )}>
                      Status A-Z
                    </SelectItem>
                    <SelectItem value="status-desc" className={cn(
                      isDarkMode ? "focus:bg-slate-800" : "focus:bg-gray-100",
                      isDarkMode ? "text-gray-100" : "text-gray-900"
                    )}>
                      Status Z-A
                    </SelectItem>
                  </SelectContent>
                </Select>

                {/* Status filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger
                    className={cn(
                      "w-[150px]",
                      isDarkMode
                        ? "bg-slate-900 border-slate-700"
                        : "bg-white border-gray-200"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4 text-gray-400" />
                      <SelectValue placeholder="All Status" />
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
                    <SelectItem value="all" className={cn(
                      isDarkMode ? "focus:bg-slate-800" : "focus:bg-gray-100",
                      isDarkMode ? "text-gray-100" : "text-gray-900"
                    )}>
                      All Status
                    </SelectItem>
                    <SelectItem value="pending" className={cn(
                      isDarkMode ? "focus:bg-slate-800" : "focus:bg-gray-100",
                      isDarkMode ? "text-gray-100" : "text-gray-900"
                    )}>
                      Pending
                    </SelectItem>
                    <SelectItem value="approved" className={cn(
                      isDarkMode ? "focus:bg-slate-800" : "focus:bg-gray-100",
                      isDarkMode ? "text-gray-100" : "text-gray-900"
                    )}>
                      Approved
                    </SelectItem>
                    <SelectItem value="disapproved" className={cn(
                      isDarkMode ? "focus:bg-slate-800" : "focus:bg-gray-100",
                      isDarkMode ? "text-gray-100" : "text-gray-900"
                    )}>
                      Disapproved
                    </SelectItem>
                  </SelectContent>
                </Select>

                {/* Clear Filters Button */}
                {(searchTerm || statusFilter !== "all") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchTerm("");
                      setStatusFilter("all");
                    }}
                    className={cn(
                      "gap-2 whitespace-nowrap",
                      isDarkMode
                        ? "border-slate-600 hover:bg-slate-800 text-slate-300"
                        : "border-gray-300 hover:bg-gray-50 text-gray-600"
                    )}
                  >
                    <X className="h-4 w-4" />
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow className={cn(
                  "border-b h-12",
                  isDarkMode 
                    ? "border-slate-700 bg-slate-800/30" 
                    : "border-gray-200 bg-gray-50/50"
                )}>
                  <TableHead className={cn(
                    "w-[250px] py-3 px-4 text-xs font-medium",
                    isDarkMode ? "text-slate-400" : "text-gray-600"
                  )}>Event Title</TableHead>
                  <TableHead className={cn(
                    "py-3 px-4 text-xs font-medium",
                    isDarkMode ? "text-slate-400" : "text-gray-600"
                  )}>Requestor</TableHead>
                  <TableHead className={cn(
                    "py-3 px-4 text-xs font-medium",
                    isDarkMode ? "text-slate-400" : "text-gray-600"
                  )}>Start Date</TableHead>
                  <TableHead className={cn(
                    "py-3 px-4 text-xs font-medium",
                    isDarkMode ? "text-slate-400" : "text-gray-600"
                  )}>End Date</TableHead>
                  <TableHead className={cn(
                    "py-3 px-4 text-xs font-medium",
                    isDarkMode ? "text-slate-400" : "text-gray-600"
                  )}>Location</TableHead>
                  <TableHead className={cn(
                    "py-3 px-4 text-xs font-medium text-center",
                    isDarkMode ? "text-slate-400" : "text-gray-600"
                  )}>Status</TableHead>
                  <TableHead className={cn(
                    "py-3 px-4 text-xs font-medium text-center",
                    isDarkMode ? "text-slate-400" : "text-gray-600"
                  )}>Actions</TableHead>
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
                    <motion.tr 
                      key={event.id} 
                      className={cn(
                        "transition-all duration-200 ease-in-out border-b",
                        isDarkMode 
                          ? "border-slate-700" 
                          : "border-gray-100",
                        isSelectMode && (isDarkMode
                          ? "hover:bg-slate-800/50 cursor-pointer hover:shadow-sm"
                          : "hover:bg-gray-50 cursor-pointer hover:shadow-sm"),
                        isSelectMode && selectedEvents.includes(event) && (isDarkMode 
                          ? "bg-slate-800 shadow-sm border-slate-600" 
                          : "bg-gray-100 shadow-sm border-gray-300"
                        ),
                        !isSelectMode && (isDarkMode 
                          ? "hover:bg-slate-800/50" 
                          : "hover:bg-gray-50")
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
                      whileHover={isSelectMode ? { scale: 1.01 } : {}}
                      transition={{ duration: 0.2 }}
                    >
                      <TableCell className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {isSelectMode && (
                            <motion.div
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <Checkbox
                                checked={selectedEvents.includes(event)}
                                className={cn(
                                  "pointer-events-none h-4 w-4 rounded transition-all duration-200",
                                  "border-gray-400 data-[state=checked]:bg-black data-[state=checked]:border-black data-[state=checked]:text-white"
                                )}
                              />
                            </motion.div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className={cn(
                                "font-medium text-sm cursor-pointer transition-colors duration-200 truncate",
                                isDarkMode 
                                  ? "text-slate-100 hover:text-white" 
                                  : "text-gray-900 hover:text-black"
                              )}>
                                {event.title}
                              </h3>
                              {event.recentActivity && event.recentActivity.length > 0 && (
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shrink-0"></div>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        <div>
                          <p className={cn(
                            "font-medium text-sm truncate",
                            isDarkMode ? "text-slate-100" : "text-gray-900"
                          )}>
                            {event.requestor}
                          </p>
                          <p className={cn(
                            "text-xs mt-0.5 truncate",
                            isDarkMode ? "text-slate-400" : "text-gray-500"
                          )}>
                            {event.userDepartment || event.department || "No department"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        <div className="space-y-1">
                          {event.locations && event.locations.length > 0 ? (
                            <div className="space-y-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedRequest(event);
                                  setIsViewDialogOpen(true);
                                }}
                                className={cn(
                                  "text-xs px-2 py-1 h-auto transition-all duration-200",
                                  isDarkMode 
                                    ? "bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700" 
                                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                                )}
                              >
                                View Schedule
                              </Button>
                              {event.recentActivity && event.recentActivity.length > 0 && (
                                <motion.div 
                                  className={cn(
                                    "flex items-center gap-1 cursor-pointer rounded px-1 py-0.5 transition-colors duration-200",
                                    isDarkMode ? "hover:bg-slate-700" : "hover:bg-gray-100"
                                  )}
                                  whileHover={{ scale: 1.02 }}
                                  transition={{ duration: 0.2 }}
                                  onClick={() => {
                                    setSelectedEventActivity(event);
                                    setIsActivityDialogOpen(true);
                                  }}
                                >
                                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                                  <span className={cn(
                                    "text-xs font-medium",
                                    isDarkMode ? "text-green-400" : "text-green-600"
                                  )}>Updated</span>
                                </motion.div>
                              )}
                            </div>
                          ) : (
                            <div>
                              <p className={cn(
                                "font-medium text-sm",
                                isDarkMode ? "text-slate-100" : "text-gray-900"
                              )}>
                                {event.startDate ? format(new Date(event.startDate.seconds * 1000), "MMM d, yyyy") : 
                                 event.date ? format(new Date(event.date.seconds * 1000), "MMM d, yyyy") : "Not set"}
                              </p>
                              <p className={cn(
                                "text-xs mt-0.5",
                                isDarkMode ? "text-slate-400" : "text-gray-500"
                              )}>
                                {event.startDate ? format(new Date(event.startDate.seconds * 1000), "h:mm a") : 
                                 event.date ? format(new Date(event.date.seconds * 1000), "h:mm a") : ""}
                              </p>
                            </div>
                          )}
                          {event.recentActivity && event.recentActivity.some(activity => activity.type === 'startDateTime') && (
                            <motion.div 
                              className={cn(
                                "flex items-center gap-1 cursor-pointer rounded px-1 py-0.5 transition-colors duration-200",
                                isDarkMode ? "hover:bg-slate-700" : "hover:bg-gray-100"
                              )}
                              whileHover={{ scale: 1.02 }}
                              transition={{ duration: 0.2 }}
                              onClick={() => {
                                setSelectedEventActivity(event);
                                setIsActivityDialogOpen(true);
                              }}
                            >
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                              <span className={cn(
                                "text-xs font-medium",
                                isDarkMode ? "text-green-400" : "text-green-600"
                              )}>Updated</span>
                            </motion.div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        <div className="space-y-1">
                          {event.locations && event.locations.length > 0 ? (
                            <div className="space-y-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedRequest(event);
                                  setIsViewDialogOpen(true);
                                }}
                                className={cn(
                                  "text-xs px-2 py-1 h-auto transition-all duration-200",
                                  isDarkMode 
                                    ? "bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700" 
                                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                                )}
                              >
                                View Schedule
                              </Button>
                              {event.recentActivity && event.recentActivity.length > 0 && (
                                <motion.div 
                                  className={cn(
                                    "flex items-center gap-1 cursor-pointer rounded px-1 py-0.5 transition-colors duration-200",
                                    isDarkMode ? "hover:bg-slate-700" : "hover:bg-gray-100"
                                  )}
                                  whileHover={{ scale: 1.02 }}
                                  transition={{ duration: 0.2 }}
                                  onClick={() => {
                                    setSelectedEventActivity(event);
                                    setIsActivityDialogOpen(true);
                                  }}
                                >
                                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"></div>
                                  <span className={cn(
                                    "text-xs font-medium",
                                    isDarkMode ? "text-orange-400" : "text-orange-600"
                                  )}>Updated</span>
                                </motion.div>
                              )}
                            </div>
                          ) : (
                            <div>
                              <p className={cn(
                                "font-medium text-sm",
                                isDarkMode ? "text-slate-100" : "text-gray-900"
                              )}>
                                {event.endDate ? format(new Date(event.endDate.seconds * 1000), "MMM d, yyyy") : "Not set"}
                              </p>
                              <p className={cn(
                                "text-xs mt-0.5",
                                isDarkMode ? "text-slate-400" : "text-gray-500"
                              )}>
                                {event.endDate ? format(new Date(event.endDate.seconds * 1000), "h:mm a") : ""}
                              </p>
                            </div>
                          )}
                          {event.recentActivity && event.recentActivity.some(activity => activity.type === 'endDateTime') && (
                            <motion.div 
                              className={cn(
                                "flex items-center gap-1 cursor-pointer rounded px-1 py-0.5 transition-colors duration-200",
                                isDarkMode ? "hover:bg-slate-700" : "hover:bg-gray-100"
                              )}
                              whileHover={{ scale: 1.02 }}
                              transition={{ duration: 0.2 }}
                              onClick={() => {
                                setSelectedEventActivity(event);
                                setIsActivityDialogOpen(true);
                              }}
                            >
                              <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"></div>
                              <span className={cn(
                                "text-xs font-medium",
                                isDarkMode ? "text-orange-400" : "text-orange-600"
                              )}>Updated</span>
                            </motion.div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        <div className="space-y-1">
                          {event.locations && event.locations.length > 0 ? (
                            <div className="space-y-2">
                              <Badge variant="outline" className={cn(
                                "text-xs px-2 py-1",
                                isDarkMode 
                                  ? "bg-slate-800 border-slate-600 text-slate-200" 
                                  : "bg-white border-gray-300 text-gray-700"
                              )}>
                                {event.locations.length} locations
                              </Badge>
                              {event.recentActivity && event.recentActivity.length > 0 && (
                                <motion.div 
                                  className={cn(
                                    "flex items-center gap-1 cursor-pointer rounded px-1 py-0.5 transition-colors duration-200",
                                    isDarkMode ? "hover:bg-slate-700" : "hover:bg-gray-100"
                                  )}
                                  whileHover={{ scale: 1.02 }}
                                  transition={{ duration: 0.2 }}
                                  onClick={() => {
                                    setSelectedEventActivity(event);
                                    setIsActivityDialogOpen(true);
                                  }}
                                >
                                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                                  <span className={cn(
                                    "text-xs font-medium",
                                    isDarkMode ? "text-blue-400" : "text-blue-600"
                                  )}>Updated</span>
                                </motion.div>
                              )}
                            </div>
                          ) : (
                            <p className={cn(
                              "text-sm font-medium truncate",
                              isDarkMode ? "text-slate-100" : "text-gray-900"
                            )}>
                              {event.location}
                            </p>
                          )}
                          {event.recentActivity && event.recentActivity.some(activity => activity.type === 'location') && (
                            <motion.div 
                              className={cn(
                                "flex items-center gap-1 cursor-pointer rounded px-1 py-0.5 transition-colors duration-200",
                                isDarkMode ? "hover:bg-slate-700" : "hover:bg-gray-100"
                              )}
                              whileHover={{ scale: 1.02 }}
                              transition={{ duration: 0.2 }}
                              onClick={() => {
                                setSelectedEventActivity(event);
                                setIsActivityDialogOpen(true);
                              }}
                            >
                              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                              <span className={cn(
                                "text-xs font-medium",
                                isDarkMode ? "text-blue-400" : "text-blue-600"
                              )}>Updated</span>
                            </motion.div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-center">
                        <div className="flex items-center justify-center">
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
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-gray-100"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent 
                              align="end" 
                              className={cn(
                                "w-56 p-2 border-0 shadow-xl bg-white/95 backdrop-blur-md rounded-xl",
                                isDarkMode ? "bg-slate-900/95 border-slate-700/50" : "bg-white/95 border-gray-200/50"
                              )}
                              sideOffset={8}
                            >
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedRequest(event);
                                  setIsViewDialogOpen(true);
                                }}
                                className={cn(
                                  "cursor-pointer rounded-lg p-3 mb-1 transition-all duration-200 hover:scale-[1.02]",
                                  "flex items-center gap-3 group",
                                  isDarkMode 
                                    ? "hover:bg-slate-800/80 text-gray-200 hover:text-white" 
                                    : "hover:bg-gray-100/80 text-gray-700 hover:text-gray-900"
                                )}
                              >
                                <div className={cn(
                                  "p-2 rounded-lg transition-colors",
                                  isDarkMode 
                                    ? "bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20" 
                                    : "bg-blue-50 text-blue-600 group-hover:bg-blue-100"
                                )}>
                                  <Eye className="h-4 w-4" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-medium text-sm">View Details</span>
                                  <span className={cn(
                                    "text-xs opacity-70",
                                    isDarkMode ? "text-gray-400" : "text-gray-500"
                                  )}>
                                    See full event information
                                  </span>
                                </div>
                              </DropdownMenuItem>
                              
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEventForAction(event);
                                  setIsApproveDialogOpen(true);
                                }}
                                className={cn(
                                  "cursor-pointer rounded-lg p-3 mb-1 transition-all duration-200 hover:scale-[1.02]",
                                  "flex items-center gap-3 group",
                                  isDarkMode 
                                    ? "hover:bg-green-500/10 text-gray-200 hover:text-green-400" 
                                    : "hover:bg-green-50 text-gray-700 hover:text-green-600"
                                )}
                              >
                                <div className={cn(
                                  "p-2 rounded-lg transition-colors",
                                  isDarkMode 
                                    ? "bg-green-500/10 text-green-400 group-hover:bg-green-500/20" 
                                    : "bg-green-50 text-green-600 group-hover:bg-green-100"
                                )}>
                                  <Check className="h-4 w-4" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-medium text-sm">Approve</span>
                                  <span className={cn(
                                    "text-xs opacity-70",
                                    isDarkMode ? "text-gray-400" : "text-gray-500"
                                  )}>
                                    Accept this event request
                                  </span>
                                </div>
                              </DropdownMenuItem>
                              
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEventForAction(event);
                                  setDisapprovalReason("");
                                  setIsReasonDialogOpen(true);
                                }}
                                className={cn(
                                  "cursor-pointer rounded-lg p-3 transition-all duration-200 hover:scale-[1.02]",
                                  "flex items-center gap-3 group",
                                  isDarkMode 
                                    ? "hover:bg-red-500/10 text-gray-200 hover:text-red-400" 
                                    : "hover:bg-red-50 text-gray-700 hover:text-red-600"
                                )}
                              >
                                <div className={cn(
                                  "p-2 rounded-lg transition-colors",
                                  isDarkMode 
                                    ? "bg-red-500/10 text-red-400 group-hover:bg-red-500/20" 
                                    : "bg-red-50 text-red-600 group-hover:bg-red-100"
                                )}>
                                  <XCircle className="h-4 w-4" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-medium text-sm">Disapprove</span>
                                  <span className={cn(
                                    "text-xs opacity-70",
                                    isDarkMode ? "text-gray-400" : "text-gray-500"
                                  )}>
                                    Reject with reason
                                  </span>
                                </div>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>

                          {/* Approve Dialog */}
                          <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
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
                                  onClick={async () => {
                                    try {
                                      // TODO: Get actual admin ID from auth context
                                      const adminId = "admin"; // Temporary admin ID
                                      const result = await updateEventRequestStatus(selectedEventForAction.id, 'approved', adminId);
                                      if (result.success) {
                                        toast.success("Event request approved successfully");
                                        // Immediately update the local state
                                        setEvents(prevEvents => 
                                          prevEvents.map(e => 
                                            e.id === selectedEventForAction.id 
                                              ? { ...e, status: 'approved', adminId: 'admin', actionDate: new Date() }
                                              : e
                                          )
                                        );
                                        setIsApproveDialogOpen(false);
                                        // Also fetch fresh data to ensure consistency
                                        setTimeout(async () => {
                                          await fetchEvents();
                                        }, 1000);
                                      } else {
                                        toast.error("Failed to approve event request");
                                      }
                                    } catch (error) {
                                      toast.error("Failed to approve event request");
                                    }
                                  }}
                                >
                                  Approve
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>

                          {/* Disapprove Dialog */}
                          <Dialog open={isReasonDialogOpen} onOpenChange={setIsReasonDialogOpen}>
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
                                        const result = await updateEventRequestStatus(selectedEventForAction.id, 'disapproved', adminId, disapprovalReason.trim());
                                        if (result.success) {
                                          toast.success("Event request disapproved with reason provided");
                                          // Immediately update the local state
                                          setEvents(prevEvents => 
                                            prevEvents.map(e => 
                                              e.id === selectedEventForAction.id 
                                                ? { ...e, status: 'disapproved', adminId: 'admin', actionDate: new Date(), disapprovalReason: disapprovalReason.trim() }
                                                : e
                                            )
                                          );
                                          setIsReasonDialogOpen(false);
                                          setDisapprovalReason(""); // Reset the reason after successful update
                                          // Also fetch fresh data to ensure consistency
                                          setTimeout(async () => {
                                            await fetchEvents();
                                          }, 1000);
                                        } else {
                                          toast.error("Failed to disapprove event request");
                                        }
                                      } catch (error) {
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
                      </TableCell>
                      </motion.tr>
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
        <DialogContent className="sm:max-w-[900px] p-0 border-0 bg-white rounded-2xl overflow-hidden">
          {selectedRequest && (
            <ScrollArea className="h-[85vh]">
              {/* Header Section */}
              <div className="relative bg-white p-8 border-b border-gray-200">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-4 h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600"
                  onClick={() => setIsViewDialogOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
                <Badge
                  variant="outline"
                  className="mb-3 border-gray-300 text-gray-600 bg-gray-50"
                >
                  {selectedRequest.userDepartment || selectedRequest.department}
                </Badge>
                <DialogTitle className="text-2xl font-bold text-gray-900 mb-2">
                  {selectedRequest.title}
                </DialogTitle>
                <p className="text-gray-600">Event Details & Requirements</p>
              </div>
              
              {/* Content Section */}
              <div className="p-8 bg-gray-50 space-y-8">

                {/* Event Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Requestor */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-black rounded-lg">
                        <User className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="font-semibold text-gray-900">Requestor</h3>
                    </div>
                    <div className="text-xl font-bold text-gray-900 mb-1">{selectedRequest.requestor}</div>
                    <div className="text-sm text-gray-500 uppercase tracking-wide">{selectedRequest.userDepartment}</div>
                  </div>

                  {/* Date & Time */}
                  {selectedRequest.locations && selectedRequest.locations.length > 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm md:col-span-2">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-black">
                          <Clock className="h-5 w-5 text-white" />
                        </div>
                        <h3 className="font-semibold text-gray-900">Multiple Location Schedule</h3>
                      </div>
                      <div className="space-y-4 max-h-60 overflow-y-auto">
                        {selectedRequest.locations.map((location, index) => (
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
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-black rounded-lg">
                          <Clock className="h-5 w-5 text-white" />
                        </div>
                        <h3 className="font-semibold text-gray-900">Schedule</h3>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">START</div>
                          <div className="text-sm font-semibold text-gray-900">
                            {selectedRequest.startDate ? 
                              format(selectedRequest.startDate.toDate ? selectedRequest.startDate.toDate() : new Date(selectedRequest.startDate), "MMM d, yyyy") :
                              selectedRequest.date?.seconds ? 
                                format(new Date(selectedRequest.date.seconds * 1000), "MMM d, yyyy") :
                                "Not available"
                            }
                          </div>
                          <div className="text-sm text-gray-600">
                            {selectedRequest.startDate ? 
                              format(selectedRequest.startDate.toDate ? selectedRequest.startDate.toDate() : new Date(selectedRequest.startDate), "h:mm a") :
                              selectedRequest.date?.seconds ? 
                                format(new Date(selectedRequest.date.seconds * 1000), "h:mm a") :
                                "Not available"
                            }
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">END</div>
                          <div className="text-sm font-semibold text-gray-900">
                            {selectedRequest.endDate ? 
                              format(selectedRequest.endDate.toDate ? selectedRequest.endDate.toDate() : new Date(selectedRequest.endDate), "MMM d, yyyy") :
                              "Not available"
                            }
                          </div>
                          <div className="text-sm text-gray-600">
                            {selectedRequest.endDate ? 
                              format(selectedRequest.endDate.toDate ? selectedRequest.endDate.toDate() : new Date(selectedRequest.endDate), "h:mm a") :
                              "Not available"
                            }
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Location */}
                  {selectedRequest.locations && selectedRequest.locations.length > 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-black">
                          <MapPin className="h-5 w-5 text-white" />
                        </div>
                        <h3 className="font-semibold text-gray-900">Locations</h3>
                      </div>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {selectedRequest.locations.map((location, index) => (
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
                        {selectedRequest.locations.length} Venues
                      </p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-black rounded-lg">
                          <MapPin className="h-5 w-5 text-white" />
                        </div>
                        <h3 className="font-semibold text-gray-900">Location</h3>
                      </div>
                      <div className="text-xl font-bold text-gray-900 mb-1">{selectedRequest.location}</div>
                      <div className="text-sm text-gray-500 uppercase tracking-wide">Venue</div>
                    </div>
                  )}

                  {/* Participants */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-black rounded-lg">
                        <Users className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="font-semibold text-gray-900">Attendees</h3>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 mb-1">{selectedRequest.participants}</div>
                    <div className="text-sm text-gray-500 uppercase tracking-wide">Expected Participants</div>
                  </div>

                  {/* VIP */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-black rounded-lg">
                        <User className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="font-semibold text-gray-900">VIPs</h3>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 mb-1">{selectedRequest.vip || 0}</div>
                    <div className="text-sm text-gray-500 uppercase tracking-wide">VIP Attendees</div>
                  </div>

                  {/* VVIP */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-black rounded-lg">
                        <User className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="font-semibold text-gray-900">VVIPs</h3>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 mb-1">{selectedRequest.vvip || 0}</div>
                    <div className="text-sm text-gray-500 uppercase tracking-wide">VVIP Attendees</div>
                  </div>
                </div>

                {/* Requirements Card */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-black rounded-lg">
                        <FileText className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="font-semibold text-gray-900">Requirements</h3>
                    </div>
                    <Button
                      size="sm"
                      className="gap-2 bg-black hover:bg-gray-900 text-white border-0 rounded-lg"
                      onClick={() => setIsRequirementsDialogOpen(true)}
                    >
                      <Eye className="h-4 w-4" />
                      View Full Details
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {selectedRequest.departmentRequirements && selectedRequest.departmentRequirements.slice(0, 2).map((dept, deptIndex) => (
                      <div key={deptIndex} className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="border-gray-300 text-gray-600 bg-gray-50">
                            {dept.departmentName}
                          </Badge>
                        </div>
                        {dept.requirements.slice(0, 2).map((req, reqIndex) => {
                          const requirement = typeof req === 'string' ? { name: req } : req;
                          return (
                            <div
                              key={`${deptIndex}-${reqIndex}`}
                              className="mb-2 last:mb-0 flex items-start gap-2 text-gray-600"
                            >
                              <div className="p-1.5 rounded-md mt-0.5 bg-black shadow-sm">
                                <FileText className="h-4 w-4 text-white" />
                              </div>
                              <div>
                                <span className="font-semibold block text-gray-700">
                                  {requirement.name}
                                </span>
                                <div className="mt-1 space-y-0.5">
                                  <span className="text-xs block text-gray-500">
                                    {requirement.note || "No notes provided for this requirement"}
                                  </span>
                                </div>
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
                      <div className="mt-4 text-center">
                        <p className="text-sm text-gray-500">
                          Click "View Full Details" to see all requirements
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Classifications Card */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-black rounded-lg">
                      <FileText className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-900">Classifications</h3>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-base leading-relaxed whitespace-pre-wrap text-gray-700">
                      {selectedRequest.classifications || "No classifications provided"}
                    </p>
                  </div>
                </div>

                {/* Contact Details Card */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-black rounded-lg">
                      <Phone className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-900">Contact Details</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Phone Number */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Phone className="h-4 w-4 text-gray-600" />
                        <span className="text-sm font-medium text-gray-600">Phone Number</span>
                      </div>
                      <p className="text-base font-semibold text-gray-900">{selectedRequest.contactNumber || "Not provided"}</p>
                    </div>

                    {/* Email */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Mail className="h-4 w-4 text-gray-600" />
                        <span className="text-sm font-medium text-gray-600">Email Address</span>
                      </div>
                      <p className="text-base font-semibold text-gray-900">{selectedRequest.contactEmail || selectedRequest.userEmail || "Not provided"}</p>
                    </div>
                  </div>
                </div>

                {/* Attachments Card */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-black rounded-lg">
                      <FileText className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-900">Attachments</h3>
                  </div>
                  {selectedRequest.attachments && selectedRequest.attachments.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3">
                      {selectedRequest.attachments.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-black rounded-lg shrink-0">
                              <FileText className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{file.name}</p>
                              <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
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
                    <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500">
                      No attachments uploaded
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Requirements Dialog */}
      <Dialog open={isRequirementsDialogOpen} onOpenChange={setIsRequirementsDialogOpen}>
        <DialogContent className="sm:max-w-[900px] p-0 border-0 bg-white rounded-2xl overflow-hidden max-h-[90vh]">
          {selectedRequest && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-4 h-8 w-8 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-900 z-10"
                onClick={() => setIsRequirementsDialogOpen(false)}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
              
              <ScrollArea className="max-h-[80vh] overflow-y-auto">
                <div className="p-8 space-y-6">

                {selectedRequest.departmentRequirements && selectedRequest.departmentRequirements.length > 0 ? (
                  selectedRequest.departmentRequirements.map((dept, deptIndex) => (
                    <div key={deptIndex} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                      <div className="bg-white border-b border-gray-200 p-6">
                        <h3 className="text-xl font-bold text-gray-900">{dept.departmentName}</h3>
                        <p className="text-gray-600 text-sm mt-1">{dept.requirements.length} requirement{dept.requirements.length !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="p-6 bg-gray-50">
                        <div className={cn(
                          "grid gap-4",
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
                                className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm"
                              >
                                <div className="flex items-center gap-3 mb-3">
                                  <div className="p-1.5 bg-black rounded-lg shrink-0">
                            <FileText className="h-4 w-4 text-white" />
                                  </div>
                                  <h4 className="font-semibold text-sm text-gray-900">
                                    {requirement.name}
                                  </h4>
                                </div>
                                <div className="pl-8">
                                  <span className="text-xs text-gray-600">
                                    {requirement.note || "No notes provided for this requirement"}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center">
                    <p className="text-sm text-gray-500">
                      No requirements specified for this event
                    </p>
                  </div>
                )}
                </div>
              </ScrollArea>
            </>
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

      {/* Activity Dialog */}
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
                                    return "Invalid date";
                                  }
                                })()}
                              </div>
                            </div>
                          </div>
                        ))}
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

export default EventRequests;