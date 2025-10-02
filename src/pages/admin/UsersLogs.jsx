import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";
import useUserLogsStore from "@/store/userLogsStore";
import { toast } from "sonner";
import {
  Search,
  Filter,
  User,
  Calendar,
  Clock,
  Activity,
  FileText,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Trash2,
} from "lucide-react";
import {
  Input
} from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const UsersLogs = () => {
  const { isDarkMode } = useTheme();
  const { 
    logs, 
    loading, 
    error, 
    fetchLogs, 
    forceSync, 
    getFilteredLogs,
    initialize,
    deleteLog,
    clearAllCache
  } = useUserLogsStore();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLogForDelete, setSelectedLogForDelete] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const itemsPerPage = 10;

  // Filter logs using store method
  const filteredLogs = getFilteredLogs({
    search: searchTerm,
    action: actionFilter,
    status: statusFilter,
    dateRange: dateFilter
  });

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + itemsPerPage);

  // Stats calculations
  const totalLogs = logs.length;
  const successLogs = logs.filter(log => log.status === "success").length;
  const errorLogs = logs.filter(log => log.status === "error").length;

  const getStatusColor = (status) => {
    switch (status) {
      case "success":
        return "bg-green-500/10 text-green-500";
      case "error":
        return "bg-red-500/10 text-red-500";
      case "warning":
        return "bg-yellow-500/10 text-yellow-500";
      default:
        return "bg-gray-500/10 text-gray-500";
    }
  };

  const getActionIcon = (action) => {
    switch (action.toLowerCase()) {
      case "login":
        return <User className="h-4 w-4" />;
      case "logout":
        return <User className="h-4 w-4" />;
      case "event created":
        return <Calendar className="h-4 w-4" />;
      case "profile updated":
        return <FileText className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  // Initialize store on component mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  const handleRefresh = async () => {
    await forceSync();
  };

  const handleExport = () => {
    // Export filtered logs to CSV
    const csvContent = "data:text/csv;charset=utf-8," 
      + "User,Email,Department,Action,Status,Timestamp\n"
      + filteredLogs.map(log => 
          `"${log.userName}","${log.userEmail}","${log.department}","${log.action}","${log.status}","${formatTimestamp(log.timestamp)}"`
        ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `user_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteLog = (log) => {
    setSelectedLogForDelete(log);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteLog = async () => {
    if (selectedLogForDelete) {
      try {
        const result = await deleteLog(selectedLogForDelete.id);
        
        if (result.success) {
          toast.success("Log entry deleted successfully");
        } else {
          toast.error(result.error || "Failed to delete log entry");
        }
      } catch (error) {
        console.error('Error deleting log:', error);
        toast.error("An error occurred while deleting the log entry");
      } finally {
        setIsDeleteDialogOpen(false);
        setSelectedLogForDelete(null);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={cn(
            "text-3xl font-bold tracking-tight",
            isDarkMode ? "text-white" : "text-gray-900"
          )}>
            Users Logs
          </h1>
          <p className={cn(
            "text-base mt-2",
            isDarkMode ? "text-gray-400" : "text-gray-500"
          )}>
            Monitor and track user login activities (regular users only, excludes Admin and SuperAdmin)
          </p>
          {error && (
            <p className="text-sm text-red-500 mt-1">
              {error}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            className="gap-2"
            onClick={() => {
              clearAllCache();
              toast.success("Cache cleared! Refreshing data...");
              handleRefresh();
            }}
          >
            <XCircle className="h-4 w-4" />
            Clear Cache
          </Button>
          <Button 
            variant="outline"
            className="gap-2"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button 
            className="bg-black hover:bg-gray-800 text-white gap-2"
            onClick={handleExport}
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className={cn(
          "rounded-xl p-6 border-0 shadow-md hover:shadow-lg transition-shadow duration-200",
          isDarkMode 
            ? "bg-slate-800/50 shadow-slate-900/20" 
            : "bg-white shadow-gray-200/60"
        )}>
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className={cn(
                "p-3 rounded-xl",
                isDarkMode ? "bg-blue-500/10" : "bg-blue-50"
              )}>
                <FileText className="h-6 w-6 text-blue-500" />
              </div>
            </div>
            <div>
              <p className={cn(
                "text-sm font-medium",
                isDarkMode ? "text-slate-400" : "text-gray-600"
              )}>Total Logs</p>
              <p className={cn(
                "text-2xl font-bold tracking-tight",
                isDarkMode ? "text-white" : "text-gray-900"
              )}>{totalLogs}</p>
            </div>
          </div>
        </div>

        <div className={cn(
          "rounded-xl p-6 border-0 shadow-md hover:shadow-lg transition-shadow duration-200",
          isDarkMode 
            ? "bg-slate-800/50 shadow-slate-900/20" 
            : "bg-white shadow-gray-200/60"
        )}>
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className={cn(
                "p-3 rounded-xl",
                isDarkMode ? "bg-green-500/10" : "bg-green-50"
              )}>
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
            </div>
            <div>
              <p className={cn(
                "text-sm font-medium",
                isDarkMode ? "text-slate-400" : "text-gray-600"
              )}>Success Events</p>
              <p className={cn(
                "text-2xl font-bold tracking-tight",
                isDarkMode ? "text-white" : "text-gray-900"
              )}>{successLogs}</p>
            </div>
          </div>
        </div>

        <div className={cn(
          "rounded-xl p-6 border-0 shadow-md hover:shadow-lg transition-shadow duration-200",
          isDarkMode 
            ? "bg-slate-800/50 shadow-slate-900/20" 
            : "bg-white shadow-gray-200/60"
        )}>
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className={cn(
                "p-3 rounded-xl",
                isDarkMode ? "bg-red-500/10" : "bg-red-50"
              )}>
                <XCircle className="h-6 w-6 text-red-500" />
              </div>
            </div>
            <div>
              <p className={cn(
                "text-sm font-medium",
                isDarkMode ? "text-slate-400" : "text-gray-600"
              )}>Error Events</p>
              <p className={cn(
                "text-2xl font-bold tracking-tight",
                isDarkMode ? "text-white" : "text-gray-900"
              )}>{errorLogs}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className={cn(
        "rounded-xl p-6 space-y-4 border-0 shadow-md",
        isDarkMode 
          ? "bg-slate-800/50 shadow-slate-900/20" 
          : "bg-white shadow-gray-200/60"
      )}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="search">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="search"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={cn(
                  "pl-10 border-0 shadow-sm focus:shadow-md transition-shadow duration-200",
                  isDarkMode 
                    ? "bg-slate-700/50 shadow-slate-900/20 focus:shadow-slate-900/30" 
                    : "bg-white shadow-gray-200/60 focus:shadow-gray-300/60"
                )}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="action-filter">Action</Label>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className={cn(
                "border-0 shadow-sm focus:shadow-md transition-shadow duration-200",
                isDarkMode 
                  ? "bg-slate-700/50 shadow-slate-900/20 focus:shadow-slate-900/30" 
                  : "bg-white shadow-gray-200/60 focus:shadow-gray-300/60"
              )}>
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="login">Login</SelectItem>
                <SelectItem value="logout">Logout</SelectItem>
                <SelectItem value="event">Event Actions</SelectItem>
                <SelectItem value="profile">Profile Updates</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status-filter">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className={cn(
                "border-0 shadow-sm focus:shadow-md transition-shadow duration-200",
                isDarkMode 
                  ? "bg-slate-700/50 shadow-slate-900/20 focus:shadow-slate-900/30" 
                  : "bg-white shadow-gray-200/60 focus:shadow-gray-300/60"
              )}>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date-filter">Date Range</Label>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className={cn(
                "border-0 shadow-sm focus:shadow-md transition-shadow duration-200",
                isDarkMode 
                  ? "bg-slate-700/50 shadow-slate-900/20 focus:shadow-slate-900/30" 
                  : "bg-white shadow-gray-200/60 focus:shadow-gray-300/60"
              )}>
                <SelectValue placeholder="All Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className={cn(
        "rounded-xl overflow-hidden border-0 shadow-md",
        isDarkMode 
          ? "bg-slate-800/50 shadow-slate-900/20" 
          : "bg-white shadow-gray-200/60"
      )}>
        <Table className="border-0" style={{ border: 'none', borderCollapse: 'separate' }}>
          <TableHeader className="border-0" style={{ border: 'none' }}>
            <TableRow 
              className={cn(
                "bg-muted/30 hover:bg-muted/30",
                isDarkMode ? "bg-slate-800/20" : "bg-muted/30"
              )}
              style={{ border: 'none', borderBottom: 'none' }}
            >
              <TableHead 
                className="h-12 px-6 text-left align-middle font-medium text-muted-foreground"
                style={{ border: 'none', borderBottom: 'none' }}
              >
                User
              </TableHead>
              <TableHead 
                className="h-12 px-4 text-left align-middle font-medium text-muted-foreground"
                style={{ border: 'none', borderBottom: 'none' }}
              >
                Action
              </TableHead>
              <TableHead 
                className="h-12 px-4 text-left align-middle font-medium text-muted-foreground"
                style={{ border: 'none', borderBottom: 'none' }}
              >
                Status
              </TableHead>
              <TableHead 
                className="h-12 px-4 text-left align-middle font-medium text-muted-foreground"
                style={{ border: 'none', borderBottom: 'none' }}
              >
                Timestamp
              </TableHead>
              <TableHead 
                className="h-12 px-6 text-right align-middle font-medium text-muted-foreground"
                style={{ border: 'none', borderBottom: 'none' }}
              >
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="border-0">
            {paginatedLogs.length === 0 ? (
              <TableRow className="border-0">
                <TableCell colSpan={5} className="h-24 text-center border-0">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <FileText className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">No logs found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedLogs.map((log, index) => (
                <TableRow 
                  key={log.id}
                  className={cn(
                    "transition-colors hover:bg-muted/40",
                    index < paginatedLogs.length - 1 ? "border-b border-gray-200" : "border-0",
                    index % 2 === 0 ? "bg-transparent" : "bg-muted/10"
                  )}
                >
                  <TableCell 
                    className="px-6 py-4"
                    style={{ border: 'none' }}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-7 w-7 flex-shrink-0">
                        <AvatarImage src="" />
                        <AvatarFallback className="text-xs font-medium bg-muted text-muted-foreground">
                          {log.userName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-none mb-1">
                          {log.userName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {log.department}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell 
                    className="px-4 py-4"
                    style={{ border: 'none' }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex-shrink-0">
                        {getActionIcon(log.action)}
                      </div>
                      <span className="text-sm font-medium">
                        {log.action}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell 
                    className="px-4 py-4"
                    style={{ border: 'none' }}
                  >
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-xs font-medium px-2 py-1",
                        getStatusColor(log.status)
                      )}
                    >
                      {log.status}
                    </Badge>
                  </TableCell>
                  <TableCell 
                    className="px-4 py-4"
                    style={{ border: 'none' }}
                  >
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="font-mono text-xs">
                        {formatTimestamp(log.timestamp)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell 
                    className="px-6 py-4 text-right"
                    style={{ border: 'none' }}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteLog(log)}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination - Always visible, but Next only clickable with 10+ items */}
        <div className="flex items-center justify-end px-6 py-4 bg-muted/10 border-t border-gray-100">
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              Page <span className="font-medium">{currentPage}</span> of{" "}
              <span className="font-medium">{totalPages}</span>
            </div>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    className={cn(
                      "h-9 px-3 text-sm border border-gray-200 hover:bg-gray-50",
                      currentPage === 1 
                        ? "pointer-events-none opacity-50" 
                        : "cursor-pointer"
                    )}
                  />
                </PaginationItem>
                
                {/* Show page numbers */}
                {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        onClick={() => setCurrentPage(pageNum)}
                        isActive={currentPage === pageNum}
                        className={cn(
                          "h-9 w-9 text-sm border border-gray-200",
                          currentPage === pageNum 
                            ? "bg-black text-white border-black hover:bg-gray-800" 
                            : "hover:bg-gray-50",
                          filteredLogs.length >= 10 ? "cursor-pointer" : "pointer-events-none opacity-50"
                        )}
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => filteredLogs.length >= 10 && setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    className={cn(
                      "h-9 px-3 text-sm border border-gray-200",
                      filteredLogs.length >= 10 && currentPage < totalPages
                        ? "cursor-pointer hover:bg-gray-50" 
                        : "pointer-events-none opacity-50"
                    )}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-white border border-gray-200 shadow-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-semibold text-gray-900">
              Delete Log Entry
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              Are you sure you want to delete this log entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2">
            <AlertDialogCancel 
              onClick={() => setIsDeleteDialogOpen(false)}
              className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteLog}
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

export default UsersLogs;
