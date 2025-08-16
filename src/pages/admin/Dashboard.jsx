import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";
import {
  CalendarDays,
  Users,
  ArrowRight,
  ArrowUpRight,
  Building2,
  Trophy,
  Activity,
  TrendingUp,
} from "lucide-react";
import { getDashboardStats } from "@/lib/firebase/dashboard";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const AdminDashboard = () => {
  const { isDarkMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEvents: 0,
    totalUsers: 0,
    totalDepartments: 0,
    recentEvents: 0,
    recentUsers: 0,
    recentDepartments: 0,
    topDepartments: []
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const result = await getDashboardStats();
      if (result.success) {
        setStats(result.stats);
      } else {
        toast.error("Failed to fetch dashboard statistics");
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast.error("An error occurred while fetching statistics");
    } finally {
      setLoading(false);
    }
  };

  const statsCards = [
    {
      title: "Total Events",
      value: loading ? "-" : stats.totalEvents.toString(),
      change: loading ? "-" : `+${stats.recentEvents}`,
      changeText: "new this month",
      icon: CalendarDays,
      color: "blue",
    },
    {
      title: "Total Users",
      value: loading ? "-" : stats.totalUsers.toString(),
      change: loading ? "-" : `+${stats.recentUsers}`,
      changeText: "new this month",
      icon: Users,
      color: "green",
    },
    {
      title: "Departments",
      value: loading ? "-" : stats.totalDepartments.toString(),
      change: loading ? "-" : `+${stats.recentDepartments}`,
      changeText: "new this month",
      icon: Building2,
      color: "purple",
    },
  ];

  const activityStats = [
    {
      title: "Most Active Department",
      value: loading ? "-" : (stats.topDepartments[0]?.name || "No data"),
      icon: Trophy,
      color: "text-yellow-500",
      bg: "bg-yellow-500/10",
      subtext: loading ? "" : `${stats.topDepartments[0]?.count || 0} events`
    },
    {
      title: "Monthly Activity",
      value: loading ? "-" : `${stats.recentEvents} Events`,
      icon: Activity,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      subtext: "In the last 30 days"
    },
    {
      title: "User Growth",
      value: loading ? "-" : `${stats.recentUsers} New Users`,
      icon: TrendingUp,
      color: "text-green-500",
      bg: "bg-green-500/10",
      subtext: "In the last 30 days"
    },
  ];

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
        <h1
          className={cn(
            "text-3xl font-bold",
            isDarkMode ? "text-white" : "text-gray-900"
          )}
        >
          Dashboard
        </h1>
        <p
          className={cn(
            "text-sm mt-1",
            isDarkMode ? "text-gray-400" : "text-gray-500"
          )}
        >
          Welcome back, Admin! Here's what's happening.
        </p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {statsCards.map((stat) => (
          <div
            key={stat.title}
            className={cn(
              "rounded-xl p-6",
              isDarkMode ? "bg-slate-800" : "bg-white",
              "border shadow-sm",
              isDarkMode ? "border-slate-700" : "border-gray-100"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className={cn(
                  "text-sm",
                  isDarkMode ? "text-gray-400" : "text-gray-500"
                )}>
                  {stat.title}
                </p>
                <p className={cn(
                  "text-2xl font-semibold",
                  isDarkMode ? "text-white" : "text-gray-900"
                )}>
                  {stat.value}
                </p>
              </div>
              <div className={cn(
                "p-3 rounded-lg",
                isDarkMode ? "bg-slate-700" : "bg-gray-50"
              )}>
                <stat.icon className={cn(
                  "h-5 w-5",
                  stat.color === "blue" && "text-blue-500",
                  stat.color === "green" && "text-green-500",
                  stat.color === "purple" && "text-purple-500"
                )} />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <span className="text-green-500 text-sm font-medium flex items-center gap-0.5">
                {stat.change}
                <ArrowUpRight className="h-3 w-3" />
              </span>
              <span className={cn(
                "text-sm",
                isDarkMode ? "text-gray-400" : "text-gray-500"
              )}>
                {stat.changeText}
              </span>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Activity Stats */}
      <motion.div variants={item}>
        <div className={cn(
          "rounded-xl border p-6",
          isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-100"
        )}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className={cn(
                "text-lg font-semibold",
                isDarkMode ? "text-white" : "text-gray-900"
              )}>
                Activity Overview
              </h2>
              <p className={cn(
                "text-sm mt-1",
                isDarkMode ? "text-gray-400" : "text-gray-500"
              )}>
                Recent activity and performance metrics
              </p>
            </div>
            <Button
              className="bg-black hover:bg-gray-800 text-white gap-2 transition-all duration-200 ease-in-out"
              onClick={fetchStats}
            >
              Refresh
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {activityStats.map((stat) => (
              <div
                key={stat.title}
                className={cn(
                  "p-4 rounded-lg",
                  isDarkMode ? "bg-slate-900" : "bg-gray-50"
                )}
              >
                <div className="flex items-center justify-between">
                  <p className={cn(
                    "text-sm font-medium",
                    isDarkMode ? "text-gray-300" : "text-gray-600"
                  )}>
                    {stat.title}
                  </p>
                  <div className={cn("p-2 rounded-md", stat.bg)}>
                    <stat.icon className={cn("h-4 w-4", stat.color)} />
                  </div>
                </div>
                <p className={cn(
                  "text-2xl font-semibold mt-2",
                  isDarkMode ? "text-white" : "text-gray-900"
                )}>
                  {stat.value}
                </p>
                {stat.subtext && (
                  <p className={cn(
                    "text-sm mt-1",
                    isDarkMode ? "text-gray-400" : "text-gray-500"
                  )}>
                    {stat.subtext}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AdminDashboard;
