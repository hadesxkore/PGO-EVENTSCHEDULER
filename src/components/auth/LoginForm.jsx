import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Check } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { toast } from "sonner";
import { loginUser } from "../../lib/firebase/firebase";

const LoginForm = ({ onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
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
      toast("Welcome back!", {
        description: `Welcome back, ${userData.firstName}!`,
        icon: <Check className="h-4 w-4" />,
      });
      
      // Call the onLoginSuccess callback to update authentication state
      onLoginSuccess(userData);
      
    } catch (error) {
      console.error("Login error:", error);
      toast("Error", {
        description: error.message || "Failed to login. Please check your credentials and try again.",
        variant: "destructive"
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