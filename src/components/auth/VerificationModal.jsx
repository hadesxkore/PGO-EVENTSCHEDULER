import { motion } from "framer-motion";
import { Mail, X, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

const VerificationModal = ({ isOpen, onClose, email, onResendEmail, isResending }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Mail className="h-5 w-5 text-blue-500" />
            Verify Your Email
          </DialogTitle>
          <DialogDescription className="text-base">
            We've sent a verification email to:
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center py-6">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center gap-6"
          >
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
              <Mail className="h-8 w-8 text-blue-500" />
            </div>

            <div className="text-center space-y-2">
              <p className="font-medium text-gray-900">{email}</p>
              <p className="text-sm text-gray-500 max-w-sm">
                Please check your email and click the verification link to activate your account.
                You won't be able to log in until your email is verified.
              </p>
            </div>

            <div className="flex flex-col gap-3 w-full">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={onResendEmail}
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
                variant="ghost"
                className="w-full"
                onClick={onClose}
              >
                Close
                <X className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VerificationModal;






