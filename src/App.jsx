import { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import AuthPage from "./components/auth/AuthPage";
import MainLayout from "./components/layout/MainLayout";
import AdminLayout from "./components/layout/AdminLayout";
import Dashboard from "./pages/Dashboard";
import RequestEvent from "./pages/RequestEvent";
import MyEvents from "./pages/MyEvents";
import AllEvents from "./pages/AllEvents";
import Messages from "./pages/Messages";
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

  const handleLoginSuccess = (userData) => {
    setIsAuthenticated(true);
    setUserData({
      ...userData,
      role: userData.role || 'user' // Ensure role is set
    });
  };

  return (
    <ThemeProvider>
      <Router>
        {isAuthenticated ? (
          userData?.role?.toLowerCase() === 'admin' ? (
            <AdminLayout userData={userData}>
              <Routes>
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/event-requests" element={<EventRequests />} />
                <Route path="/admin/users" element={<Users />} />
                <Route path="/admin/departments" element={<Departments />} />
                <Route path="/admin/reports" element={<Reports />} />
                <Route path="/admin/all-events" element={<AllEvents />} />
                <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
              </Routes>
            </AdminLayout>
          ) : (
            <MainLayout userData={userData}>
              <Routes>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/request-event" element={<RequestEvent />} />
                <Route path="/my-events" element={<MyEvents />} />
                <Route path="/all-events" element={<AllEvents />} />
                <Route path="/messages" element={<Messages />} />
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