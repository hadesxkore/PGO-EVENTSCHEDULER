import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/ui/card";
import { Calendar, Clock, Users, CalendarDays, ChevronRight, Bell } from "lucide-react";
import { cn } from "../lib/utils";
import { useTheme } from "../contexts/ThemeContext";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import { getUserDashboardStats } from "../lib/firebase/dashboard-user";
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
  const now = new Date();
  const eventDate = new Date(event.date);
  const eventEnd = addHours(eventDate, event.duration / 60);

  if (isBefore(eventEnd, now)) {
    return "bg-gray-400"; // Past event
  }
  if (isAfter(eventDate, now)) {
    return "bg-green-500"; // Upcoming event
  }
  return "bg-yellow-500"; // Ongoing event
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    totalEvents: 0,
    upcomingEvents: 0,
    departmentEvents: 0,
    totalHours: 0,
    nextEventIn: null,
    thisWeekEvents: 0,
    thisWeekHours: 0,
    upcomingEventsList: []
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        const result = await getUserDashboardStats(currentUser.uid);
        if (result.success) {
          setDashboardData(result.stats);
        } else {
          toast.error("Failed to fetch dashboard data");
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        toast.error("An error occurred while fetching dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

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
          <Button
            variant="outline"
            size="icon"
            className={cn(
              "relative rounded-xl border-0",
              isDarkMode ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-100 hover:bg-gray-200"
            )}
          >
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full" />
          </Button>
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
    </motion.div>
  );
};

export default Dashboard;
