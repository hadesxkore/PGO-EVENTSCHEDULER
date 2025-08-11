import { motion } from "framer-motion";
import { Card } from "../components/ui/card";
import { Calendar, Clock, Users, CalendarDays, ChevronRight, Bell } from "lucide-react";
import { cn } from "../lib/utils";
import { useTheme } from "../contexts/ThemeContext";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Button } from "../components/ui/button";

const Dashboard = () => {
  const { isDarkMode } = useTheme();
  
  const stats = [
    {
      title: "Total Events",
      value: "24",
      icon: <CalendarDays className="h-6 w-6 text-blue-500" />,
      trend: "+12% from last month",
      trendUp: true,
      color: "bg-blue-500/10",
    },
    {
      title: "Upcoming Events",
      value: "8",
      icon: <Calendar className="h-6 w-6 text-green-500" />,
      trend: "Next event in 2 days",
      trendUp: true,
      color: "bg-green-500/10",
    },
    {
      title: "Department Events",
      value: "12",
      icon: <Users className="h-6 w-6 text-purple-500" />,
      trend: "4 this week",
      trendUp: false,
      color: "bg-purple-500/10",
    },
    {
      title: "Hours Scheduled",
      value: "156",
      icon: <Clock className="h-6 w-6 text-orange-500" />,
      trend: "32 hours this week",
      trendUp: true,
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

      {/* Recent Events */}
      <motion.div variants={item}>
        <div className={cn(
          "rounded-xl p-6",
          isDarkMode ? "bg-gray-800" : "bg-white"
        )}>
          <div className="flex items-center justify-between mb-6">
            <h2 className={cn(
              "text-xl font-semibold",
              isDarkMode ? "text-white" : "text-gray-900"
            )}>Recent Events</h2>
            <Button
              variant="ghost"
              className={cn(
                "text-sm rounded-xl",
                isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
              )}
            >
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((_, i) => (
              <motion.div
                key={i}
                variants={item}
                className={cn(
                  "flex items-center justify-between p-4 rounded-xl transition-all duration-200",
                  isDarkMode 
                    ? "bg-gray-900/50 hover:bg-gray-700" 
                    : "bg-gray-50 hover:bg-gray-100",
                  "cursor-pointer group"
                )}
              >
                <div className="flex items-center gap-4">
                  <Avatar className={cn(
                    "h-10 w-10 transition-transform duration-200",
                    "group-hover:scale-105"
                  )}>
                    <AvatarImage src={`https://avatar.vercel.sh/${i}.png`} />
                    <AvatarFallback>ME</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className={cn(
                      "font-medium",
                      isDarkMode ? "text-white" : "text-gray-900"
                    )}>Department Meeting</h3>
                    <div className="flex items-center gap-2">
                      <p className={cn(
                        "text-sm",
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      )}>Tomorrow at 10:00 AM</p>
                      <span className="h-1 w-1 rounded-full bg-gray-400" />
                      <p className={cn(
                        "text-sm",
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      )}>2 hours</p>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "rounded-xl opacity-0 group-hover:opacity-100 transition-opacity",
                    isDarkMode ? "hover:bg-gray-600" : "hover:bg-gray-200"
                  )}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Dashboard;