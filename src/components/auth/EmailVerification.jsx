import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, ArrowRight, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "../ui/button";
import { toast } from "sonner";
import { auth, sendVerificationEmail } from "../../lib/firebase/firebase";

const EmailVerification = ({ email, onBack }) => {
  const [isResending, setIsResending] = useState(false);

  const handleResendEmail = async () => {
    try {
      setIsResending(true);
      const currentUser = auth.currentUser;
      if (currentUser) {
        await sendVerificationEmail(currentUser);
        toast.success("Verification Email Sent!", {
          description: "Please check your email for the verification link.",
          duration: 4000,
        });
      }
    } catch (error) {
      console.error("Error resending verification email:", error);
      toast.error("Failed to resend verification email", {
        description: "Please try again later.",
        duration: 4000,
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col items-center"
    >
      <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mb-6">
        <Mail className="h-10 w-10 text-blue-500" />
      </div>

      <h2 className="text-2xl font-semibold text-gray-900 mb-2">
        Verify Your Email
      </h2>

      <p className="text-gray-500 text-center mb-4">
        We've sent a verification email to:
      </p>

      <div className="bg-gray-50 rounded-lg px-4 py-3 text-center mb-6 w-full">
        <p className="font-medium text-gray-900 break-all">{email}</p>
      </div>

      <div className="text-sm text-gray-500 text-center mb-8 max-w-sm">
        Please check your email and click the verification link to activate your account.
        You won't be able to log in until your email is verified.
      </div>
      
      <div className="text-xs text-gray-400 text-center mb-6">
        Don't forget to check your spam folder if you don't see the email
      </div>

      <div className="flex flex-col gap-3 w-full">
        <Button
          type="button"
          className="w-full bg-[#4263EB] hover:bg-blue-600 text-white"
          onClick={handleResendEmail}
          disabled={isResending}
        >
          {isResending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Resending...
            </>
          ) : (
            <>
              Resend Verification Email
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={onBack}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Login
        </Button>
      </div>
    </motion.div>
  );
};

export default EmailVerification;
