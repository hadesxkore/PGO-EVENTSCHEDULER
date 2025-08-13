import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "../lib/utils";
import { auth, db } from "../lib/firebase/firebase";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { uploadFile, formatFileSize } from "../lib/cloudinary";
import { createEventRequest } from "../lib/firebase/eventRequests";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTheme } from "../contexts/ThemeContext";
import { Button } from "../components/ui/button";
import { forwardRef } from "react";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";


import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../components/ui/sheet";
import {
  Dialog,
  DialogContent,
} from "../components/ui/dialog";

import {
  CalendarIcon,
  Clock,
  Users,
  MapPin,
  FileText,
  Send,
  Plus,
  User,
  X,
  ChevronDown,
  Phone,
  Mail,
} from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "../components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";



const RequestEvent = () => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is authenticated
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        toast.error("Please login to submit event requests");
        navigate('/');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    requestor: "",
    location: "",
    participants: "",
    provisions: "",
    duration: "",
    contactNumber: "",
    contactEmail: "",
  });

  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState("10:30");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [showYearPicker, setShowYearPicker] = useState(false);
  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i);
  const [attachments, setAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      // Validate required fields
      const requiredFields = ['title', 'requestor', 'location', 'participants', 'provisions', 'duration'];
      const missingFields = requiredFields.filter(field => !formData[field]);
      
      if (missingFields.length > 0) {
        toast.error("Please fill in all required fields");
        return;
      }

      // Get current Firebase user
      const currentUser = auth.currentUser;
      if (!currentUser) {
        toast.error("User not authenticated");
        return;
      }

      // Get user data from Firestore
      const userDocRef = doc(db, "users", currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (!userDocSnap.exists()) {
        toast.error("User data not found");
        return;
      }

      const userData = userDocSnap.data();

      // Combine date and time
      const [hours, minutes] = time.split(':');
      const eventDate = new Date(date);
      eventDate.setHours(parseInt(hours), parseInt(minutes));
      const eventTimestamp = Timestamp.fromDate(eventDate);

      // Create event request data
      const eventDataWithUser = {
        ...formData,
        date: eventTimestamp,
        attachments: attachments.map(file => ({
          name: file.name,
          size: file.size,
          type: file.type,
          url: file.url,
          publicId: file.publicId
        })),
        userId: currentUser.uid,
        userEmail: currentUser.email,
        userName: userData.username || userData.name || currentUser.email,
        department: userData.department || 'Not specified'
      };

      const result = await createEventRequest(eventDataWithUser);
    
      if (result.success) {
        toast.success("Event request submitted successfully");
        navigate('/my-events');
      } else {
        toast.error(result.error || "Failed to submit event request");
      }
    } catch (error) {
      console.error('Error submitting event request:', error);
      toast.error("An error occurred while submitting your request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 7; hour <= 19; hour++) {
      for (let minute of ['00', '30']) {
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour > 12 ? hour - 12 : hour;
        times.push({
          value: `${hour}:${minute}`,
          label: `${displayHour}:${minute} ${period}`
        });
      }
    }
    return times;
  };

  const timeOptions = generateTimeOptions();

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={container}
      className="max-w-6xl mx-auto px-6 py-6"
    >
      {/* Header */}
      <motion.div variants={item} className="mb-6">
        <h1 className={cn(
          "text-3xl font-bold",
          isDarkMode ? "text-white" : "text-gray-900"
        )}>Request Event</h1>
        <p className={cn(
          "text-base mt-2",
          isDarkMode ? "text-gray-400" : "text-gray-500"
        )}>Create a new event request for approval.</p>
      </motion.div>

      {/* Main Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Details */}
        <motion.div 
          variants={item}
          className="lg:col-span-2 space-y-5"
        >
          {/* Event Details Card */}
          <div className={cn(
            "rounded-xl p-6 shadow-sm",
            isDarkMode ? "bg-slate-800" : "bg-white"
          )}>
            <h2 className={cn(
              "text-2xl font-bold mb-6",
              isDarkMode ? "text-gray-100" : "text-gray-900"
            )}>Event Details</h2>
            
            <div className="space-y-6">
              {/* Title and Requestor */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className={cn("text-sm font-semibold", isDarkMode ? "text-gray-300" : "text-gray-700")}>
                    Event Title
                  </Label>
                                      <Input
                      name="title"
                      type="text"
                      required
                      value={formData.title}
                      onChange={handleInputChange}
                      placeholder="Enter event title"
                    className={cn(
                      "rounded-lg h-12 text-base px-4",
                      isDarkMode 
                        ? "bg-slate-900 border-slate-700" 
                        : "bg-white border-gray-200"
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label className={cn("text-sm font-semibold", isDarkMode ? "text-gray-300" : "text-gray-700")}>
                    Requestor
                  </Label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      name="requestor"
                      type="text"
                      required
                      value={formData.requestor}
                      onChange={handleInputChange}
                      placeholder="Your name"
                      className={cn(
                        "pl-12 rounded-lg h-12 text-base",
                        isDarkMode 
                          ? "bg-slate-900 border-slate-700" 
                          : "bg-white border-gray-200"
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* Location and Participants */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className={cn("text-sm font-semibold", isDarkMode ? "text-gray-300" : "text-gray-700")}>
                    Location
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      name="location"
                      type="text"
                      required
                      value={formData.location}
                      onChange={handleInputChange}
                      placeholder="Event location"
                      className={cn(
                        "pl-12 rounded-lg h-12 text-base",
                        isDarkMode 
                          ? "bg-slate-900 border-slate-700" 
                          : "bg-white border-gray-200"
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className={cn("text-sm font-semibold", isDarkMode ? "text-gray-300" : "text-gray-700")}>
                    Number of Participants
                  </Label>
                  <div className="relative">
                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      name="participants"
                      value={formData.participants}
                      onChange={handleInputChange}
                      type="number"
                      required
                      min="1"
                      placeholder="Expected number of attendees"
                      className={cn(
                        "pl-12 rounded-lg h-12 text-base",
                        isDarkMode 
                          ? "bg-slate-900 border-slate-700" 
                          : "bg-white border-gray-200"
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* Program Provision */}
              <div className="space-y-2">
                <Label className={cn("text-sm font-semibold", isDarkMode ? "text-gray-300" : "text-gray-700")}>
                  Requirements
                </Label>
                <textarea
                  name="provisions"
                  value={formData.provisions}
                  required
                  onChange={handleInputChange}
                  placeholder="List down your event requirements (e.g., sound system, microphones, tables & chairs, food & drinks, projector, etc.)"
                  className={cn(
                    "w-full min-h-[140px] rounded-lg p-3 text-base resize-y border",
                    isDarkMode 
                      ? "bg-slate-900 border-slate-700 text-gray-100 placeholder:text-gray-500 focus:border-slate-600" 
                      : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-gray-300"
                  )}
                />
              </div>

              {/* Attachments */}
              <div className="space-y-2">
                <Label className={cn("text-sm font-semibold", isDarkMode ? "text-gray-300" : "text-gray-700")}>
                  Attachments
                </Label>
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  multiple
                  onChange={async (e) => {
                    const files = Array.from(e.target.files);
                    const maxSize = 10 * 1024 * 1024; // 10MB
                    const allowedTypes = [
                      'application/pdf',
                      'application/msword',
                      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                      'image/jpeg',
                      'image/png'
                    ];

                    // Validate files
                    const invalidFiles = files.filter(
                      file => !allowedTypes.includes(file.type) || file.size > maxSize
                    );

                    if (invalidFiles.length > 0) {
                      toast.error("Some files are not supported or exceed 10MB limit");
                      return;
                    }

                    // Start upload process
                    setIsUploading(true);
                    setUploadProgress(0);
                    
                    // Upload files with progress
                    const totalFiles = files.length;
                    let completedFiles = 0;
                    
                    const uploadPromises = files.map(async (file) => {
                      const result = await uploadFile(file);
                      if (result.success) {
                        completedFiles++;
                        setUploadProgress(Math.round((completedFiles / totalFiles) * 100));
                        return {
                          name: file.name,
                          size: file.size,
                          type: file.type,
                          url: result.url,
                          publicId: result.publicId
                        };
                      }
                      toast.error(`Failed to upload ${file.name}`);
                      return null;
                    });

                    const results = await Promise.all(uploadPromises);
                    const successfulUploads = results.filter(result => result !== null);
                    setAttachments(prev => [...prev, ...successfulUploads]);
                    
                    // End upload process
                    setTimeout(() => {
                      setIsUploading(false);
                      setUploadProgress(0);
                    }, 500); // Small delay to show 100% completion
                  }}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                />

                <div 
                  className={cn(
                    "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
                    isDarkMode 
                      ? "border-slate-700 bg-slate-900 hover:bg-slate-800" 
                      : "border-gray-200 bg-gray-50 hover:bg-gray-100",
                    "relative"
                  )}
                  onClick={() => document.getElementById('file-upload').click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const files = Array.from(e.dataTransfer.files);
                    const maxSize = 10 * 1024 * 1024; // 10MB
                    const allowedTypes = [
                      'application/pdf',
                      'application/msword',
                      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                      'image/jpeg',
                      'image/png'
                    ];

                    // Validate files
                    const invalidFiles = files.filter(
                      file => !allowedTypes.includes(file.type) || file.size > maxSize
                    );

                    if (invalidFiles.length > 0) {
                      toast.error("Some files are not supported or exceed 10MB limit");
                      return;
                    }

                    // Start upload process
                    setIsUploading(true);
                    setUploadProgress(0);
                    
                    // Upload files with progress
                    const totalFiles = files.length;
                    let completedFiles = 0;
                    
                    const uploadPromises = files.map(async (file) => {
                      const result = await uploadFile(file);
                      if (result.success) {
                        completedFiles++;
                        setUploadProgress(Math.round((completedFiles / totalFiles) * 100));
                        return {
                          name: file.name,
                          size: file.size,
                          type: file.type,
                          url: result.url,
                          publicId: result.publicId
                        };
                      }
                      toast.error(`Failed to upload ${file.name}`);
                      return null;
                    });

                    const results = await Promise.all(uploadPromises);
                    const successfulUploads = results.filter(result => result !== null);
                    setAttachments(prev => [...prev, ...successfulUploads]);
                    
                    // End upload process
                    setTimeout(() => {
                      setIsUploading(false);
                      setUploadProgress(0);
                    }, 500); // Small delay to show 100% completion
                  }}
                >
                  <div className="flex flex-col items-center gap-2">
                    <FileText className={cn(
                      "h-8 w-8",
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    )} />
                    <div className="text-base">
                      <span className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
                        Drag & drop files here or{" "}
                      </span>
                      <Button
                        variant="link"
                        className="text-blue-500 hover:text-blue-600 p-0 h-auto font-medium"
                        onClick={(e) => {
                          e.stopPropagation();
                          document.getElementById('file-upload').click();
                        }}
                      >
                        browse
                      </Button>
                    </div>
                    <p className={cn(
                      "text-xs",
                      isDarkMode ? "text-gray-500" : "text-gray-400"
                    )}>
                      Supported formats: PDF, DOC, DOCX, JPG, PNG (max 10MB)
                    </p>
                  </div>
                </div>

                {/* Uploaded Files */}
                {attachments.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {attachments.map((file, index) => (
                      <div
                        key={index}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg border",
                          isDarkMode ? "border-slate-700 bg-slate-800" : "border-gray-200 bg-gray-50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-blue-500" />
                          <div>
                            <p className={cn(
                              "text-sm font-medium",
                              isDarkMode ? "text-gray-100" : "text-gray-900"
                            )}>{file.name}</p>
                            <p className={cn(
                              "text-xs",
                              isDarkMode ? "text-gray-400" : "text-gray-500"
                            )}>{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "text-red-500 hover:text-red-600",
                            isDarkMode && "hover:bg-slate-700"
                          )}
                          onClick={() => {
                            setAttachments(prev => prev.filter((_, i) => i !== index));
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Column - Date & Time */}
        <motion.div variants={item} className="space-y-6">
          <div className={cn(
            "rounded-xl p-6 shadow-sm",
            isDarkMode ? "bg-slate-800" : "bg-white"
          )}>
            <h2 className={cn(
              "text-2xl font-bold mb-6",
              isDarkMode ? "text-gray-100" : "text-gray-900"
            )}>Schedule</h2>

            <div className="space-y-6">
              {/* Date and Time Selection */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label className={cn(
                    "text-sm font-medium mb-1.5 block", 
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  )}>
                    Date
                  </Label>
                  <div className="relative">
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full justify-start text-left font-normal text-sm",
                        "h-[38px] pl-9 pr-3 appearance-none rounded-md border",
                        !date && "text-muted-foreground",
                        isDarkMode 
                          ? "bg-slate-900 border-slate-700 text-gray-100" 
                          : "bg-white border-gray-200 text-gray-900"
                      )}
                      onClick={() => setIsCalendarOpen(true)}
                    >
                      <div className="absolute left-3 top-1/2 -translate-y-1/2">
                        <CalendarIcon className="h-4 w-4 text-gray-400" />
                      </div>
                      {date ? format(date, "MMM dd, yyyy") : <span>Pick a date</span>}
                    </Button>
                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                      <PopoverTrigger asChild>
                        <div className="absolute inset-0" />
                      </PopoverTrigger>
                                            <PopoverContent 
                          className={cn(
                            "p-2 w-auto",
                            isDarkMode 
                              ? "bg-slate-900 border-slate-700" 
                              : "bg-white border-gray-200"
                          )}
                          align="start"
                        >
                          <Calendar
                            mode="single"
                            selected={date}
                            onSelect={(newDate) => {
                              setDate(newDate);
                              setIsCalendarOpen(false);
                            }}
                            disabled={(date) => date < new Date()}
                            initialFocus
                            showOutsideDays={false}
                            className={cn(
                              "rounded-md shadow-none",
                              isDarkMode && "dark"
                            )}
                          />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div>
                  <Label className={cn(
                    "text-sm font-medium mb-1.5 block", 
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  )}>
                    Time
                  </Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center">
                      <Clock className="h-4 w-4 text-gray-400" />
                    </div>
                    <select
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className={cn(
                        "w-full h-[38px] pl-9 pr-3 appearance-none rounded-md border font-normal text-sm",
                        isDarkMode 
                          ? "bg-slate-900 border-slate-700 text-gray-100" 
                          : "bg-white border-gray-200 text-gray-900"
                      )}
                    >
                      {timeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Duration Selection */}
              <div className="space-y-2">
                <Label className={cn(
                  "text-sm font-medium", 
                  isDarkMode ? "text-gray-300" : "text-gray-700"
                )}>
                  Duration
                </Label>
                <Select
                  value={formData.duration}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, duration: value }))}
                >
                  <SelectTrigger className={cn(
                    "h-10",
                    isDarkMode 
                      ? "bg-slate-900 border-slate-700" 
                      : "bg-white border-gray-200"
                  )}>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent className={cn( 
                    isDarkMode 
                      ? "bg-slate-900 border-slate-700" 
                      : "bg-white border-gray-200"
                  )}>
                    <SelectItem value="30" className={cn(
                      isDarkMode ? "focus:bg-slate-800" : "focus:bg-gray-100",
                      isDarkMode ? "text-gray-100" : "text-gray-900"
                    )}>30 minutes</SelectItem>
                    <SelectItem value="60" className={cn(
                      isDarkMode ? "focus:bg-slate-800" : "focus:bg-gray-100",
                      isDarkMode ? "text-gray-100" : "text-gray-900"
                    )}>1 hour</SelectItem>
                    <SelectItem value="90" className={cn(
                      isDarkMode ? "focus:bg-slate-800" : "focus:bg-gray-100",
                      isDarkMode ? "text-gray-100" : "text-gray-900"
                    )}>1.5 hours</SelectItem>
                    <SelectItem value="120" className={cn(
                      isDarkMode ? "focus:bg-slate-800" : "focus:bg-gray-100",
                      isDarkMode ? "text-gray-100" : "text-gray-900"
                    )}>2 hours</SelectItem>
                    <SelectItem value="180" className={cn(
                      isDarkMode ? "focus:bg-slate-800" : "focus:bg-gray-100",
                      isDarkMode ? "text-gray-100" : "text-gray-900"
                    )}>3 hours</SelectItem>
                    <SelectItem value="240" className={cn(
                      isDarkMode ? "focus:bg-slate-800" : "focus:bg-gray-100",
                      isDarkMode ? "text-gray-100" : "text-gray-900"
                    )}>4 hours</SelectItem>
                    <SelectItem value="300" className={cn(
                      isDarkMode ? "focus:bg-slate-800" : "focus:bg-gray-100",
                      isDarkMode ? "text-gray-100" : "text-gray-900"
                    )}>5 hours</SelectItem>
                    <SelectItem value="360" className={cn(
                      isDarkMode ? "focus:bg-slate-800" : "focus:bg-gray-100",
                      isDarkMode ? "text-gray-100" : "text-gray-900"
                    )}>6 hours</SelectItem>
                    <SelectItem value="420" className={cn(
                      isDarkMode ? "focus:bg-slate-800" : "focus:bg-gray-100",
                      isDarkMode ? "text-gray-100" : "text-gray-900"
                    )}>7 hours</SelectItem>
                    <SelectItem value="480" className={cn(
                      isDarkMode ? "focus:bg-slate-800" : "focus:bg-gray-100",
                      isDarkMode ? "text-gray-100" : "text-gray-900"
                    )}>8 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Contact Details */}
              <div className="space-y-4 mt-6">
                <h3 className={cn(
                  "text-lg font-semibold",
                  isDarkMode ? "text-gray-100" : "text-gray-900"
                )}>Contact Details</h3>

                {/* Phone Number */}
                <div className="space-y-2">
                  <Label className={cn(
                    "text-sm font-medium",
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  )}>
                    Phone Number
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      name="contactNumber"
                      type="number"
                      required
                      maxLength="11"
                      pattern="[0-9]{11}"
                      value={formData.contactNumber}
                      onChange={(e) => {
                        if (e.target.value.length <= 11) {
                          handleInputChange(e);
                        }
                      }}
                      onKeyPress={(e) => {
                        if (!/[0-9]/.test(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      placeholder="Enter 11-digit contact number"
                      className={cn(
                        "pl-9 h-10",
                        isDarkMode 
                          ? "bg-slate-900 border-slate-700" 
                          : "bg-white border-gray-200"
                      )}
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label className={cn(
                    "text-sm font-medium",
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  )}>
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      name="contactEmail"
                      type="email"
                      required
                      value={formData.contactEmail}
                      onChange={handleInputChange}
                      placeholder="Enter your email address"
                      className={cn(
                        "pl-9 h-10",
                        isDarkMode 
                          ? "bg-slate-900 border-slate-700" 
                          : "bg-white border-gray-200"
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            size="lg"
            className={cn(
              "w-full rounded-lg h-12 text-base flex items-center justify-center gap-2",
              "bg-black hover:bg-gray-800 text-white"
            )}
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="mr-2">Submitting...</span>
              </>
            ) : (
              <>
                <Send className="mr-2 h-5 w-5" />
                Submit Request
              </>
            )}
          </Button>
        </motion.div>
      </div>

      {/* Upload Loading Modal */}
      <Dialog open={isUploading} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-[400px] border-none p-0 gap-0">
          <div className={cn(
            "p-6",
            isDarkMode ? "bg-slate-900" : "bg-white"
          )}>
            <div className="flex flex-col items-center justify-center gap-4">
              {/* Loading Animation */}
              <div className="relative w-16 h-16">
                <div className={cn(
                  "absolute inset-0 rounded-full animate-ping opacity-25",
                  isDarkMode ? "bg-blue-500" : "bg-blue-600"
                )} />
                <div className={cn(
                  "absolute inset-[6px] rounded-full animate-pulse",
                  isDarkMode ? "bg-blue-500" : "bg-blue-600"
                )} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white animate-pulse" />
                </div>
              </div>

              {/* Upload Status */}
              <div className="text-center space-y-2">
                <h3 className={cn(
                  "font-semibold text-lg",
                  isDarkMode ? "text-gray-100" : "text-gray-900"
                )}>
                  Uploading Files...
                </h3>
                <p className={cn(
                  "text-sm",
                  isDarkMode ? "text-gray-400" : "text-gray-500"
                )}>
                  Please wait while we upload your files
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full space-y-2">
                <div className="h-2 w-full rounded-full overflow-hidden bg-gray-100 dark:bg-slate-800">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-300",
                      isDarkMode ? "bg-blue-500" : "bg-blue-600"
                    )}
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className={cn(
                  "text-sm text-center font-medium",
                  isDarkMode ? "text-gray-400" : "text-gray-500"
                )}>
                  {uploadProgress}% Complete
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default RequestEvent;
