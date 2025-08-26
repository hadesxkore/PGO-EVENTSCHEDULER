import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft, Check } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { toast } from "sonner";
import { auth } from "../../lib/firebase/firebase";
import { sendPasswordResetEmail } from "firebase/auth";

const ForgotPassword = ({ onBack }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      toast.success("Reset Email Sent!", {
        className: "bg-white dark:bg-slate-800 border-green-500/20",
        description: (
          <div className="flex flex-col gap-1">
            <p className="font-medium">Check your email</p>
            <p className="text-xs text-gray-500">We've sent you instructions to reset your password</p>
          </div>
        ),
        duration: 5000,
        icon: <Check className="h-5 w-5 text-green-500" />,
      });
      // Clear the form
      setEmail("");
    } catch (error) {
      console.error("Password reset error:", error);
      toast.error("Reset Failed", {
        className: "bg-white dark:bg-slate-800 border-red-500/20",
        description: (
          <div className="flex flex-col gap-1">
            <p className="font-medium text-red-600">
              {error.code === "auth/user-not-found"
                ? "No account found with this email"
                : "Failed to send reset email"}
            </p>
            <p className="text-xs text-gray-500">Please check the email address and try again</p>
          </div>
        ),
        duration: 4000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
              <div className="flex flex-col mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Reset Password
          </h2>
          <p className="text-gray-500 mb-2">
            Enter your email address and we'll send you instructions to reset your password
          </p>
          <p className="text-sm text-gray-400">
            Don't forget to check your spam folder if you don't see the email
          </p>
        </div>

      <motion.form
        onSubmit={handleSubmit}
        className="space-y-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm text-gray-600">
            Email Address
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter your email address"
            className="h-10 bg-gray-50/50 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
            required
            disabled={isLoading}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <Button
          type="submit"
          className="w-full h-10 bg-[#4263EB] hover:bg-blue-600 transition-colors text-white"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            "Send Reset Instructions"
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="w-full h-10 mt-2"
          onClick={onBack}
          disabled={isLoading}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Login
        </Button>
      </motion.form>
    </motion.div>
  );
};

export default ForgotPassword;
