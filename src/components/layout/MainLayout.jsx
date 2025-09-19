import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Separator } from "../ui/separator";
import { Badge } from "../ui/badge";
import useMessageStore from "../../store/messageStore";
import {
  LayoutDashboard,
  CalendarPlus,
  Calendar,
  CalendarClock,
  CalendarDays,
  LogOut,
  ChevronLeft,
  ChevronRight,
  User,
  Menu,
  X,
  MessageSquare,
  Building2,
} from "lucide-react";

const MainLayout = ({ children, userData }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isDarkMode = false; // Always use light mode
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get message store state and actions
  const { 
    unreadMessages,
    currentUser,
    setCurrentUser,
    subscribeToLastMessages,
    fetchTaggedDepartments,
    taggedDepartments,
    usersWhoTaggedMe
  } = useMessageStore();

  // Subscribe to messages when component mounts
  useEffect(() => {
    if (userData?.email) {
      // Set current user in message store
      setCurrentUser({
        email: userData.email,
        department: userData.department,
        role: userData.role,
        uid: userData.uid || userData.id
      });

      // Subscribe to last messages
      const unsubscribe = subscribeToLastMessages(userData.email);
      
      // Fetch tagged departments
      fetchTaggedDepartments(userData.email);

      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [userData?.email, setCurrentUser, subscribeToLastMessages, fetchTaggedDepartments]);

  const handleLogout = () => {
    // Clear any stored user data/tokens
    localStorage.removeItem('user');
    localStorage.removeItem('userData');
    sessionStorage.removeItem('user');
    
    // Navigate to auth page
    navigate('/');
    
    // Reload the page to reset the app state
    window.location.reload();
  };

  const sidebarItems = [
    {
      title: "Dashboard",
      icon: <LayoutDashboard className="h-6 w-6" />,
      href: "/dashboard",
    },
    {
      title: "Request Event",
      icon: <CalendarPlus className="h-6 w-6" />,
      href: "/request-event",
    },
    {
      title: "My Events",
      icon: <Calendar className="h-6 w-6" />,
      href: "/my-events",
    },
    {
      title: "Calendar",
      icon: <CalendarClock className="h-6 w-6" />,
      href: "/calendar",
    },
    {
      title: "All Events",
      icon: <CalendarDays className="h-6 w-6" />,
      href: "/all-events",
    },
    {
      title: "Messages",
      icon: <MessageSquare className="h-6 w-6" />,
      href: "/messages",
    },
    {
      title: "Tagged Departments",
      icon: <Building2 className="h-6 w-6" />,
      href: "/tagged-departments",
    },
  ];

  return (
    <div className={cn(
      "min-h-screen w-full",
      isDarkMode ? "dark bg-[#0F172A] text-gray-100" : "bg-gray-50 text-gray-900"
    )}>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-10 w-10 rounded-lg",
            isDarkMode ? "bg-slate-800 text-white" : "bg-white text-gray-700",
            "shadow-lg hover:scale-110 transition-transform"
          )}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </Button>
      </div>

      {/* Sidebar */}
      <div className={cn(
        "fixed left-0 top-0 h-full transition-all duration-300 z-40 flex flex-col",
        isDarkMode ? "bg-[#1E293B] border-gray-700" : "bg-white border-gray-200",
        "border-r shadow-sm",
        // Desktop styles
        "hidden lg:flex",
        collapsed ? "lg:w-24" : "lg:w-80",
        // Mobile styles
        isMobileMenuOpen ? "flex w-[280px]" : "w-0"
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
              <div className="flex flex-col gap-1">
                <h1 className="text-xl font-bold tracking-tight">
                  Event Scheduler
                </h1>
              </div>
            )}
          </div>
        </div>

        <Separator className={cn(isDarkMode ? "bg-gray-700" : "bg-gray-100")} />

        {/* User Profile */}
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
                "ring-2",
                isDarkMode ? "ring-gray-700" : "ring-gray-200"
              )}>
                <AvatarImage src={userData?.photoURL} />
                <AvatarFallback className={cn(
                  isDarkMode ? "bg-gray-700" : "bg-gray-100"
                )}>
                  <User className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-bold truncate">
                    {userData?.firstName}
                  </h2>
                  <p className={cn(
                    "text-sm font-medium truncate",
                    isDarkMode ? "text-gray-400" : "text-gray-500"
                  )}>
                    {userData?.email || "john.doe@example.com"}
                  </p>
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
                      ? "bg-gray-700 text-white" 
                      : "bg-gray-100 text-blue-600"
                  )
                )}
                onClick={() => navigate(item.href)}
              >
                <div className={cn(
                  "flex items-center gap-3 relative",
                  collapsed && "justify-center"
                )}>
                  {item.icon}
                  {!collapsed && (
                    <span className="text-base font-semibold">{item.title}</span>
                  )}
                  {/* Show unread count for Messages button */}
                  {item.title === "Messages" && Object.values(unreadMessages).some(Boolean) && (
                    <Badge
                      variant="default"
                      className={cn(
                        "absolute -top-2 -right-6 h-5 min-w-[20px] px-1",
                        "bg-red-500 text-white border-2",
                        isDarkMode ? "border-slate-800" : "border-white"
                      )}
                    >
                      {Object.values(unreadMessages).filter(Boolean).length}
                    </Badge>
                  )}
                  {/* Show tagged departments count */}
                  {item.title === "Tagged Departments" && usersWhoTaggedMe.length > 0 && (
                    <Badge
                      variant="default"
                      className={cn(
                        "absolute -top-2 -right-6 h-5 min-w-[20px] px-1",
                        "bg-purple-500 text-white border-2",
                        isDarkMode ? "border-slate-800" : "border-white"
                      )}
                    >
                      {usersWhoTaggedMe.length}
                    </Badge>
                  )}
                </div>
              </Button>
            ))}
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="mt-auto p-4">
          <div className="grid gap-1">
            <Button
              variant="ghost"
              className={cn(
                "justify-start gap-4 py-6",
                collapsed ? "justify-center px-3" : "px-3",
                "text-red-500 hover:text-red-600 hover:bg-red-50/10"
              )}
              onClick={handleLogout}
            >
              <LogOut className="h-6 w-6" />
              {!collapsed && <span className="text-base font-semibold">Logout</span>}
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

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className={cn(
        "transition-all duration-300 min-h-screen",
        // Desktop margins
        "lg:ml-0",
        collapsed ? "lg:ml-24" : "lg:ml-80",
        // Mobile margins
        "ml-0",
        isDarkMode ? "bg-[#0F172A]" : "bg-gray-50"
      )}>
        <div className="p-4 sm:p-6 lg:p-8">
          {React.Children.map(children, child => {
            // Pass userData to all child components
            if (React.isValidElement(child)) {
              return React.cloneElement(child, { userData });
            }
            return child;
          })}
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
