import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import AuthPage from "./components/auth/AuthPage";
import MainLayout from "./components/layout/MainLayout";
import AdminLayout from "./components/layout/AdminLayout";
import Dashboard from "./pages/Dashboard";
import RequestEvent from "./pages/RequestEvent";
import MyEvents from "./pages/MyEvents";
import AllEvents from "./pages/AllEvents";
import AllEventsNew from "./pages/AllEventsNew";
import Messages from "./pages/Messages";
import TaggedDepartments from "./pages/TaggedDepartments";
import AdminDashboard from "./pages/admin/Dashboard";
import EventRequests from "./pages/admin/EventRequests";
import Users from "./pages/admin/Users";
import Departments from "./pages/admin/Departments";
import Reports from "./pages/admin/Reports";
import { Toaster } from "./components/ui/sonner";
import { ThemeProvider } from "./contexts/ThemeContext";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing authentication on app initialization
  useEffect(() => {
    const checkExistingAuth = () => {
      try {
        const storedUserData = localStorage.getItem('userData');
        if (storedUserData) {
          const parsedUserData = JSON.parse(storedUserData);
          setIsAuthenticated(true);
          setUserData({
            ...parsedUserData,
            role: parsedUserData.role || 'user' // Ensure role is set
          });
        }
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        // Clear invalid data
        localStorage.removeItem('userData');
      } finally {
        setIsLoading(false);
      }
    };

    checkExistingAuth();
  }, []);

  const handleLoginSuccess = (userData) => {
    setIsAuthenticated(true);
    setUserData({
      ...userData,
      role: userData.role || 'user' // Ensure role is set
    });
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserData(null);
    localStorage.removeItem('userData');
  };

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <Router>
        {isAuthenticated ? (
          (userData?.role?.toLowerCase() === 'admin' || userData?.role?.toLowerCase() === 'superadmin') ? (
            <AdminLayout userData={userData} onLogout={handleLogout}>
              <Routes>
                <Route path="/admin/dashboard" element={
                  userData?.role?.toLowerCase() === 'superadmin' ? 
                    <AdminDashboard /> : 
                    <Navigate to="/admin/all-events" replace />
                } />
                <Route path="/admin/event-requests" element={
                  userData?.role?.toLowerCase() === 'superadmin' || userData?.role?.toLowerCase() === 'admin' ? 
                    <EventRequests userData={userData} /> : 
                    <Navigate to="/admin/all-events" replace />
                } />
                <Route path="/admin/users" element={
                  userData?.role?.toLowerCase() === 'superadmin' ? 
                    <Users /> : 
                    <Navigate to="/admin/all-events" replace />
                } />
                <Route path="/admin/departments" element={
                  userData?.role?.toLowerCase() === 'superadmin' ? 
                    <Departments /> : 
                    <Navigate to="/admin/all-events" replace />
                } />
                <Route path="/admin/reports" element={
                  userData?.role?.toLowerCase() === 'superadmin' ? 
                    <Reports /> : 
                    <Navigate to="/admin/all-events" replace />
                } />
                <Route path="/admin/all-events" element={<AllEvents />} />
                <Route path="/admin" element={<Navigate to={userData?.role?.toLowerCase() === 'superadmin' ? "/admin/dashboard" : "/admin/all-events"} replace />} />
                <Route path="/" element={<Navigate to={userData?.role?.toLowerCase() === 'superadmin' ? "/admin/dashboard" : "/admin/all-events"} replace />} />
                <Route path="*" element={<Navigate to={userData?.role?.toLowerCase() === 'superadmin' ? "/admin/dashboard" : "/admin/all-events"} replace />} />
              </Routes>
            </AdminLayout>
          ) : (
            <MainLayout userData={userData} onLogout={handleLogout}>
              <Routes>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/request-event" element={<RequestEvent />} />
                <Route path="/my-events" element={<MyEvents />} />
                <Route path="/calendar" element={<AllEvents />} />
                <Route path="/all-events" element={<AllEventsNew />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/tagged-departments" element={<TaggedDepartments />} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/admin/*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </MainLayout>
          )
        ) : (
          <AuthPage onLoginSuccess={handleLoginSuccess} />
        )}
        <Toaster 
          position="top-right"
          theme="light"
          style={{
            background: "white",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
          }}
          toastOptions={{
            style: {
              background: "white",
              border: "1px solid #e2e8f0",
              borderRadius: "6px",
            },
            success: {
              style: {
                background: "white",
                border: "1px solid #e2e8f0",
                color: "black",
              },
            },
            error: {
              style: {
                background: "white",
                border: "1px solid #e2e8f0",
                color: "red",
              },
            },
          }}
        />
      </Router>
    </ThemeProvider>
  );
}

export default App;