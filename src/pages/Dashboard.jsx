import { useState, useEffect } from "react";
import { registerNotifications, saveSubscription } from "../lib/utils/notifications.jsx";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Calendar, Clock, Users, CalendarDays, ChevronRight, Bell, X, Tag } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { cn } from "../lib/utils";
import { useTheme } from "../contexts/ThemeContext";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import { ScrollArea } from "../components/ui/scroll-area";
import useEventStore from "../store/eventStore";
import { auth } from "../lib/firebase/firebase";
import { format, isAfter, isBefore, addHours } from "date-fns";
import { toast } from "sonner";

// Helper function to generate consistent colors based on string
const getEventColor = (title) => {
  const colors = [
    "ring-blue-500",
    "ring-purple-500",
    "ring-green-500",
    "ring-yellow-500",
    "ring-red-500",
    "ring-indigo-500",
    "ring-pink-500",
    "ring-orange-500"
  ];
  
  const index = title.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[index % colors.length];
};

// Helper function to get background color for avatar
const getEventBgColor = (title) => {
  const colors = [
    "bg-blue-500",
    "bg-purple-500",
    "bg-green-500",
    "bg-yellow-500",
    "bg-red-500",
    "bg-indigo-500",
    "bg-pink-500",
    "bg-orange-500"
  ];
  
  const index = title.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[index % colors.length];
};

// Helper function to get status color based on event time
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
      return "bg-green-500"; // Upcoming event
    }
    return "bg-yellow-500"; // Ongoing event
  } catch (error) {
    return "bg-gray-400"; // Error case
  }
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  // Get state and actions from Zustand store
  const { 
    dashboardData, 
    loading, 
    error,
    fetchDashboardData 
  } = useEventStore();

  // Add state to track viewed notifications
  const [viewedNotifications, setViewedNotifications] = useState(new Set());
  
  // State for managing selected event and dialog
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Function to mark notifications as read
  const markNotificationsAsRead = () => {
    const allNotificationIds = [
      ...dashboardData.upcomingEventsList.map(event => `upcoming-${event.id || event.title}`),
      ...dashboardData.taggedEventsList?.map(event => `tagged-${event.id || event.title}`) || []
    ];
    setViewedNotifications(new Set(allNotificationIds));
  };

  useEffect(() => {
    const loadDashboardData = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const result = await fetchDashboardData(currentUser.uid);
      if (!result.success) {
        toast.error(result.error || "Failed to fetch dashboard data");
      }
    };

    const setupNotifications = async () => {
      try {
        // Request notification permission
        if ('Notification' in window) {
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') {
            console.log('Notification permission not granted');
            return;
          }
        }

        const currentUser = auth.currentUser;
        if (!currentUser) return;

        // Register for push notifications
        const subscription = await registerNotifications();
        if (subscription) {
          await saveSubscription(subscription, currentUser.uid);
          console.log('Push notification setup complete');
        }
      } catch (error) {
        console.error('Error setting up notifications:', error);
      }
    };

    loadDashboardData();
    setupNotifications();
  }, [fetchDashboardData]);

  // Show error toast if there's an error
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  // Handle automatic notifications for new tagged events
  useEffect(() => {
    const sendNotifications = async () => {
      if (!dashboardData.taggedEventsList?.length) return;

      try {
        // Request notification permission if not granted
        if (Notification.permission !== "granted") {
          const permission = await Notification.requestPermission();
          if (permission !== "granted") return;
        }

        // Register for notifications
        const subscription = await registerNotifications();
        if (!subscription) return;

        // Show notifications for new tagged events
        for (const taggedEvent of dashboardData.taggedEventsList) {
          // Skip if notification was already viewed
          if (viewedNotifications.has(`tagged-${taggedEvent.id || taggedEvent.title}`)) continue;

          // Format requirements text
          const requirementsText = taggedEvent.departmentRequirements
            ?.map(dept => {
              const reqs = dept.requirements
                .map(req => `${req.name}${req.note ? `: ${req.note}` : ''}`)
                .join('\n');
              return `${dept.departmentName}:\n${reqs}`;
            })
            .join('\n\n') || 'No requirements specified';

          // Send push notification
          const apiUrl = import.meta.env.PROD 
            ? '/api/notify'  // Production (Vercel)
            : 'http://localhost:3000/notify'; // Development
          const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              subscription,
              message: JSON.stringify({
                title: "New Event Tag",
                body: `${taggedEvent.title}\n\nFrom: ${taggedEvent.department}\n\nRequirements:\n${requirementsText}`,
                icon: "/images/bataanlogo.png",
                badge: "/images/bataanlogo.png",
                timestamp: new Date().getTime(),
                data: {
                  type: 'event',
                  event: taggedEvent,
                  url: window.location.origin
                }
              }),
            }),
          });

          if (!response.ok) {
            console.error("Failed to send notification for event:", taggedEvent.title);
          }
        }
      } catch (error) {
        console.error("Error sending notifications:", error);
      }
    };

    sendNotifications();
  }, [dashboardData.taggedEventsList, viewedNotifications]);

  const stats = [
    {
      title: "Total Events",
      value: loading ? "-" : dashboardData.totalEvents.toString(),
      icon: <CalendarDays className="h-6 w-6 text-blue-500" />,
      trend: "All time events",
      trendUp: true,
      color: "bg-blue-500/10",
    },
    {
      title: "Upcoming Events",
      value: loading ? "-" : dashboardData.upcomingEvents.toString(),
      icon: <Calendar className="h-6 w-6 text-green-500" />,
      trend: dashboardData.nextEventIn ? `Next event in ${dashboardData.nextEventIn} days` : "No upcoming events",
      trendUp: !loading && dashboardData.upcomingEvents > 0,
      color: "bg-green-500/10",
    },
    {
      title: "Department Events",
      value: loading ? "-" : dashboardData.departmentEvents.toString(),
      icon: <Users className="h-6 w-6 text-purple-500" />,
      trend: `${dashboardData.thisWeekEvents} this week`,
      trendUp: dashboardData.thisWeekEvents > 0,
      color: "bg-purple-500/10",
    },
    {
      title: "Hours Scheduled",
      value: loading ? "-" : dashboardData.totalHours.toString(),
      icon: <Clock className="h-6 w-6 text-orange-500" />,
      trend: `${dashboardData.thisWeekHours} hours this week`,
      trendUp: dashboardData.thisWeekHours > 0,
      color: "bg-orange-500/10",
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
          <Popover onOpenChange={(open) => {
            if (open) {
              markNotificationsAsRead();
            }
          }}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={cn(
                  "relative rounded-xl border-0",
                  isDarkMode ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-100 hover:bg-gray-200"
                )}
              >
                <Bell className="h-5 w-5" />
                {!loading && 
                  (dashboardData.upcomingEventsList.length > 0 || dashboardData.taggedEventsList?.length > 0) && 
                  viewedNotifications.size < (dashboardData.upcomingEventsList.length + (dashboardData.taggedEventsList?.length || 0)) && (
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
                </div>
                <div className="px-4 pb-2">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger 
                      value="all" 
                      className={cn(
                        "flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium transition-colors",
                        "data-[state=active]:bg-black data-[state=active]:text-white",
                        "dark:data-[state=active]:bg-white dark:data-[state=active]:text-black",
                        isDarkMode 
                          ? "bg-gray-800 text-gray-400 hover:text-white" 
                          : "bg-gray-100 text-gray-600 hover:text-black"
                      )}
                    >
                      <Bell className="h-4 w-4" />
                      <span>All</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="upcoming" 
                      className={cn(
                        "flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium transition-colors",
                        "data-[state=active]:bg-black data-[state=active]:text-white",
                        "dark:data-[state=active]:bg-white dark:data-[state=active]:text-black",
                        isDarkMode 
                          ? "bg-gray-800 text-gray-400 hover:text-white" 
                          : "bg-gray-100 text-gray-600 hover:text-black"
                      )}
                    >
                      <Calendar className="h-4 w-4" />
                      <span>Upcoming</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="tagged" 
                      className={cn(
                        "flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium transition-colors",
                        "data-[state=active]:bg-black data-[state=active]:text-white",
                        "dark:data-[state=active]:bg-white dark:data-[state=active]:text-black",
                        isDarkMode 
                          ? "bg-gray-800 text-gray-400 hover:text-white" 
                          : "bg-gray-100 text-gray-600 hover:text-black"
                      )}
                    >
                      <Tag className="h-4 w-4" />
                      <span>Tagged</span>
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="all" className="p-0 m-0">
                  <ScrollArea className="h-[300px]">
                    <div className="p-4 space-y-4">
                      {loading ? (
                        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                          Loading notifications...
                        </div>
                      ) : dashboardData.upcomingEventsList.length === 0 && dashboardData.taggedEventsList?.length === 0 ? (
                        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                          No notifications
                        </div>
                      ) : (
                        <>
                          {dashboardData.upcomingEventsList.map((event, index) => (
                            <div
                              key={`upcoming-${index}`}
                              className={cn(
                                "rounded-lg p-3 transition-colors",
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
                            </div>
                          ))}
                          {dashboardData.taggedEventsList?.map((event, index) => (
                            <div
                              key={`tagged-${index}`}
                              onClick={() => {
                                setSelectedEvent(event);
                                setIsDialogOpen(true);
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
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="upcoming" className="p-0 m-0">
                  <ScrollArea className="h-[300px]">
                    <div className="p-4 space-y-4">
                      {loading ? (
                        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                          Loading notifications...
                        </div>
                      ) : dashboardData.upcomingEventsList.length === 0 ? (
                        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                          No upcoming events
                        </div>
                      ) : (
                        dashboardData.upcomingEventsList.map((event, index) => (
                          <div
                            key={index}
                            className={cn(
                              "rounded-lg p-3 transition-colors",
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
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="tagged" className="p-0 m-0">
                  <ScrollArea className="h-[300px]">
                    <div className="p-4 space-y-4">
                      {loading ? (
                        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                          Loading notifications...
                        </div>
                      ) : !dashboardData.taggedEventsList || dashboardData.taggedEventsList.length === 0 ? (
                        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                          No department tags
                        </div>
                      ) : (
                        dashboardData.taggedEventsList.map((event, index) => (
                          <div
                            key={index}
                            onClick={() => {
                              console.log("Clicked event data:", event);
                              setSelectedEvent(event);
                              setIsDialogOpen(true);
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
                          </div>
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
              "rounded-xl p-6 transition-all duration-300 cursor-pointer",
              isDarkMode 
                ? "bg-gray-800 hover:bg-gray-700" 
                : "bg-white hover:shadow-lg hover:shadow-gray-200/80"
            )}>
              <div className="flex items-center justify-between mb-4">
                <div className={cn(
                  "p-3 rounded-xl",
                  stat.color,
                )}>
                  {stat.icon}
                </div>
                <div className={cn(
                  "text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1",
                  stat.trendUp ? "text-green-500 bg-green-500/10" : "text-orange-500 bg-orange-500/10"
                )}>
                  {stat.trend}
                </div>
              </div>
              <div>
                <h3 className={cn(
                  "text-3xl font-bold",
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
          "rounded-xl p-6",
          isDarkMode ? "bg-gray-800" : "bg-white"
        )}>
          <div className="flex items-center justify-between mb-6">
            <h2 className={cn(
              "text-xl font-semibold",
              isDarkMode ? "text-white" : "text-gray-900"
            )}>Upcoming Events</h2>
            <Button
              variant="ghost"
              className={cn(
                "text-sm rounded-xl bg-gray-900 text-white hover:bg-gray-800",
                "transition-all duration-300 font-medium"
              )}
              onClick={() => navigate('/my-events')}
            >
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          <div className="space-y-4">
            {loading ? (
              <div className={cn(
                "text-sm text-center py-8",
                isDarkMode ? "text-gray-400" : "text-gray-500"
              )}>
                Loading events...
              </div>
            ) : dashboardData.upcomingEventsList.length === 0 ? (
              <div className={cn(
                "text-sm text-center py-8",
                isDarkMode ? "text-gray-400" : "text-gray-500"
              )}>
                No upcoming events
              </div>
            ) : (
              <>
                {dashboardData.upcomingEventsList.slice(0, 5).map((event) => (
                <motion.div
                  key={event.id}
                  variants={item}
                  className={cn(
                    "relative overflow-hidden p-4 rounded-xl",
                    isDarkMode 
                      ? "bg-gray-800/50" 
                      : "bg-white",
                    "shadow-sm"
                  )}
                >
                  {/* Decorative gradient background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-50/5 to-transparent" />
                  
                  <div className="relative flex items-center gap-4">
                    <Avatar className={cn(
                      "h-12 w-12 ring-2 ring-offset-2",
                      isDarkMode 
                        ? "ring-gray-700 ring-offset-gray-800" 
                        : "ring-gray-100 ring-offset-white",
                      getEventColor(event.title) // Function to get consistent color based on event title
                    )}>
                      <AvatarFallback 
                        className={cn(
                          "text-white font-semibold",
                          getEventBgColor(event.title) // Function to get background color
                        )}
                      >
                        {event.title.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <h3 className={cn(
                        "font-semibold truncate",
                        isDarkMode ? "text-white" : "text-gray-900"
                      )}>{event.title}</h3>
                      
                      <div className="flex items-center gap-3 mt-1">
                        <div className={cn(
                          "flex items-center gap-1.5",
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        )}>
                          <Calendar className="h-3.5 w-3.5" />
                          <p className="text-sm">{format(event.date, "MMM d, yyyy")}</p>
                        </div>
                        
                        <div className={cn(
                          "flex items-center gap-1.5",
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        )}>
                          <Clock className="h-3.5 w-3.5" />
                          <p className="text-sm">{format(event.date, "h:mm a")}</p>
                        </div>
                        
                        <div className={cn(
                          "flex items-center gap-1.5",
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        )}>
                          <span className={cn(
                            "inline-block h-2 w-2 rounded-full",
                            getEventStatusColor(event) // Function to get status color
                          )} />
                          <p className="text-sm">{event.duration}m</p>
                        </div>
                      </div>
                    </div>


                  </div>
                </motion.div>
              ))}
                {dashboardData.upcomingEventsList.length > 5 && (
                  <div className={cn(
                    "text-sm text-center py-4 border-t",
                    isDarkMode ? "text-gray-400 border-gray-700" : "text-gray-500 border-gray-200"
                  )}>
                    {dashboardData.upcomingEventsList.length - 5} more events. Click "View All" to see them.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </motion.div>
      {/* Event Details Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 gap-0 border-none bg-white">
          <DialogHeader className="px-6 pt-4 pb-0">
            <DialogTitle className="sr-only">Event Details</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            console.log("Selected Event Data:", selectedEvent),
            <Card className="border-none shadow-none bg-white">
              <CardHeader className="px-6 pt-0 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {selectedEvent.title}
                  </h3>
                  <Badge variant="secondary" className="shrink-0">
                    {selectedEvent.department}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-6 px-6">
                {/* Requirements and Notes */}
                <div className="space-y-4">
                  <div className="text-sm font-medium text-gray-900">Requirements & Notes</div>
                  <div className="space-y-2">
                    {Array.isArray(selectedEvent.requirements) && selectedEvent.requirements.map((req, index) => (
                      <div 
                        key={index}
                        className="py-3 px-4 rounded-lg bg-gray-50"
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-700">
                            {req.name}
                          </div>
                          {req.note && (
                            <Badge variant="outline" className="ml-2">
                              Notes
                            </Badge>
                          )}
                        </div>
                        {req.note && (
                          <div className="mt-2 text-sm text-gray-600 pl-3 border-l-2 border-gray-200">
                            {req.note}
                          </div>
                        )}
                      </div>
                    ))}
                    {(!Array.isArray(selectedEvent.requirements) || selectedEvent.requirements.length === 0) && (
                      <div className="text-sm text-center py-3 text-gray-500">
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
              </CardContent>
            </Card>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default Dashboard;
