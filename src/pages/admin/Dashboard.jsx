import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";
import {
  CalendarDays,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowRight,
  ArrowUpRight,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const statsCards = [
  {
    title: "Total Events",
    value: "156",
    change: "+12%",
    changeText: "from last month",
    icon: CalendarDays,
    color: "blue",
  },
  {
    title: "Active Users",
    value: "2,856",
    change: "+8.2%",
    changeText: "from last month",
    icon: Users,
    color: "green",
  },
  {
    title: "Departments",
    value: "24",
    change: "+2",
    changeText: "new this month",
    icon: Building2,
    color: "purple",
  },
];

const requestStats = [
  {
    title: "Approved",
    value: "89",
    icon: CheckCircle2,
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
  {
    title: "Pending",
    value: "45",
    icon: Clock,
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
  },
  {
    title: "Rejected",
    value: "22",
    icon: XCircle,
    color: "text-red-500",
    bg: "bg-red-500/10",
  },
];

const AdminDashboard = () => {
  const { isDarkMode } = useTheme();

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

      {/* Event Requests Stats */}
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
                Event Requests Overview
              </h2>
              <p className={cn(
                "text-sm mt-1",
                isDarkMode ? "text-gray-400" : "text-gray-500"
              )}>
                Current month's event request statistics
              </p>
            </div>
            <Button
              variant="outline"
              className={cn(
                "gap-2",
                isDarkMode ? "border-slate-700 hover:bg-slate-700" : ""
              )}
            >
              View All
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {requestStats.map((stat) => (
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
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AdminDashboard;
