import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Search,
  Filter,
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  User,
  Eye,
  FileText,
  ChevronDown,
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

// Sample data - replace with actual data from Firebase
const sampleRequests = [
  {
    id: "REQ-001",
    title: "Department Meeting",
    date: new Date(2024, 2, 15, 10, 0),
    location: "Conference Room A",
    participants: 12,
    status: "pending",
    type: "meeting",
    description: "Monthly department sync-up meeting to discuss ongoing projects.",
    requestor: {
      name: "John Doe",
      email: "john@example.com",
      department: "IT",
      avatar: null,
    },
    provisions: "Projector, Whiteboard, Coffee and Snacks",
    requestedAt: new Date(2024, 2, 10, 14, 30),
    attachments: [
      { name: "Agenda.pdf", size: "245 KB" },
      { name: "Presentation.pptx", size: "1.2 MB" },
    ],
  },
  {
    id: "REQ-002",
    title: "Team Building Workshop",
    date: new Date(2024, 2, 20, 14, 30),
    location: "Main Hall",
    participants: 30,
    status: "pending",
    type: "workshop",
    description: "Annual team building event focusing on collaboration.",
    requestor: {
      name: "Jane Smith",
      email: "jane@example.com",
      department: "HR",
      avatar: null,
    },
    provisions: "Audio System, Projector, Name Tags, Refreshments",
    requestedAt: new Date(2024, 2, 11, 9, 15),
    attachments: [
      { name: "Workshop_Plan.pdf", size: "380 KB" },
      { name: "Budget.xlsx", size: "128 KB" },
    ],
  },
];

const statusColors = {
  pending: "bg-yellow-500/10 text-yellow-500",
  approved: "bg-green-500/10 text-green-500",
  rejected: "bg-red-500/10 text-red-500",
};

const statusIcons = {
  pending: AlertCircle,
  approved: CheckCircle2,
  rejected: XCircle,
};

const EventRequests = () => {
  const { isDarkMode } = useTheme();
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState(null);

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

  const handleAction = (request, action) => {
    setSelectedRequest(request);
    setActionType(action);
    setIsActionDialogOpen(true);
  };

  const handleConfirmAction = () => {
    // Implement the actual approval/rejection logic here
    console.log(`${actionType} request:`, selectedRequest);
    setIsActionDialogOpen(false);
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
              Event Requests
            </h1>
            <p
              className={cn(
                "text-sm mt-1",
                isDarkMode ? "text-gray-400" : "text-gray-500"
              )}
            >
              Review and manage event requests from users
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="h-8 px-3 font-medium">
              {sampleRequests.length} requests
            </Badge>
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
            placeholder="Search requests..."
            className={cn(
              "pl-9",
              isDarkMode
                ? "bg-slate-900 border-slate-700"
                : "bg-white border-gray-200"
            )}
          />
        </div>
        <Select defaultValue="all">
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
              All Requests
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

      {/* Requests Table */}
      <motion.div variants={item}>
        <div className={cn(
          "rounded-xl border shadow-sm",
          isDarkMode ? "border-slate-700 bg-slate-900" : "border-gray-100 bg-white"
        )}>
          <div className="p-6">
            {/* Table Header */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className={cn(
                    "text-lg font-semibold mb-1",
                    isDarkMode ? "text-gray-100" : "text-gray-900"
                  )}>
                    Event Requests
                  </h3>
                  <p className={cn(
                    "text-sm",
                    isDarkMode ? "text-gray-400" : "text-gray-500"
                  )}>
                    Manage and review all event requests from users
                  </p>
                </div>
                <Badge variant="outline" className={cn(
                  "h-8 px-3 font-medium",
                  isDarkMode ? "border-slate-700" : "border-gray-200"
                )}>
                  {sampleRequests.length} requests
                </Badge>
              </div>

              {/* Search and Filter */}
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by event title, requestor, or location..."
                    className={cn(
                      "pl-9",
                      isDarkMode
                        ? "bg-slate-900 border-slate-700"
                        : "bg-white border-gray-200"
                    )}
                  />
                </div>
                <Select defaultValue="all">
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
                      All Requests
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
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow className={cn(
                  isDarkMode ? "border-slate-700 hover:bg-transparent" : "border-gray-100 hover:bg-transparent"
                )}>
                  <TableHead className="w-[200px] py-4 font-semibold">Event Details</TableHead>
                  <TableHead className="font-semibold">Requestor</TableHead>
                  <TableHead className="font-semibold">Date & Time</TableHead>
                  <TableHead className="font-semibold">Location</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sampleRequests.map((request) => {
                  const StatusIcon = statusIcons[request.status];
                  return (
                    <TableRow 
                      key={request.id} 
                      className={cn(
                        isDarkMode 
                          ? "hover:bg-slate-800/50 border-slate-700" 
                          : "hover:bg-gray-50/50 border-gray-100",
                        "transition-colors cursor-pointer"
                      )}
                      onClick={() => {
                        setSelectedRequest(request);
                        setIsViewDialogOpen(true);
                      }}
                    >
                      <TableCell className="py-4">
                        <div>
                          <p className={cn(
                            "font-medium mb-1",
                            isDarkMode ? "text-gray-100" : "text-gray-900"
                          )}>{request.title}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className={cn(
                              "capitalize",
                              isDarkMode ? "bg-slate-800" : "bg-gray-100"
                            )}>
                              {request.type}
                            </Badge>
                            <span className={cn(
                              "text-xs",
                              isDarkMode ? "text-gray-400" : "text-gray-500"
                            )}>
                              {request.id}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div>
                          <p className={cn(
                            "text-sm font-medium",
                            isDarkMode ? "text-gray-100" : "text-gray-900"
                          )}>{request.requestor.name}</p>
                          <p className={cn(
                            "text-xs",
                            isDarkMode ? "text-gray-400" : "text-gray-500"
                          )}>{request.requestor.department}</p>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className={cn(
                              "text-sm font-medium",
                              isDarkMode ? "text-gray-100" : "text-gray-900"
                            )}>{format(request.date, "MMM d, yyyy")}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className={cn(
                              "text-sm",
                              isDarkMode ? "text-gray-400" : "text-gray-500"
                            )}>{format(request.date, "h:mm a")}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span className={cn(
                            "text-sm font-medium",
                            isDarkMode ? "text-gray-100" : "text-gray-900"
                          )}>{request.location}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "capitalize flex items-center gap-1 w-fit",
                            statusColors[request.status]
                          )}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {request.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center justify-end gap-2">
                          {request.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                className="bg-green-500 hover:bg-green-600 text-white gap-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAction(request, 'approve');
                                }}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                className="bg-red-500 hover:bg-red-600 text-white gap-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAction(request, 'reject');
                                }}
                              >
                                <XCircle className="h-4 w-4" />
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Table Footer */}
            <div className="mt-4 flex items-center justify-between">
              <p className={cn(
                "text-sm",
                isDarkMode ? "text-gray-400" : "text-gray-500"
              )}>
                Click on any row to view detailed information about the event request
              </p>
              <p className={cn(
                "text-sm",
                isDarkMode ? "text-gray-400" : "text-gray-500"
              )}>
                Last updated {format(new Date(), "MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* View Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className={cn(
          "sm:max-w-[600px]",
          isDarkMode ? "bg-slate-900" : "bg-white"
        )}>
          <DialogHeader>
            <DialogTitle className={cn(
              "text-xl font-semibold",
              isDarkMode ? "text-white" : "text-gray-900"
            )}>
              Event Request Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-6">
                {/* Header Section */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className={cn(
                      "text-lg font-semibold mb-1",
                      isDarkMode ? "text-white" : "text-gray-900"
                    )}>
                      {selectedRequest.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className={cn(
                        "capitalize",
                        isDarkMode ? "bg-slate-800" : "bg-gray-100"
                      )}>
                        {selectedRequest.type}
                      </Badge>
                      <span className={cn(
                        "text-sm",
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      )}>
                        {selectedRequest.id}
                      </span>
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "capitalize flex items-center gap-1",
                      statusColors[selectedRequest.status]
                    )}
                  >
                    {(() => {
                      const StatusIcon = statusIcons[selectedRequest.status];
                      return <StatusIcon className="h-3 w-3" />;
                    })()}
                    {selectedRequest.status}
                  </Badge>
                </div>

                <Separator className={isDarkMode ? "bg-slate-700" : "bg-gray-200"} />

                {/* Requestor Info */}
                <div>
                  <h4 className={cn(
                    "text-sm font-medium mb-3",
                    isDarkMode ? "text-gray-300" : "text-gray-600"
                  )}>Requestor</h4>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={selectedRequest.requestor.avatar} />
                      <AvatarFallback className={isDarkMode ? "bg-slate-700" : "bg-gray-100"}>
                        <User className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className={cn(
                        "font-medium",
                        isDarkMode ? "text-gray-100" : "text-gray-900"
                      )}>{selectedRequest.requestor.name}</p>
                      <div className="flex items-center gap-2 text-sm">
                        <span className={isDarkMode ? "text-gray-400" : "text-gray-500"}>
                          {selectedRequest.requestor.department}
                        </span>
                        <span className={isDarkMode ? "text-gray-600" : "text-gray-300"}>•</span>
                        <span className={isDarkMode ? "text-gray-400" : "text-gray-500"}>
                          {selectedRequest.requestor.email}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator className={isDarkMode ? "bg-slate-700" : "bg-gray-200"} />

                {/* Event Details */}
                <div>
                  <h4 className={cn(
                    "text-sm font-medium mb-3",
                    isDarkMode ? "text-gray-300" : "text-gray-600"
                  )}>Event Details</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* Date & Time */}
                    <div className="space-y-1">
                      <p className={isDarkMode ? "text-gray-400" : "text-gray-500"}>Date & Time</p>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className={isDarkMode ? "text-gray-100" : "text-gray-900"}>
                            {format(selectedRequest.date, "PPP")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className={isDarkMode ? "text-gray-100" : "text-gray-900"}>
                            {format(selectedRequest.date, "p")}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Location */}
                    <div className="space-y-1">
                      <p className={isDarkMode ? "text-gray-400" : "text-gray-500"}>Location</p>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className={isDarkMode ? "text-gray-100" : "text-gray-900"}>
                          {selectedRequest.location}
                        </span>
                      </div>
                    </div>

                    {/* Participants */}
                    <div className="space-y-1">
                      <p className={isDarkMode ? "text-gray-400" : "text-gray-500"}>Participants</p>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className={isDarkMode ? "text-gray-100" : "text-gray-900"}>
                          {selectedRequest.participants} attendees
                        </span>
                      </div>
                    </div>

                    {/* Request Date */}
                    <div className="space-y-1">
                      <p className={isDarkMode ? "text-gray-400" : "text-gray-500"}>Requested On</p>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className={isDarkMode ? "text-gray-100" : "text-gray-900"}>
                          {format(selectedRequest.requestedAt, "PPP p")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator className={isDarkMode ? "bg-slate-700" : "bg-gray-200"} />

                {/* Description */}
                <div className="space-y-1">
                  <p className={isDarkMode ? "text-gray-400" : "text-gray-500"}>Description</p>
                  <p className={isDarkMode ? "text-gray-100" : "text-gray-900"}>
                    {selectedRequest.description}
                  </p>
                </div>

                {/* Provisions */}
                <div className="space-y-1">
                  <p className={isDarkMode ? "text-gray-400" : "text-gray-500"}>Provisions Required</p>
                  <p className={isDarkMode ? "text-gray-100" : "text-gray-900"}>
                    {selectedRequest.provisions}
                  </p>
                </div>

                {/* Attachments */}
                <div className="space-y-3">
                  <p className={isDarkMode ? "text-gray-400" : "text-gray-500"}>Attachments</p>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedRequest.attachments.map((file, index) => (
                      <div
                        key={index}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border",
                          isDarkMode ? "border-slate-700 bg-slate-800/50" : "border-gray-200 bg-gray-50"
                        )}
                      >
                        <FileText className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className={cn(
                            "text-sm font-medium",
                            isDarkMode ? "text-gray-100" : "text-gray-900"
                          )}>{file.name}</p>
                          <p className={cn(
                            "text-xs",
                            isDarkMode ? "text-gray-400" : "text-gray-500"
                          )}>{file.size}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Confirmation Dialog */}
      <AlertDialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
        <AlertDialogContent className={cn(
          isDarkMode ? "bg-slate-900 border-0" : "bg-white border-0"
        )}>
          <AlertDialogHeader>
            <AlertDialogTitle className={cn(
              "text-xl",
              isDarkMode ? "text-white" : "text-gray-900"
            )}>
              {actionType === 'approve' ? 'Approve Request' : 'Reject Request'}
            </AlertDialogTitle>
            <AlertDialogDescription className={isDarkMode ? "text-gray-400" : "text-gray-500"}>
              Are you sure you want to {actionType} this event request? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={cn(
              isDarkMode && "bg-slate-800 border-slate-700 hover:bg-slate-700 text-white"
            )}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className={cn(
                actionType === 'approve'
                  ? "bg-green-500 hover:bg-green-600"
                  : "bg-red-500 hover:bg-red-600",
                "text-white"
              )}
              onClick={handleConfirmAction}
            >
              {actionType === 'approve' ? 'Approve' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default EventRequests;