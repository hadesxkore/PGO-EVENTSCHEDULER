import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "sonner";
import { PDFDownloadLink } from "@react-pdf/renderer";
import ReportPDF from "@/components/reports/ReportPDF";
import {
  BarChart3,
  TrendingUp,
  Users,
  Calendar,
  Download,
  Filter,
  Building2,
  PieChart,
} from "lucide-react";
import { getEventsByDepartment, getMonthlyStats, getTotalCounts } from "@/lib/firebase/reports";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";

const Reports = () => {
  const { isDarkMode } = useTheme();
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState({
    totalEvents: 0,
    totalUsers: 0,
    totalDepartments: 0,
    monthlyGrowth: 0,
    topDepartments: [],
    monthlyStats: []
  });

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const [totals, departmentStats, monthStats] = await Promise.all([
        getTotalCounts(),
        getEventsByDepartment(selectedPeriod),
        getMonthlyStats()
      ]);

      setReportData({
        ...totals,
        topDepartments: departmentStats.departmentStats,
        monthlyStats: monthStats
      });
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast.error('Failed to fetch report data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [selectedPeriod]);

  const generateReport = async () => {
    await fetchReportData();
    toast.success("Report data updated successfully!");
  };

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

  const downloadReport = () => {
    toast.success("Report download started!");
  };

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={container}
      className="max-w-[1400px] mx-auto"
    >
      {/* Header */}
      <motion.div variants={item} className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className={cn(
              "text-4xl font-bold tracking-tight",
              isDarkMode ? "text-white" : "text-gray-900"
            )}>
              Reports & Analytics
            </h1>
            <p className={cn(
              "text-lg mt-2",
              isDarkMode ? "text-gray-400" : "text-gray-500"
            )}>
              Comprehensive insights and analytics for event management
            </p>
          </div>
          <div className="flex items-center gap-3">
            <PDFDownloadLink
              document={<ReportPDF reportData={reportData} selectedPeriod={selectedPeriod} />}
              fileName={`event-report-${selectedPeriod}-${format(new Date(), "yyyy-MM-dd")}.pdf`}
            >
              {({ loading }) => (
                <Button
                  variant="outline"
                  className="gap-2"
                  disabled={loading}
                >
                  <Download className="h-4 w-4" />
                  {loading ? "Preparing PDF..." : "Export Report"}
                </Button>
              )}
            </PDFDownloadLink>
            <Button
              className="gap-2 bg-black hover:bg-gray-800 text-white"
              onClick={fetchReportData}
              disabled={loading}
            >
              <BarChart3 className="h-4 w-4" />
              {loading ? "Generating..." : "Generate Report"}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={item} className="mb-8">
        <div className="flex items-center gap-4">
          <div className="w-[200px]">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className={cn(
                "border-0 shadow-sm",
                isDarkMode ? "bg-slate-800 text-gray-100" : "bg-gray-50"
              )}>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <SelectValue placeholder="Select period" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Last Week</SelectItem>
                <SelectItem value="month">Last Month</SelectItem>
                <SelectItem value="quarter">Last Quarter</SelectItem>
                <SelectItem value="year">Last Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </motion.div>

      {/* Key Metrics */}
      <motion.div variants={item} className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className={cn(
            "relative overflow-hidden border-0",
            isDarkMode ? "bg-gradient-to-br from-blue-500/10 via-blue-400/5 to-blue-300/10" : "bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50"
          )}>
            <div className="absolute inset-0 bg-grid-white/10" />
            <div className="relative">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className={cn(
                  "text-sm font-medium",
                  isDarkMode ? "text-gray-100" : "text-gray-900"
                )}>
                  Total Events
                </CardTitle>
                <div className={cn(
                  "p-2 rounded-full",
                  isDarkMode ? "bg-blue-500/10" : "bg-blue-100/80"
                )}>
                  <Calendar className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className={cn(
                  "text-3xl font-bold",
                  isDarkMode ? "text-blue-400" : "text-blue-600"
                )}>{reportData.totalEvents}</div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className={cn(
                    "font-medium",
                    isDarkMode ? "bg-blue-500/10 text-blue-400" : "bg-blue-100 text-blue-700"
                  )}>
                    +{reportData.monthlyGrowth}%
                  </Badge>
                  <p className={cn(
                    "text-xs",
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  )}>
                    from last month
                  </p>
                </div>
              </CardContent>
            </div>
          </Card>

          <Card className={cn(
            "relative overflow-hidden border-0",
            isDarkMode ? "bg-gradient-to-br from-green-500/10 via-emerald-400/5 to-green-300/10" : "bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50"
          )}>
            <div className="absolute inset-0 bg-grid-white/10" />
            <div className="relative">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className={cn(
                  "text-sm font-medium",
                  isDarkMode ? "text-gray-100" : "text-gray-900"
                )}>
                  Active Users
                </CardTitle>
                <div className={cn(
                  "p-2 rounded-full",
                  isDarkMode ? "bg-green-500/10" : "bg-green-100/80"
                )}>
                  <Users className="h-4 w-4 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className={cn(
                  "text-3xl font-bold",
                  isDarkMode ? "text-green-400" : "text-green-600"
                )}>{reportData.totalUsers}</div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className={cn(
                    "font-medium",
                    isDarkMode ? "bg-green-500/10 text-green-400" : "bg-green-100 text-green-700"
                  )}>
                    Active
                  </Badge>
                  <p className={cn(
                    "text-xs",
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  )}>
                    system users
                  </p>
                </div>
              </CardContent>
            </div>
          </Card>

          <Card className={cn(
            "relative overflow-hidden border-0",
            isDarkMode ? "bg-gradient-to-br from-purple-500/10 via-violet-400/5 to-purple-300/10" : "bg-gradient-to-br from-purple-50 via-violet-50 to-fuchsia-50"
          )}>
            <div className="absolute inset-0 bg-grid-white/10" />
            <div className="relative">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className={cn(
                  "text-sm font-medium",
                  isDarkMode ? "text-gray-100" : "text-gray-900"
                )}>
                  Departments
                </CardTitle>
                <div className={cn(
                  "p-2 rounded-full",
                  isDarkMode ? "bg-purple-500/10" : "bg-purple-100/80"
                )}>
                  <Building2 className="h-4 w-4 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className={cn(
                  "text-3xl font-bold",
                  isDarkMode ? "text-purple-400" : "text-purple-600"
                )}>{reportData.totalDepartments}</div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className={cn(
                    "font-medium",
                    isDarkMode ? "bg-purple-500/10 text-purple-400" : "bg-purple-100 text-purple-700"
                  )}>
                    Active
                  </Badge>
                  <p className={cn(
                    "text-xs",
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  )}>
                    departments
                  </p>
                </div>
              </CardContent>
            </div>
          </Card>
        </div>
      </motion.div>

      {/* Top Departments */}
      <motion.div variants={item} className="mb-8">
        <Card className={cn(
          isDarkMode ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200"
        )}>
          <CardHeader>
            <CardTitle className={cn(
              "flex items-center gap-2",
              isDarkMode ? "text-gray-100" : "text-gray-900"
            )}>
              <PieChart className="h-5 w-5 text-blue-500" />
              Top Departments by Events
            </CardTitle>
            <CardDescription className={cn(
              isDarkMode ? "text-gray-400" : "text-gray-500"
            )}>
              Departments with the most event requests in the selected period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reportData.topDepartments.map((dept, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-3 h-3 rounded-full",
                      index === 0 ? "bg-blue-500" :
                      index === 1 ? "bg-green-500" :
                      index === 2 ? "bg-orange-500" :
                      index === 3 ? "bg-purple-500" : "bg-gray-500"
                    )} />
                    <span className={cn(
                      "font-medium",
                      isDarkMode ? "text-gray-200" : "text-gray-700"
                    )}>
                      {dept.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "font-semibold",
                      isDarkMode ? "text-gray-100" : "text-gray-900"
                    )}>
                      {dept.events}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {dept.percentage}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Monthly Statistics */}
      <motion.div variants={item}>
        <Card className={cn(
          isDarkMode ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200"
        )}>
          <CardHeader>
            <CardTitle className={cn(
              "flex items-center gap-2",
              isDarkMode ? "text-gray-100" : "text-gray-900"
            )}>
              <TrendingUp className="h-5 w-5 text-blue-500" />
              Monthly Statistics
            </CardTitle>
            <CardDescription className={cn(
              isDarkMode ? "text-gray-400" : "text-gray-500"
            )}>
              Event and user growth over the last 6 months
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-6 gap-4">
              {reportData.monthlyStats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className={cn(
                    "text-lg font-bold mb-1",
                    isDarkMode ? "text-gray-100" : "text-gray-900"
                  )}>
                    {stat.month}
                  </div>
                  <div className="space-y-1">
                    <div className={cn(
                      "text-sm",
                      isDarkMode ? "text-blue-400" : "text-blue-600"
                    )}>
                      {stat.events} events
                    </div>
                    <div className={cn(
                      "text-sm",
                      isDarkMode ? "text-green-400" : "text-green-600"
                    )}>
                      {stat.users} users
                    </div>
                    <div className={cn(
                      "text-sm",
                      isDarkMode ? "text-orange-400" : "text-orange-600"
                    )}>
                      {stat.requests} requests
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default Reports;
