import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { useTheme } from "../../contexts/ThemeContext";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Separator } from "../ui/separator";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Shield,
  LogOut,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
  User,
  Building2,
} from "lucide-react";

const AdminLayout = ({ children, userData }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { isDarkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('userData');
    sessionStorage.removeItem('user');
    navigate('/');
    window.location.reload();
  };

  const sidebarItems = [
    {
      title: "Dashboard",
      icon: <LayoutDashboard className="h-6 w-6" />,
      href: "/admin/dashboard",
    },
    {
      title: "Event Requests",
      icon: <CalendarDays className="h-6 w-6" />,
      href: "/admin/event-requests",
    },
    {
      title: "All Events",
      icon: <CalendarDays className="h-6 w-6" />,
      href: "/admin/all-events",
    },
    {
      title: "Users",
      icon: <Users className="h-6 w-6" />,
      href: "/admin/users",
    },
    {
      title: "Departments",
      icon: <Building2 className="h-6 w-6" />,
      href: "/admin/departments",
    },
  ];

  return (
    <div className={cn(
      "min-h-screen w-full",
      isDarkMode ? "dark bg-[#0F172A] text-gray-100" : "bg-gray-50 text-gray-900"
    )}>
      {/* Sidebar */}
      <div className={cn(
        "fixed left-0 top-0 h-full transition-all duration-300 z-50 flex flex-col",
        isDarkMode ? "bg-[#1E293B] border-gray-700" : "bg-white border-gray-200",
        "border-r shadow-sm",
        collapsed ? "w-24" : "w-80"
      )}>
        {/* Logo Area */}
        <div className={cn(
          "h-16 flex items-center gap-3 px-6",
          collapsed ? "justify-center px-4" : "px-6"
        )}>
          <div className="flex items-center gap-3 min-w-max">
                          <div className="relative h-10 w-10">
              <img 
                src="/images/bataanlogo.png" 
                alt="PGO Logo"
                className="h-full w-full object-contain"
              />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <h1 className="text-xl font-bold tracking-tight">
                  Admin Portal
                </h1>
              </div>
            )}
          </div>
        </div>

        <Separator className={cn(isDarkMode ? "bg-gray-700" : "bg-gray-100")} />

        {/* Admin Profile */}
        <div className={cn(
          "p-4",
          collapsed ? "items-center" : ""
        )}>
          <div className={cn(
            "p-4 rounded-xl",
            isDarkMode ? "bg-gray-800/50" : "bg-gray-50",
            collapsed ? "flex justify-center" : "space-y-3"
          )}>
            <div className={cn(
              "flex items-center",
              collapsed ? "justify-center" : "gap-3"
            )}>
              <Avatar className={cn(
                "ring-2 ring-red-500/20 border-2 border-red-500",
              )}>
                <AvatarImage src={userData?.photoURL} />
                <AvatarFallback className="bg-red-500 text-white">
                  <Shield className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-bold truncate">
                    {userData?.firstName || "Admin"} {userData?.lastName || "User"}
                  </h2>
                  <div className="flex items-center gap-1 mt-1">
                    <Shield className="h-3 w-3 text-red-500" />
                    <p className="text-sm font-semibold text-red-500">
                      Administrator
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto">
          <nav className="grid gap-1 px-2 py-4">
            {sidebarItems.map((item) => (
              <Button
                key={item.title}
                variant="ghost"
                className={cn(
                  "justify-start gap-4 px-4 py-7",
                  collapsed ? "justify-center px-3" : "px-3",
                  isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100",
                  "transition-colors duration-200",
                  location.pathname === item.href && (
                    isDarkMode 
                      ? "bg-gray-700 text-red-400" 
                      : "bg-red-50 text-red-600"
                  )
                )}
                                 onClick={() => navigate(item.href)}
              >
                <div className={cn(
                  "flex items-center gap-3",
                  collapsed && "justify-center"
                )}>
                  {item.icon}
                  {!collapsed && (
                    <span className="text-base font-semibold">{item.title}</span>
                  )}
                </div>
              </Button>
            ))}
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="mt-auto p-4">
          <div className="grid gap-3">
            <Button
              variant="ghost"
              className={cn(
                "justify-start gap-4 h-12",
                collapsed ? "justify-center px-3" : "px-4",
                isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
              )}
              onClick={toggleDarkMode}
            >
              {isDarkMode ? (
                <Sun className="h-6 w-6" />
              ) : (
                <Moon className="h-6 w-6" />
              )}
              {!collapsed && (
                <span className="text-lg font-semibold">
                  {isDarkMode ? "Light Mode" : "Dark Mode"}
                </span>
              )}
            </Button>
            <Button
              variant="ghost"
              className={cn(
                "justify-start gap-4 h-12",
                collapsed ? "justify-center px-3" : "px-4",
                isDarkMode 
                  ? "text-red-400 hover:text-red-300 hover:bg-red-500/10" 
                  : "text-red-500 hover:text-red-600 hover:bg-red-50/10"
              )}
              onClick={handleLogout}
            >
              <LogOut className="h-6 w-6" />
              {!collapsed && <span className="text-lg font-semibold">Logout</span>}
            </Button>
          </div>
        </div>

        {/* Collapse Button */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "absolute -right-4 top-7 h-8 w-8 rounded-full",
            isDarkMode ? "bg-gray-800 hover:bg-gray-700" : "bg-white hover:bg-gray-100",
            "shadow-md"
          )}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Main Content */}
      <div className={cn(
        "transition-all duration-300 min-h-screen",
        collapsed ? "ml-24" : "ml-80",
        isDarkMode ? "bg-[#0F172A]" : "bg-gray-50"
      )}>
        <div className="p-8">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
