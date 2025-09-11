import { motion } from "framer-motion";
import { Card } from "../ui/card";
import LoginForm from "./LoginForm";
import bataanLogo from "/images/bataanlogo.png";

const AuthPage = ({ onLoginSuccess }) => {
  return (
    <div className="min-h-screen w-full flex">
      {/* Left Section - Hidden on mobile */}
      <div className="hidden lg:flex w-[60%] bg-[#4263EB] relative overflow-hidden">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-transparent"
        />
        
        <div className="relative w-full h-full flex flex-col justify-center items-center p-12 text-center">
          <motion.img
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            src={bataanLogo}
            alt="Bataan Logo"
            className="w-28 h-28 object-contain mb-12"
          />
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="max-w-xl"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
              Event Scheduler
            </h1>
            <p className="text-xl text-blue-100 mb-3 font-light">
              Provincial Government of Bataan
            </p>
            <p className="text-blue-100/80 text-base max-w-md mx-auto font-light">
              Efficiently manage and organize events with our comprehensive scheduling platform
            </p>
          </motion.div>

          {/* Abstract shapes for decoration */}
          <div className="absolute left-0 bottom-0 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl" />
          <div className="absolute right-0 top-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        </div>
      </div>

      {/* Right Section - Full width on mobile */}
      <div className="w-full lg:w-[40%] min-h-screen flex items-center justify-center p-6 bg-white">
        <Card className="w-full max-w-md p-8 lg:p-10 shadow-none border-none">
          {/* Mobile Logo */}
          <div className="flex flex-col items-center mb-8 lg:hidden">
            <img
              src={bataanLogo}
              alt="Bataan Logo"
              className="w-20 h-20 object-contain mb-4"
            />
            <h2 className="text-2xl font-bold text-gray-900">
              Event Scheduler
            </h2>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex flex-col mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Welcome Back
              </h2>
              <p className="text-gray-500">
                Sign in to manage your events
              </p>
            </div>

            <LoginForm 
              onLoginSuccess={onLoginSuccess}
            />
          </motion.div>
        </Card>
      </div>
    </div>
  );
};

export default AuthPage;