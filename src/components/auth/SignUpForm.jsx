import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Check } from "lucide-react";
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

const DEPARTMENTS = {
  admin: "Administration",
  hr: "Human Resources",
  finance: "Finance",
  it: "Information Technology",
  operations: "Operations",
  planning: "Planning",
  engineering: "Engineering",
  legal: "Legal"
};

const SignUpForm = () => {
  const [isLoading, setIsLoading] = useState(false);
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
      department: DEPARTMENTS[value] // Store the full department name
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
      
      toast("Account Created", {
        description: `Welcome ${formData.firstName} ${formData.lastName}!`,
        icon: <Check className="h-4 w-4" />,
      });
      
      // You might want to redirect here or trigger a callback
    } catch (error) {
      console.error("Signup error:", error);
      toast("Error", {
        description: error.message || "Failed to create account. Please try again.",
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
      {/* Name Fields - 2 columns */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="firstName" className="text-sm text-gray-600">
            First Name
          </Label>
          <Input
            id="firstName"
            placeholder="John"
            className="h-10 bg-gray-50/50 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
            required
            disabled={isLoading}
            value={formData.firstName}
            onChange={handleChange}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="lastName" className="text-sm text-gray-600">
            Last Name
          </Label>
          <Input
            id="lastName"
            placeholder="Doe"
            className="h-10 bg-gray-50/50 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
            required
            disabled={isLoading}
            value={formData.lastName}
            onChange={handleChange}
          />
        </div>
      </div>

      {/* Email and Username - 2 columns */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm text-gray-600">
            Email Address
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="john@example.com"
            className="h-10 bg-gray-50/50 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
            required
            disabled={isLoading}
            value={formData.email}
            onChange={handleChange}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="username" className="text-sm text-gray-600">
            Username
          </Label>
          <Input
            id="username"
            placeholder="johndoe"
            className="h-10 bg-gray-50/50 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
            required
            disabled={isLoading}
            value={formData.username}
            onChange={handleChange}
          />
        </div>
      </div>

      {/* Department Dropdown - Full width */}
      <div className="space-y-1.5">
        <Label htmlFor="department" className="text-sm text-gray-600">
          Department
        </Label>
        <Select 
          disabled={isLoading} 
          required
          onValueChange={handleDepartmentChange}
        >
          <SelectTrigger 
            className="w-full h-10 bg-gray-50/50 border-gray-200 focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <SelectValue placeholder="Select your department" className="text-gray-500" />
          </SelectTrigger>
          <SelectContent className="bg-white border border-gray-200">
            <SelectItem value="admin" className="hover:bg-gray-50 cursor-pointer py-2.5">Administration</SelectItem>
            <SelectItem value="hr" className="hover:bg-gray-50 cursor-pointer py-2.5">Human Resources</SelectItem>
            <SelectItem value="finance" className="hover:bg-gray-50 cursor-pointer py-2.5">Finance</SelectItem>
            <SelectItem value="it" className="hover:bg-gray-50 cursor-pointer py-2.5">Information Technology</SelectItem>
            <SelectItem value="operations" className="hover:bg-gray-50 cursor-pointer py-2.5">Operations</SelectItem>
            <SelectItem value="planning" className="hover:bg-gray-50 cursor-pointer py-2.5">Planning</SelectItem>
            <SelectItem value="engineering" className="hover:bg-gray-50 cursor-pointer py-2.5">Engineering</SelectItem>
            <SelectItem value="legal" className="hover:bg-gray-50 cursor-pointer py-2.5">Legal</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Password Fields - Full width */}
      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-sm text-gray-600">
          Password
        </Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          className="h-10 bg-gray-50/50 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
          required
          disabled={isLoading}
          value={formData.password}
          onChange={handleChange}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword" className="text-sm text-gray-600">
          Confirm Password
        </Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="••••••••"
          className="h-10 bg-gray-50/50 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
          required
          disabled={isLoading}
          value={formData.confirmPassword}
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
        ) : "Create Account"}
      </Button>
    </motion.form>
  );
};

export default SignUpForm;