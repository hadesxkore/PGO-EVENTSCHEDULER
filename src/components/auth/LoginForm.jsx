import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { toast } from "sonner";
import { loginUser } from "../../lib/firebase/firebase";
import useUserLogsStore from "../../store/userLogsStore";

const LoginForm = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const { addLog } = useUserLogsStore();
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoggedThisSession, setHasLoggedThisSession] = useState(false);
  const [lastLogTime, setLastLogTime] = useState(0);
  const [formData, setFormData] = useState({
    username: "",
    password: ""
  });

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const { userData } = await loginUser(formData.username, formData.password);
      toast.success("Login Successful!", {
        className: "bg-white dark:bg-slate-800 border-green-500/20",
        description: (
          <div className="flex flex-col gap-1">
            <p className="font-medium">Welcome back, {userData.firstName}!</p>
            <p className="text-xs text-gray-500">Redirecting to dashboard...</p>
          </div>
        ),
        duration: 2000,
        icon: <Check className="h-5 w-5 text-green-500" />,
      });
      
                                                  // Log successful login (exclude Admin and SuperAdmin)
      const now = Date.now();
      const userRole = userData.role?.toLowerCase();
      const isAdminRole = userRole === 'admin' || userRole === 'superadmin';
      
      if (!isAdminRole && !hasLoggedThisSession && (now - lastLogTime > 5000)) {
        setHasLoggedThisSession(true);
        setLastLogTime(now);
        
        console.log('Logging user login DIRECTLY to Firestore:', userData.email, 'Role:', userData.role);
        
        // DIRECT FIRESTORE WRITE - Skip local storage, write directly to Firestore
        try {
          const logEntry = {
            userId: userData.uid || userData.id,
            userName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.name || userData.email || 'Unknown User',
            userEmail: userData.email,
            department: userData.department || 'Unknown Department',
            action: "Login",
            status: "success",
            timestamp: new Date().toISOString()
          };
          
          // Write DIRECTLY to Firestore immediately
          const { addDoc, collection, Timestamp } = await import('firebase/firestore');
          const { db } = await import('../../lib/firebase/firebase');
          
          const firestoreLog = {
            ...logEntry,
            timestamp: Timestamp.fromDate(new Date(logEntry.timestamp))
          };
          
          console.log('Writing log DIRECTLY to Firestore...', firestoreLog);
          const docRef = await addDoc(collection(db, 'userLogs'), firestoreLog);
          console.log('✅ Log written DIRECTLY to Firestore with ID:', docRef.id);
          
          // Add to Zustand cache for immediate UI update (REDUCES FUTURE FIRESTORE READS)
          const { addLogToCache } = useUserLogsStore.getState();
          addLogToCache({
            ...logEntry,
            id: docRef.id // Use the actual Firestore document ID
          });
          
          console.log('🚀 Added log to Zustand cache - Admin page will use cache instead of Firestore read!');
          
        } catch (error) {
          console.error('❌ Error writing log directly to Firestore:', error);
          
          // Fallback to normal addLog method
          await addLog({
            userId: userData.uid || userData.id,
            userName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.name || userData.email || 'Unknown User',
            userEmail: userData.email,
            department: userData.department || 'Unknown Department',
            action: "Login",
            status: "success"
          });
          
          // Force flush as backup
          const { flushPendingLogs } = useUserLogsStore.getState();
          await flushPendingLogs();
        }
      } else if (isAdminRole) {
        console.log('Skipping log for admin role:', userData.email, 'Role:', userData.role);
      }
      
      // Save user data to localStorage for access across the app
      localStorage.setItem('userData', JSON.stringify(userData));
      
      // Call the onLoginSuccess callback to update authentication state
      onLoginSuccess(userData);
      
      // Navigate to dashboard after a short delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
      
    } catch (error) {
      console.error("Login error:", error);
      
      // Log failed login attempt (we can't determine role for failed attempts, so we log all)
      await addLog({
        userId: formData.username, // Use username since we don't have user ID for failed attempts
        userName: formData.username,
        userEmail: formData.username, // Might be email or username
        department: "Unknown",
        action: "Failed Login",
        status: "error"
      });
      
      toast.error("Login Failed", {
        className: "bg-white dark:bg-slate-800 border-red-500/20",
        description: (
          <div className="flex flex-col gap-1">
            <p className="font-medium text-red-600">{error.message || "Invalid credentials"}</p>
            <p className="text-xs text-gray-500">Please check your username and password</p>
          </div>
        ),
        duration: 4000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.form
      onSubmit={onSubmit}
      className="space-y-3.5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="username" className="text-sm text-gray-600">
          Username
        </Label>
        <Input
          id="username"
          type="text"
          placeholder="Enter your username"
          className="h-10 bg-gray-50/50 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
          required
          disabled={isLoading}
          value={formData.username}
          onChange={handleChange}
        />
      </div>
      
      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-sm text-gray-600">
          Password
        </Label>
        <Input
          id="password"
          type="password"
          placeholder="Enter your password"
          className="h-10 bg-gray-50/50 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
          required
          disabled={isLoading}
          value={formData.password}
          onChange={handleChange}
        />
      </div>

      <Button
        type="submit"
        className="w-full h-10 mt-4 bg-[#4263EB] hover:bg-blue-600 transition-colors text-white"
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : "Log In"}
      </Button>
    </motion.form>
  );
};

export default LoginForm;