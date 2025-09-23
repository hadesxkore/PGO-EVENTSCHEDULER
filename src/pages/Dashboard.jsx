import { useState, useEffect, useMemo } from "react";
import { registerNotifications, saveSubscription } from "../lib/utils/notifications.jsx";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Calendar, Clock, Users, CalendarDays, ChevronRight, Bell, X, Tag, FileText, AlertCircle } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { cn } from "../lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "../components/ui/hover-card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import { ScrollArea } from "../components/ui/scroll-area";
import useEventStore from "../store/eventStore";
import useNotificationStore from "../store/notificationStore";
import { auth, db } from "../lib/firebase/firebase";
import { format, isAfter, isBefore, addHours } from "date-fns";
import { toast } from "sonner";

// Helper function to generate consistent black and white theme
const getEventColor = (title) => {
  return "ring-gray-400";
};

// Helper function to get background color for avatar - black and white theme
const getEventBgColor = (title) => {
  return "bg-black";
};

// Helper function to get status color based on event time - black and white theme
const getEventStatusColor = (event) => {
  try {
    if (!event?.date) return "bg-gray-400"; // No date set

    const now = new Date();
    const eventDate = new Date(event.date);
    
    if (isNaN(eventDate.getTime())) {
      return "bg-gray-400"; // Invalid date
    }

    const eventEnd = addHours(eventDate, (event.duration || 0) / 60);

    if (isBefore(eventEnd, now)) {
      return "bg-gray-400"; // Past event
    }
    if (isAfter(eventDate, now)) {
      return "bg-black"; // Upcoming event
    }
    return "bg-gray-600"; // Ongoing event
  } catch (error) {
    return "bg-gray-400"; // Error case
  }
};

const Dashboard = () => {
  const navigate = useNavigate();
  const isDarkMode = false; // Always use light mode
  
  // Get state and actions from Zustand stores
  const { 
    dashboardData, 
    loading, 
    error,
    fetchDashboardData 
  } = useEventStore();

  // Get real-time notification data
  const {
    upcomingEvents,
    taggedEvents,
    statusUpdates,
    loading: notificationsLoading,
    error: notificationsError,
    setupRealtimeListeners,
    cleanupListeners,
    getNotificationCounts,
    getAllNotifications,
    clearError
  } = useNotificationStore();

  // Add state to track viewed notifications and popover state
  const [viewedNotifications, setViewedNotifications] = useState(new Set());
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [userDepartment, setUserDepartment] = useState(null);
  
  // State for managing selected event and dialog
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Memoize notification counts to prevent unnecessary re-renders
  const notificationCounts = useMemo(() => {
    return {
      upcoming: upcomingEvents.length,
      tagged: taggedEvents.length,
      status: statusUpdates.length,
      total: upcomingEvents.length + taggedEvents.length + statusUpdates.length
    };
  }, [upcomingEvents.length, taggedEvents.length, statusUpdates.length]);

  // Function to mark notifications as read
  const markNotificationsAsRead = () => {
    const allNotificationIds = [
      ...upcomingEvents.map(event => `upcoming-${event.id || event.title}`),
      ...taggedEvents.map(event => `tagged-${event.id || event.title}`),
      ...statusUpdates.map(event => `status-${event.id || event.title}`)
    ];
    setViewedNotifications(new Set(allNotificationIds));
  };

  useEffect(() => {
    const loadDashboardData = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      // Get user department for tagged events
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setUserDepartment(userData.department);
        }
      } catch (error) {
        console.error('Error getting user department:', error);
      }

      const result = await fetchDashboardData(currentUser.uid, true); // Force refresh
      if (!result.success) {
        toast.error(result.error || "Failed to fetch dashboard data");
      }
    };

    loadDashboardData();
  }, [fetchDashboardData]);

  // Setup real-time listeners when user is available
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser && userDepartment) {
      setupRealtimeListeners(currentUser.uid, userDepartment);
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      cleanupListeners();
    };
  }, [userDepartment, setupRealtimeListeners, cleanupListeners]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      cleanupListeners();
    };
  }, [cleanupListeners]);

  // Show error toast if there's an error
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  // Show notification error toast
  useEffect(() => {
    if (notificationsError) {
      toast.error(notificationsError);
      clearError();
    }
  }, [notificationsError, clearError]);



  const stats = [
    {
      title: "Total Events",
      value: loading ? "-" : dashboardData.totalEvents.toString(),
      icon: <CalendarDays className="h-6 w-6 text-black" />,
      trend: "All time events",
      trendUp: true,
      color: "bg-gray-100",
      borderColor: "border-gray-200",
    },
    {
      title: "Upcoming Events",
      value: loading ? "-" : dashboardData.upcomingEvents.toString(),
      icon: <Calendar className="h-6 w-6 text-black" />,
      trend: dashboardData.nextEventIn ? `Next event in ${dashboardData.nextEventIn} days` : "No upcoming events",
      trendUp: !loading && dashboardData.upcomingEvents > 0,
      color: "bg-gray-100",
      borderColor: "border-gray-200",
    },
    {
      title: "Department Events",
      value: loading ? "-" : dashboardData.departmentEvents.toString(),
      icon: <Users className="h-6 w-6 text-black" />,
      trend: `${dashboardData.thisWeekEvents} this week`,
      trendUp: dashboardData.thisWeekEvents > 0,
      color: "bg-gray-100",
      borderColor: "border-gray-200",
    },
    {
      title: "Hours Scheduled",
      value: loading ? "-" : dashboardData.totalHours.toString(),
      icon: <Clock className="h-6 w-6 text-black" />,
      trend: `${dashboardData.thisWeekHours} hours this week`,
      trendUp: dashboardData.thisWeekHours > 0,
      color: "bg-gray-100",
      borderColor: "border-gray-200",
    },
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={container}
      className="space-y-8"
    >
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <motion.div variants={item}>
          <h1 className={cn(
            "text-3xl font-bold",
            isDarkMode ? "text-white" : "text-gray-900"
          )}>Dashboard</h1>
          <p className={cn(
            "text-sm mt-1",
            isDarkMode ? "text-gray-400" : "text-gray-500"
          )}>Welcome back! Here's what's happening with your events.</p>
        </motion.div>

                  <motion.div 
          variants={item}
          className="flex items-center gap-4"
        >
          <Popover 
            open={isPopoverOpen}
            onOpenChange={(open) => {
              setIsPopoverOpen(open);
              if (open) {
                markNotificationsAsRead();
              }
            }}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={cn(
                  "relative rounded-xl border-0 bg-black hover:bg-gray-800 text-white"
                )}
              >
                <Bell className="h-5 w-5" />
                {!notificationsLoading && 
                  notificationCounts.total > 0 && 
                  viewedNotifications.size < notificationCounts.total && (
                  <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              className={cn(
                "w-96 p-0 border-0",
                isDarkMode ? "bg-gray-800" : "bg-white"
              )}
              align="end"
            >
              <Tabs defaultValue="all" className="w-full">
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                  <h4 className={cn(
                    "font-semibold",
                    isDarkMode ? "text-white" : "text-gray-900"
                  )}>Notifications</h4>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-8 w-8 p-0 rounded-full",
                      isDarkMode ? "hover:bg-gray-700 text-gray-400 hover:text-gray-100" : "hover:bg-gray-100 text-gray-500 hover:text-gray-900"
                    )}
                    onClick={() => setIsPopoverOpen(false)}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                  </Button>
                </div>
                <div className="px-4 pb-2">
                  <TabsList className="grid w-full grid-cols-4 gap-1">
                    <TabsTrigger 
                      value="all" 
                      className={cn(
                        "flex items-center justify-center gap-1.5 px-2 py-2 text-xs font-medium transition-colors",
                        "data-[state=active]:bg-black data-[state=active]:text-white",
                        "dark:data-[state=active]:bg-white dark:data-[state=active]:text-black",
                        isDarkMode 
                          ? "bg-gray-800 text-gray-400 hover:text-white" 
                          : "bg-gray-100 text-gray-600 hover:text-black"
                      )}
                    >
                      <Bell className="h-3.5 w-3.5" />
                      <span>All</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="upcoming" 
                      className={cn(
                        "flex items-center justify-center gap-1.5 px-2 py-2 text-xs font-medium transition-colors",
                        "data-[state=active]:bg-black data-[state=active]:text-white",
                        "dark:data-[state=active]:bg-white dark:data-[state=active]:text-black",
                        isDarkMode 
                          ? "bg-gray-800 text-gray-400 hover:text-white" 
                          : "bg-gray-100 text-gray-600 hover:text-black"
                      )}
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Upcoming</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="tagged" 
                      className={cn(
                        "flex items-center justify-center gap-1.5 px-2 py-2 text-xs font-medium transition-colors",
                        "data-[state=active]:bg-black data-[state=active]:text-white",
                        "dark:data-[state=active]:bg-white dark:data-[state=active]:text-black",
                        isDarkMode 
                          ? "bg-gray-800 text-gray-400 hover:text-white" 
                          : "bg-gray-100 text-gray-600 hover:text-black"
                      )}
                    >
                      <Tag className="h-3.5 w-3.5" />
                      <span>Tagged</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="status" 
                      className={cn(
                        "flex items-center justify-center gap-1.5 px-2 py-2 text-xs font-medium transition-colors",
                        "data-[state=active]:bg-black data-[state=active]:text-white",
                        "dark:data-[state=active]:bg-white dark:data-[state=active]:text-black",
                        isDarkMode 
                          ? "bg-gray-800 text-gray-400 hover:text-white" 
                          : "bg-gray-100 text-gray-600 hover:text-black"
                      )}
                    >
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span>Status</span>
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="all" className="p-0 m-0">
                  <ScrollArea className="h-[300px]">
                    <div className="p-4 space-y-4">
                      {notificationsLoading ? (
                        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                          Loading notifications...
                        </div>
                      ) : notificationCounts.total === 0 ? (
                        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                          No notifications
                        </div>
                      ) : (
                        <>
                          {/* Status Updates */}
                          {statusUpdates.map((event, index) => (
                            <motion.div
                              key={`status-${index}`}
                              initial={{ opacity: 0, x: 50, scale: 0.95 }}
                              animate={{ opacity: 1, x: 0, scale: 1 }}
                              transition={{ 
                                duration: 0.4, 
                                delay: index * 0.1,
                                ease: "easeOut"
                              }}
                              className={cn(
                                "rounded-lg p-3 transition-colors",
                                isDarkMode 
                                  ? "bg-gray-800/50" 
                                  : "bg-gray-50"
                              )}
                            >
                              <div className="flex items-start gap-3">
                                <div className={cn(
                                  "p-2 rounded-md",
                                  isDarkMode ? "bg-gray-700" : "bg-white",
                                  event.status === 'approved' 
                                    ? "text-green-500" 
                                    : "text-red-500"
                                )}>
                                  <AlertCircle className="h-4 w-4" />
                                </div>
                                <div className="flex-1 space-y-2">
                                  <div>
                                    <p className={cn(
                                      "text-sm font-medium",
                                      isDarkMode ? "text-gray-200" : "text-gray-900"
                                    )}>{event.title}</p>
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        {event.status === 'approved' ? (
                                          <Badge className="bg-green-500/10 text-green-500">
                                            Approved
                                          </Badge>
                                        ) : (
                                          <Badge className="bg-red-500/10 text-red-500">
                                            Disapproved
                                          </Badge>
                                        )}
                                      </div>
                                      {event.status === 'disapproved' && event.disapprovalReason && (
                                        <p className={cn(
                                          "text-xs",
                                          isDarkMode ? "text-gray-400" : "text-gray-500"
                                        )}>
                                          Reason: {event.disapprovalReason}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <p className={cn(
                                    "text-xs",
                                    isDarkMode ? "text-gray-400" : "text-gray-500"
                                  )}>
                                    {format(new Date(event.updatedAt?.seconds * 1000), "MMM d, yyyy 'at' h:mm a")}
                                  </p>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                          
                          {/* Upcoming Events */}
                          {upcomingEvents.map((event, index) => (
                            <motion.div
                              key={`upcoming-${index}`}
                              initial={{ opacity: 0, x: 50, scale: 0.95 }}
                              animate={{ opacity: 1, x: 0, scale: 1 }}
                              transition={{ 
                                duration: 0.4, 
                                delay: (statusUpdates.length + index) * 0.1,
                                ease: "easeOut"
                              }}
                              onClick={() => {
                                navigate('/my-events');
                                setIsPopoverOpen(false);
                              }}
                              className={cn(
                                "rounded-lg p-3 transition-colors cursor-pointer",
                                isDarkMode 
                                  ? "bg-gray-800/50 hover:bg-gray-800" 
                                  : "bg-gray-50 hover:bg-gray-100"
                              )}
                            >
                              <div className="flex items-start gap-3">
                                <div className={cn(
                                  "p-2 rounded-md",
                                  isDarkMode ? "bg-gray-700" : "bg-white"
                                )}>
                                  <Calendar className="h-4 w-4 text-blue-500" />
                                </div>
                                <div className="flex-1 space-y-1">
                                  <p className={cn(
                                    "text-sm font-medium",
                                    isDarkMode ? "text-gray-200" : "text-gray-900"
                                  )}>{event.title}</p>
                                  <p className={cn(
                                    "text-xs",
                                    isDarkMode ? "text-gray-400" : "text-gray-500"
                                  )}>
                                    {format(new Date(event.date), "MMM d, yyyy 'at' h:mm a")}
                                  </p>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                          
                          {/* Tagged Events */}
                          {taggedEvents.map((event, index) => (
                            <motion.div
                              key={`tagged-${index}`}
                              initial={{ opacity: 0, x: 50, scale: 0.95 }}
                              animate={{ opacity: 1, x: 0, scale: 1 }}
                              transition={{ 
                                duration: 0.4, 
                                delay: (statusUpdates.length + upcomingEvents.length + index) * 0.1,
                                ease: "easeOut"
                              }}
                              onClick={() => {
                                // Navigate to Tagged Departments page with Tagged tab selected
                                navigate('/tagged-departments', { state: { selectedTab: 'tagged' } });
                                setIsPopoverOpen(false); // Close the notifications popover
                              }}
                              className={cn(
                                "rounded-lg p-3 transition-colors cursor-pointer",
                                isDarkMode 
                                  ? "bg-gray-800/50 hover:bg-gray-700" 
                                  : "bg-gray-50 hover:bg-gray-100"
                              )}
                            >
                              <div className="flex items-start gap-3">
                                <div className={cn(
                                  "p-2 rounded-md",
                                  isDarkMode ? "bg-gray-700" : "bg-white"
                                )}>
                                  <Tag className="h-4 w-4 text-purple-500" />
                                </div>
                                <div className="flex-1 space-y-2">
                                  <div>
                                    <p className={cn(
                                      "text-sm font-medium",
                                      isDarkMode ? "text-gray-200" : "text-gray-900"
                                    )}>{event.title}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Badge variant="secondary" className={cn(
                                        "text-xs",
                                        isDarkMode ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"
                                      )}>
                                        {event.department}
                                      </Badge>
                                      <span className={cn(
                                        "text-xs",
                                        isDarkMode ? "text-gray-400" : "text-gray-500"
                                      )}>
                                        tagged your department
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="upcoming" className="p-0 m-0">
                  <ScrollArea className="h-[300px]">
                    <div className="p-4 space-y-4">
                      {notificationsLoading ? (
                        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                          Loading notifications...
                        </div>
                      ) : upcomingEvents.length === 0 ? (
                        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                          No upcoming events
                        </div>
                      ) : (
                        upcomingEvents.map((event, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: 50, scale: 0.95 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            transition={{ 
                              duration: 0.4, 
                              delay: index * 0.1,
                              ease: "easeOut"
                            }}
                            onClick={() => {
                              navigate('/my-events');
                              setIsPopoverOpen(false);
                            }}
                            className={cn(
                              "rounded-lg p-3 transition-colors cursor-pointer",
                              isDarkMode 
                                ? "bg-gray-800/50 hover:bg-gray-700" 
                                : "bg-gray-50 hover:bg-gray-100"
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <div className={cn(
                                "p-2 rounded-md",
                                isDarkMode ? "bg-gray-700" : "bg-white"
                              )}>
                                <Calendar className="h-4 w-4 text-blue-500" />
                              </div>
                              <div className="flex-1 space-y-1">
                                <p className={cn(
                                  "text-sm font-medium",
                                  isDarkMode ? "text-gray-200" : "text-gray-900"
                                )}>{event.title}</p>
                                <p className={cn(
                                  "text-xs",
                                  isDarkMode ? "text-gray-400" : "text-gray-500"
                                )}>
                                  {format(new Date(event.date), "MMM d, yyyy 'at' h:mm a")}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="tagged" className="p-0 m-0">
                  <ScrollArea className="h-[300px]">
                    <div className="p-4 space-y-4">
                      {notificationsLoading ? (
                        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                          Loading notifications...
                        </div>
                      ) : taggedEvents.length === 0 ? (
                        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                          No department tags
                        </div>
                      ) : (
                        taggedEvents.map((event, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: 50, scale: 0.95 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            transition={{ 
                              duration: 0.4, 
                              delay: index * 0.1,
                              ease: "easeOut"
                            }}
                            onClick={() => {
                              // Navigate to Tagged Departments page with Tagged tab selected
                              navigate('/tagged-departments', { state: { selectedTab: 'tagged' } });
                              setIsPopoverOpen(false); // Close the notifications popover
                            }}
                            className={cn(
                              "rounded-lg p-3 transition-colors cursor-pointer",
                              isDarkMode 
                                ? "bg-gray-800/50 hover:bg-gray-700" 
                                : "bg-gray-50 hover:bg-gray-100"
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <div className={cn(
                                "p-2 rounded-md",
                                isDarkMode ? "bg-gray-700" : "bg-white"
                              )}>
                                <Tag className="h-4 w-4 text-purple-500" />
                              </div>
                              <div className="flex-1 space-y-2">
                                <div>
                                  <p className={cn(
                                    "text-sm font-medium",
                                    isDarkMode ? "text-gray-200" : "text-gray-900"
                                  )}>{event.title}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="secondary" className={cn(
                                      "text-xs",
                                      isDarkMode ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"
                                    )}>
                                      {event.department}
                                    </Badge>
                                    <span className={cn(
                                      "text-xs",
                                      isDarkMode ? "text-gray-400" : "text-gray-500"
                                    )}>
                                      tagged your department
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="status" className="p-0 m-0">
                  <ScrollArea className="h-[300px]">
                    <div className="p-4 space-y-4">
                      {notificationsLoading ? (
                        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                          Loading status updates...
                        </div>
                      ) : statusUpdates.length === 0 ? (
                        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                          No status updates
                        </div>
                      ) : (
                        statusUpdates.map((event, index) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, x: 50, scale: 0.95 }}
                              animate={{ opacity: 1, x: 0, scale: 1 }}
                              transition={{ 
                                duration: 0.4, 
                                delay: index * 0.1,
                                ease: "easeOut"
                              }}
                              className={cn(
                                "rounded-lg p-3 transition-colors",
                                isDarkMode 
                                  ? "bg-gray-800/50" 
                                  : "bg-gray-50"
                              )}
                            >
                              <div className="flex items-start gap-3">
                                <div className={cn(
                                  "p-2 rounded-md",
                                  isDarkMode ? "bg-gray-700" : "bg-white",
                                  event.status === 'approved' 
                                    ? "text-green-500" 
                                    : "text-red-500"
                                )}>
                                  <AlertCircle className="h-4 w-4" />
                                </div>
                                <div className="flex-1 space-y-2">
                                  <div>
                                    <p className={cn(
                                      "text-sm font-medium",
                                      isDarkMode ? "text-gray-200" : "text-gray-900"
                                    )}>{event.title}</p>
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        {event.status === 'approved' ? (
                                          <Badge className="bg-green-500/10 text-green-500">
                                            Approved
                                          </Badge>
                                        ) : (
                                          <Badge className="bg-red-500/10 text-red-500">
                                            Disapproved
                                          </Badge>
                                        )}
                                      </div>
                                      {event.status === 'disapproved' && event.disapprovalReason && (
                                        <p className={cn(
                                          "text-xs",
                                          isDarkMode ? "text-gray-400" : "text-gray-500"
                                        )}>
                                          Reason: {event.disapprovalReason}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <p className={cn(
                                    "text-xs",
                                    isDarkMode ? "text-gray-400" : "text-gray-500"
                                  )}>
                                    {format(new Date(event.updatedAt?.seconds * 1000), "MMM d, yyyy 'at' h:mm a")}
                                  </p>
                                </div>
                              </div>
                            </motion.div>
                          ))
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </PopoverContent>
          </Popover>
        </motion.div>
      </div>

      {/* Stats Grid */}
      <motion.div 
        variants={container}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {stats.map((stat) => (
          <motion.div key={stat.title} variants={item}>
            <div className={cn(
              "rounded-xl p-6 transition-all duration-300 cursor-pointer border shadow-sm hover:shadow-md",
              isDarkMode 
                ? "bg-gray-800/50 hover:bg-gray-800 border-gray-700" 
                : "bg-white hover:bg-gray-50/80 border-white shadow-[0_1px_3px_0_rgb(0_0_0_/_0.1),_0_1px_2px_-1px_rgb(0_0_0_/_0.1)]"
            )}>
              <div className="flex items-center justify-between mb-4">
                <div className={cn(
                  "p-3 rounded-xl backdrop-blur-sm",
                  stat.color,
                )}>
                  {stat.icon}
                </div>
                <div className={cn(
                  "text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5 border",
                  stat.trendUp 
                    ? isDarkMode 
                      ? "text-white bg-black border-gray-600" 
                      : "text-black bg-white border-gray-300"
                    : isDarkMode
                      ? "text-gray-300 bg-gray-700 border-gray-600"
                      : "text-gray-600 bg-gray-100 border-gray-300"
                )}>
                  {stat.trend}
                </div>
              </div>
              <div>
                <h3 className={cn(
                  "text-3xl font-bold tracking-tight",
                  isDarkMode ? "text-white" : "text-gray-900"
                )}>{stat.value}</h3>
                <p className={cn(
                  "text-sm font-medium mt-1",
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                )}>{stat.title}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Upcoming Events */}
      <motion.div variants={item}>
        <div className={cn(
          "rounded-xl p-6 border shadow-sm",
          isDarkMode ? "bg-gray-800/50 border-gray-700" : "bg-white border-white shadow-[0_1px_3px_0_rgb(0_0_0_/_0.1),_0_1px_2px_-1px_rgb(0_0_0_/_0.1)]"
        )}>
          <div className="flex items-center justify-between mb-6">
            <div className="space-y-1">
              <h2 className={cn(
                "text-xl font-semibold",
                isDarkMode ? "text-white" : "text-gray-900"
              )}>Upcoming Events</h2>
              <p className={cn(
                "text-sm",
                isDarkMode ? "text-gray-400" : "text-gray-500"
              )}>Your next scheduled events</p>
            </div>
            <Button
              variant="outline"
              className={cn(
                "text-sm rounded-xl border transition-all duration-300 font-medium",
                "bg-black hover:bg-gray-800 text-white border-black hover:border-gray-800"
              )}
              onClick={() => navigate('/my-events')}
            >
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          <div className="space-y-3">
            {loading || notificationsLoading ? (
              <div className={cn(
                "text-sm text-center py-8",
                isDarkMode ? "text-gray-400" : "text-gray-500"
              )}>
                Loading events...
              </div>
            ) : upcomingEvents.length === 0 ? (
              <div className={cn(
                "text-sm text-center py-8",
                isDarkMode ? "text-gray-400" : "text-gray-500"
              )}>
                No upcoming events
              </div>
            ) : (
              <>
                {upcomingEvents.slice(0, 5).map((event) => (
                <motion.div
                  key={event.id}
                  variants={item}
                  onClick={() => navigate('/my-events')}
                  className={cn(
                    "relative overflow-hidden p-4 rounded-xl border transition-colors cursor-pointer",
                    isDarkMode 
                      ? "bg-gray-800/30 hover:bg-gray-800/50 border-gray-700" 
                      : "bg-gray-50/50 hover:bg-white border-gray-100"
                  )}
                >                  
                  <div className="relative flex items-center gap-4">
                    <Avatar className={cn(
                      "h-12 w-12 ring-2 ring-offset-2",
                      isDarkMode 
                        ? "ring-gray-700 ring-offset-gray-800" 
                        : "ring-gray-300 ring-offset-white",
                      getEventColor(event.title)
                    )}>
                      <AvatarFallback 
                        className={cn(
                          "text-white font-semibold",
                          getEventBgColor(event.title)
                        )}
                      >
                        {event.title.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <h3 className={cn(
                          "font-semibold truncate mb-2",
                          isDarkMode ? "text-white" : "text-gray-900"
                        )}>{event.title}</h3>
                      
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "flex items-center gap-1.5",
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        )}>
                          <Calendar className="h-3.5 w-3.5" />
                          <p className="text-sm">
                            {format(event.date, "MMM d, yyyy")}
                            <span className="mx-1">·</span>
                            {format(event.date, "h:mm a")}
                          </p>
                        </div>
                        
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
                {upcomingEvents.length > 5 && (
                  <div className={cn(
                    "text-sm text-center py-4 mt-2 border-t",
                    isDarkMode ? "text-gray-400 border-gray-700" : "text-gray-500 border-gray-200"
                  )}>
                    {upcomingEvents.length - 5} more events. Click "View All" to see them.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </motion.div>
      {/* Event Details Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className={cn(
          "sm:max-w-[500px] p-0 gap-0 border shadow-lg",
          isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200"
        )}>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "absolute right-4 top-4 h-8 w-8 p-0 rounded-full",
              isDarkMode ? "hover:bg-gray-700 text-gray-400 hover:text-gray-100" : "hover:bg-gray-100 text-gray-500 hover:text-gray-900"
            )}
            onClick={() => setIsDialogOpen(false)}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>

          {selectedEvent && (
            <>
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="space-y-1">
                  <Badge variant="outline" className={cn(
                    "font-medium",
                    isDarkMode ? "border-gray-600 text-gray-300" : "border-gray-300 text-gray-700"
                  )}>
                    {selectedEvent.department}
                  </Badge>
                  <h2 className={cn(
                    "text-lg font-semibold tracking-tight",
                    isDarkMode ? "text-white" : "text-gray-900"
                  )}>
                    {selectedEvent.title}
                  </h2>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {/* Requirements and Notes */}
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "p-1.5 rounded",
                    isDarkMode ? "bg-gray-700" : "bg-gray-100"
                  )}>
                    <FileText className="h-4 w-4 text-black" />
                  </div>
                  <h3 className={cn(
                    "font-semibold",
                    isDarkMode ? "text-white" : "text-gray-900"
                  )}>Requirements</h3>
                </div>
                <div className={cn(
                  "rounded-lg p-4",
                  isDarkMode ? "bg-slate-800/50" : "bg-gray-50"
                )}>
                  <div className="space-y-2">
                      {/* Handle simple requirements array */}
                      {Array.isArray(selectedEvent.requirements) && selectedEvent.requirements.length > 0 && (
                        selectedEvent.requirements.map((req, index) => (
                          <div 
                            key={index}
                            className={cn(
                              "flex items-center gap-2 py-2",
                              index !== 0 && "border-t",
                              isDarkMode ? "border-gray-700" : "border-gray-200"
                            )}
                          >
                            <div className={cn(
                              "p-1.5 rounded-md shrink-0",
                              isDarkMode ? "bg-slate-800" : "bg-white"
                            )}>
                              <FileText className="h-3.5 w-3.5 text-black" />
                            </div>
                            <div className={cn(
                              "text-sm",
                              isDarkMode ? "text-gray-300" : "text-gray-700"
                            )}>
                              {req}
                            </div>
                          </div>
                        ))
                      )}
                    
                    {/* Handle departmentRequirements structure */}
                    {selectedEvent.departmentRequirements?.map((dept, deptIndex) => (
                      <div key={deptIndex} className="space-y-2">
                        <div className="text-sm font-medium text-gray-700">{dept.departmentName}</div>
                        {dept.requirements.map((req, reqIndex) => {
                          const requirement = typeof req === 'string' ? { name: req } : req;
                          return (
                            <div 
                              key={`${deptIndex}-${reqIndex}`}
                              className="py-3 px-4 rounded-lg bg-gray-50"
                            >
                              <div className="flex items-center justify-between">
                                <div className="text-sm text-gray-700">
                                  {requirement.name}
                                </div>
                                {requirement.note && (
                                  <Badge variant="outline" className="ml-2">
                                    Notes
                                  </Badge>
                                )}
                              </div>
                              {requirement.note && (
                                <div className="mt-2 text-sm text-gray-600 pl-3 border-l-2 border-gray-200">
                                  {requirement.note}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                    
                    {/* Show message if no requirements found in either format */}
                    {(!selectedEvent.requirements || selectedEvent.requirements.length === 0) && 
                     (!selectedEvent.departmentRequirements || selectedEvent.departmentRequirements.length === 0) && (
                      <div className={cn(
                        "text-sm text-center py-3",
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      )}>
                        No requirements specified
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                {selectedEvent.description && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-900">Description</div>
                    <p className="text-sm text-gray-600 py-3 px-4 rounded-lg bg-gray-50">
                      {selectedEvent.description}
                    </p>
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

export default Dashboard;
