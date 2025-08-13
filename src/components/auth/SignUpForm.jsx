import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, Check, Building2, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { toast } from "sonner";
import { registerUser } from "../../lib/firebase/firebase";
import { getAllDepartments } from "../../lib/firebase/departments";



const SignUpForm = ({ onSignUpSuccess }) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const result = await getAllDepartments();
        if (result.success) {
          setDepartments(result.departments);
        } else {
          toast.error("Failed to fetch departments", {
            className: "bg-white dark:bg-slate-800 border-red-500/20",
            description: "Please try again or contact support if the issue persists.",
            duration: 3000,
          });
        }
      } catch (error) {
        console.error('Error fetching departments:', error);
        toast.error("An error occurred while fetching departments", {
          className: "bg-white dark:bg-slate-800 border-red-500/20",
          description: "Please check your connection and try again.",
          duration: 3000,
        });
      }
    };

    fetchDepartments();
  }, []);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    username: "",
    department: "",
    password: "",
    confirmPassword: ""
  });

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const handleDepartmentChange = (value) => {
    setFormData(prev => ({
      ...prev,
      department: value
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Validate passwords match
      if (formData.password !== formData.confirmPassword) {
        throw new Error("Passwords do not match");
      }

      if (!formData.department) {
        throw new Error("Please select a department");
      }

      // Register user
      const userData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        username: formData.username,
        department: formData.department,
        email: formData.email,
        role: "user" // Default role
      };

      await registerUser(formData.email, formData.password, userData);
      
      toast.success("Account Created Successfully!", {
        className: "bg-white dark:bg-slate-800 border-green-500/20",
        description: (
          <div className="flex flex-col gap-1">
            <p className="font-medium">Welcome {formData.firstName} {formData.lastName}!</p>
            <p className="text-xs text-gray-500">Redirecting you to login...</p>
          </div>
        ),
        duration: 2000,
        icon: <Check className="h-5 w-5 text-green-500" />,
      });
      
      // Wait for 2 seconds before switching to login form
      setTimeout(() => {
        onSignUpSuccess();
      }, 2000);
    } catch (error) {
      console.error("Signup error:", error);
      toast.error("Sign Up Failed", {
        className: "bg-white dark:bg-slate-800 border-red-500/20",
        description: (
          <div className="flex flex-col gap-1">
            <p className="font-medium text-red-600">{error.message || "Failed to create account"}</p>
            <p className="text-xs text-gray-500">Please check your information and try again</p>
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
      className="space-y-2.5 max-w-xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Name Fields - 2 columns */}
      <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
        <Label htmlFor="firstName" className="text-xs text-gray-600">
          First Name
        </Label>
        <Input
            id="firstName"
            placeholder="Juan"
            className="h-9 bg-gray-50/50 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
            required
            disabled={isLoading}
            value={formData.firstName}
            onChange={handleChange}
          />
        </div>

              <div className="space-y-1">
        <Label htmlFor="lastName" className="text-xs text-gray-600">
          Last Name
        </Label>
        <Input
            id="lastName"
            placeholder="Pedro"
            className="h-9 bg-gray-50/50 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
            required
            disabled={isLoading}
            value={formData.lastName}
            onChange={handleChange}
          />
        </div>
      </div>

      {/* Email and Username - 2 columns */}
      <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
        <Label htmlFor="email" className="text-xs text-gray-600">
          Email Address
        </Label>
        <Input
            id="email"
            type="email"
            placeholder="juanpedro@gmail.com"
            className="h-9 bg-gray-50/50 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
            required
            disabled={isLoading}
            value={formData.email}
            onChange={handleChange}
          />
        </div>

              <div className="space-y-1">
        <Label htmlFor="username" className="text-xs text-gray-600">
          Username
        </Label>
        <Input
            id="username"
            placeholder="juanpedro"
            className="h-9 bg-gray-50/50 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
            required
            disabled={isLoading}
            value={formData.username}
            onChange={handleChange}
          />
        </div>
      </div>

      {/* Department Dropdown - Full width */}
      <div className="space-y-1">
        <Label htmlFor="department" className="text-xs text-gray-600">
          Department
        </Label>
        <Select 
          disabled={isLoading} 
          required
          onValueChange={handleDepartmentChange}
        >
          <SelectTrigger 
            className="w-full h-9 bg-gray-50/50 border-gray-200 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          >
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-gray-500" />
              <SelectValue placeholder="Select your department" />
            </div>
          </SelectTrigger>
          <SelectContent 
            className="bg-white/95 backdrop-blur-sm border border-gray-200 shadow-lg animate-in fade-in-0 zoom-in-95"
          >
            <div className="p-2">
              <div className="px-2 pb-2 mb-2 border-b border-gray-100">
                <h4 className="text-sm font-medium text-gray-900">Select Department</h4>
                <p className="text-xs text-gray-500">Choose your department from the list below</p>
                <div className="mt-2 relative" onClick={(e) => e.stopPropagation()}>
                  <Input
                    placeholder="Search departments..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-8 bg-gray-50/50 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 pl-8"
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>
              {departments
                .filter(dept => 
                  dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  dept.location?.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((dept) => (
                <SelectItem 
                  key={dept.id} 
                  value={dept.name}
                  className="relative flex items-center gap-2 px-8 py-2.5 text-sm rounded-md cursor-default hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors data-[state=checked]:bg-blue-50"
                >
                  <Building2 className="absolute left-2 h-4 w-4 text-blue-500" />
                  <span className="font-medium text-gray-700">{dept.name}</span>
                </SelectItem>
              ))}
            </div>
          </SelectContent>
        </Select>
      </div>
      
      {/* Password Fields - Full width */}
      <div className="space-y-1">
        <Label htmlFor="password" className="text-xs text-gray-600">
          Password
        </Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          className="h-9 bg-gray-50/50 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
          required
          disabled={isLoading}
          value={formData.password}
          onChange={handleChange}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="confirmPassword" className="text-xs text-gray-600">
          Confirm Password
        </Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="••••••••"
          className="h-9 bg-gray-50/50 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
          required
          disabled={isLoading}
          value={formData.confirmPassword}
          onChange={handleChange}
        />
      </div>

      <Button
        type="submit"
        className="w-full h-9 mt-3 bg-[#4263EB] hover:bg-blue-600 transition-colors text-white"
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : "Create Account"}
      </Button>
    </motion.form>
  );
};

export default SignUpForm;