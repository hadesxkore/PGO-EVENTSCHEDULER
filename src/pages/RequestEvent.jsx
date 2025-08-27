import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "../lib/utils";
import { auth, db } from "../lib/firebase/firebase";
import { doc, getDoc, Timestamp, collection, query, where, getDocs } from "firebase/firestore";
import { uploadFile, formatFileSize } from "../lib/cloudinary";
import useEventStore from "../store/eventStore";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTheme } from "../contexts/ThemeContext";
import { getAllDepartments } from "../lib/firebase/departments";
import { Button } from "../components/ui/button";
import { forwardRef } from "react";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Checkbox } from "../components/ui/checkbox";


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
  const [departments, setDepartments] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [departmentRequirements, setDepartmentRequirements] = useState({});
  const [departmentRequirementNotes, setDepartmentRequirementNotes] = useState({});
  const [showRequirementsModal, setShowRequirementsModal] = useState(false);
  const [currentDepartment, setCurrentDepartment] = useState(null);
  const [newRequirement, setNewRequirement] = useState("");

  // Fetch departments on component mount
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        // Get current user's department
        const currentUser = auth.currentUser;
        if (!currentUser) {
          toast.error("User not authenticated");
          return;
        }

        const userDocRef = doc(db, "users", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (!userDocSnap.exists()) {
          toast.error("User data not found");
          return;
        }

        const userData = userDocSnap.data();
        const userDepartment = userData.department;

        const result = await getAllDepartments();
        if (result.success) {
          // Get user counts for each department and filter out user's own department
          const departmentsWithUsers = await Promise.all(
            result.departments
              .filter(dept => dept.name !== userDepartment) // Filter out user's department
              .map(async (dept) => {
                const usersRef = collection(db, 'users');
                const q = query(usersRef, where('department', '==', dept.name));
                const querySnapshot = await getDocs(q);
                return {
                  ...dept,
                  userCount: querySnapshot.size
                };
              })
          );
          setDepartments(departmentsWithUsers.filter(dept => dept.userCount > 0));
        } else {
          toast.error("Failed to fetch departments");
        }
      } catch (error) {
        console.error('Error fetching departments:', error);
        toast.error("An error occurred while fetching departments");
      }
    };

    fetchDepartments();
  }, []);

  const stripFormatting = (text) => {
    if (!text) return '';
    
    try {
      // Convert mathematical alphanumeric symbols to regular characters
      const normalizeText = (str) => {
        // Mathematical bold
        str = str.replace(/[\uD835][\uDC00-\uDC35]/g, c => String.fromCharCode(c.charCodeAt(1) - 0xDC00 + 0x41));
        // Mathematical italic
        str = str.replace(/[\uD835][\uDC34-\uDC69]/g, c => String.fromCharCode(c.charCodeAt(1) - 0xDC34 + 0x41));
        // Mathematical bold italic
        str = str.replace(/[\uD835][\uDC68-\uDC9D]/g, c => String.fromCharCode(c.charCodeAt(1) - 0xDC68 + 0x41));
        // Mathematical script
        str = str.replace(/[\uD835][\uDC9C-\uDCD1]/g, c => String.fromCharCode(c.charCodeAt(1) - 0xDC9C + 0x41));
        // Other mathematical variants
        str = str.replace(/[\uD835][\uDCD0-\uDD05]/g, c => String.fromCharCode(c.charCodeAt(1) - 0xDCD0 + 0x41));
        
        return str;
      };

      // First normalize any special mathematical characters
      let processedText = normalizeText(text);

      // If the text has HTML, process it
      if (/<[^>]*>/.test(processedText) || /&[^;]+;/.test(processedText)) {
        const temp = document.createElement('div');
        temp.innerHTML = processedText;
        processedText = temp.textContent || temp.innerText;
      }

      // Clean up spaces and trim
      processedText = processedText.replace(/\s+/g, ' ').trim();

      // Convert to regular ASCII characters where possible
      return processedText
        .normalize('NFKD')  // Decompose characters
        .replace(/[\u0300-\u036f]/g, '')  // Remove diacritics
        .replace(/[^\x20-\x7E]/g, c => {  // Replace any remaining non-ASCII with closest ASCII
          const simple = c.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
          return simple.match(/[a-zA-Z0-9\s.,!?-]/) ? simple : c;
        });

    } catch (error) {
      console.error('Error sanitizing text:', error);
      // If all else fails, try basic normalization
      return text.toString()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Get the actual input value, handling both paste and regular input
    let inputValue = value;
    if (e.type === 'paste') {
      e.preventDefault();
      inputValue = e.clipboardData.getData('text/plain');
    }
    
    // Only sanitize the input for basic safety while preserving spaces
    const sanitizedText = inputValue
      .normalize('NFKD')  // Decompose characters
      .replace(/[\u0300-\u036f]/g, '')  // Remove diacritics
      .replace(/[^\x20-\x7E]/g, ' ');  // Replace non-ASCII with space
    
    setFormData(prev => ({
      ...prev,
      [name]: sanitizedText
    }));
  };

  const { submitEventRequest } = useEventStore();

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      // Validate required fields
      const requiredFields = ['title', 'requestor', 'location', 'participants'];
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
      // Format department requirements with notes
      const formattedDepartmentRequirements = selectedDepartments.map(deptId => {
        const requirements = departmentRequirements[deptId] || [];
        return {
          departmentId: deptId,
          departmentName: departments.find(d => d.id === deptId)?.name,
          requirements: requirements.map(req => {
            const note = departmentRequirementNotes[`${deptId}-${req}`];
            return note ? { name: req, note } : req;
          })
        };
      });

      const eventDataWithUser = {
        ...formData,
        date: eventTimestamp,
        departmentRequirements: formattedDepartmentRequirements,
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

      // Submit using Zustand store
      const result = await submitEventRequest(eventDataWithUser);
    
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
                      onPaste={(e) => {
                        // Let the paste happen naturally
                        handleInputChange(e);
                      }}
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

              {/* Location and Number of Participants */}
              <div className="grid grid-cols-2 gap-4">
                {/* Location */}
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

                {/* Number of Participants */}
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

          {/* Tag Departments Card */}
          <div className={cn(
            "rounded-xl p-6 shadow-sm mt-5",
            isDarkMode ? "bg-slate-800" : "bg-white"
          )}>
            <h2 className={cn(
              "text-2xl font-bold mb-2",
              isDarkMode ? "text-gray-100" : "text-gray-900"
            )}>Tag Departments</h2>
            <p className={cn(
              "text-sm mb-6",
              isDarkMode ? "text-gray-400" : "text-gray-500"
            )}>Select departments to notify about this event's requirements and coordinate resources needed.</p>
            
            <div className="space-y-4">
              <div className="space-y-3">
                {departments.map((dept) => (
                  <div key={dept.id} className="flex items-center justify-between group">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id={`dept-${dept.id}`}
                        checked={selectedDepartments.includes(dept.id)}
                                                  onCheckedChange={(checked) => {
                            if (checked) {
                              // When checking, show the modal with any existing requirements
                              setCurrentDepartment(dept.id);
                              // Don't automatically add to selectedDepartments - wait for save
                              setShowRequirementsModal(true);
                            } else {
                              // When unchecking, confirm before removing
                              if (departmentRequirements[dept.id]?.length > 0) {
                                if (window.confirm('Are you sure you want to remove all requirements and notes for this department?')) {
                                  setSelectedDepartments(prev => prev.filter(id => id !== dept.id));
                                  // Clean up requirements and notes
                                  setDepartmentRequirements(prev => {
                                    const newReqs = { ...prev };
                                    delete newReqs[dept.id];
                                    return newReqs;
                                  });
                                  setDepartmentRequirementNotes(prev => {
                                    const newNotes = { ...prev };
                                    Object.keys(newNotes).forEach(key => {
                                      if (key.startsWith(`${dept.id}-`)) {
                                        delete newNotes[key];
                                      }
                                    });
                                    return newNotes;
                                  });
                                } else {
                                  // If user cancels, keep the checkbox checked
                                  e.preventDefault();
                                }
                              } else {
                                // If no requirements, just remove from selection
                                setSelectedDepartments(prev => prev.filter(id => id !== dept.id));
                              }
                            }
                          }}
                        className={cn(
                          "data-[state=checked]:bg-black data-[state=checked]:border-black text-white",
                          isDarkMode ? "border-gray-700" : "border-gray-200"
                        )}
                      />
                      <label
                        htmlFor={`dept-${dept.id}`}
                        className={cn(
                          "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
                          isDarkMode ? "text-gray-200" : "text-gray-900"
                        )}
                      >
                        {dept.name}
                      </label>
                    </div>
                    <Badge variant="secondary" className={cn(
                      "text-xs",
                      isDarkMode ? "bg-slate-700" : "bg-gray-100"
                    )}>
                      {dept.userCount || 0} users
                    </Badge>
                  </div>
                ))}
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

      {/* Department Requirements Modal */}
      <Dialog open={showRequirementsModal} onOpenChange={(open) => {
        if (!open) {
          // Only close if there are no unsaved changes
          if (currentDepartment && departmentRequirements[currentDepartment]?.length > 0) {
            toast.error("Please save your changes before closing");
            return;
          }
          setShowRequirementsModal(false);
        }
      }}>
        <DialogContent className="sm:max-w-[600px] p-0 border-0">
          <div className={cn(
            "p-8 rounded-xl",
            isDarkMode ? "bg-zinc-900" : "bg-white"
          )}>
            <div className="flex flex-col gap-8">
              {/* Modal Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className={cn(
                    "text-2xl font-bold tracking-tight",
                    isDarkMode ? "text-white" : "text-zinc-900"
                  )}>
                    Requirements for {currentDepartment ? departments.find(d => d.id === currentDepartment)?.name : ''}
                  </h3>
                  <p className={cn(
                    "text-sm mt-2",
                    isDarkMode ? "text-zinc-400" : "text-zinc-500"
                  )}>
                    Add specific requirements and notes for this department.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    if (currentDepartment && departmentRequirements[currentDepartment]?.length > 0) {
                      // Save the current state
                      const savedRequirements = departmentRequirements[currentDepartment];
                      const savedNotes = {};
                      savedRequirements.forEach(req => {
                        const noteKey = `${currentDepartment}-${req}`;
                        if (departmentRequirementNotes[noteKey]) {
                          savedNotes[noteKey] = departmentRequirementNotes[noteKey];
                        }
                      });
                      
                      // Update the selected departments if not already selected
                      if (!selectedDepartments.includes(currentDepartment)) {
                        setSelectedDepartments(prev => [...prev, currentDepartment]);
                      }
                      
                      toast.success("Requirements and notes saved successfully");
                      setShowRequirementsModal(false);
                    } else {
                      toast.error("Please add at least one requirement before saving");
                    }
                  }}
                  className={cn(
                    "px-6 h-10 rounded-lg font-medium transition-colors",
                    isDarkMode 
                      ? "bg-white text-black hover:bg-zinc-200" 
                      : "bg-black text-white hover:bg-zinc-800"
                  )}
                >
                  Save Changes
                </Button>
              </div>

              {/* Main Requirements Card */}
              <div className={cn(
                "rounded-xl border",
                isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"
              )}>
                {/* Card Header with Input */}
                <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center gap-3">
                    <Input
                      type="text"
                      placeholder="Add new requirement"
                      value={newRequirement}
                      onChange={(e) => setNewRequirement(e.target.value)}
                      className={cn(
                        "flex-1 h-11 px-4 text-base rounded-lg transition-colors",
                        isDarkMode 
                          ? "bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-zinc-600" 
                          : "bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-300"
                      )}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newRequirement.trim() && currentDepartment) {
                          setDepartmentRequirements(prev => ({
                            ...prev,
                            [currentDepartment]: [...(prev[currentDepartment] || []), newRequirement.trim()]
                          }));
                          setNewRequirement('');
                        }
                      }}
                    />
                    <Button
                      type="button"
                      className={cn(
                        "h-11 px-6 rounded-lg font-medium transition-colors",
                        isDarkMode 
                          ? "bg-white text-black hover:bg-zinc-200" 
                          : "bg-black text-white hover:bg-zinc-800"
                      )}
                      onClick={() => {
                        if (newRequirement.trim() && currentDepartment) {
                          setDepartmentRequirements(prev => ({
                            ...prev,
                            [currentDepartment]: [...(prev[currentDepartment] || []), newRequirement.trim()]
                          }));
                          setNewRequirement('');
                        }
                      }}
                    >
                      Add Requirement
                    </Button>
                  </div>
                </div>

                {/* Requirements List */}
                <div className="p-6">
                  <div className="space-y-3">
                    {currentDepartment && (departmentRequirements[currentDepartment] || []).length > 0 ? (
                      departmentRequirements[currentDepartment].map((req, index) => (
                        <div 
                          key={index} 
                          className={cn(
                            "group flex items-center justify-between p-4 rounded-lg border transition-all",
                            isDarkMode 
                              ? "bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800" 
                              : "bg-zinc-50/50 border-zinc-200 hover:bg-zinc-50"
                          )}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <span className={cn(
                              "text-sm font-medium",
                              isDarkMode ? "text-zinc-100" : "text-zinc-700"
                            )}>{req}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={cn(
                                    "h-9 px-2.5 rounded-lg transition-colors",
                                    departmentRequirementNotes[`${currentDepartment}-${req}`] 
                                      ? isDarkMode ? "bg-blue-500/10 text-blue-500" : "bg-blue-50 text-blue-600"
                                      : isDarkMode ? "text-zinc-400 hover:text-white hover:bg-zinc-700" : "text-zinc-600 hover:text-black hover:bg-zinc-100"
                                  )}
                                >
                                  <FileText className="h-4 w-4 mr-1.5" />
                                  <span className="text-xs font-medium">Notes</span>
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent 
                                className={cn(
                                  "w-80 p-0 rounded-xl border shadow-lg",
                                  isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"
                                )} 
                                align="end"
                              >
                                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
                                  <h4 className={cn(
                                    "text-sm font-semibold",
                                    isDarkMode ? "text-white" : "text-zinc-900"
                                  )}>Add Note</h4>
                                </div>
                                <div className="p-4">
                                  <textarea
                                    className={cn(
                                      "w-full min-h-[120px] rounded-lg p-3 text-sm resize-none transition-colors",
                                      isDarkMode 
                                        ? "bg-zinc-800 text-zinc-100 placeholder:text-zinc-500 border-zinc-700 focus:border-zinc-600" 
                                        : "bg-zinc-50 text-zinc-900 placeholder:text-zinc-400 border-zinc-200 focus:border-zinc-300"
                                    )}
                                    placeholder="Add notes for this requirement..."
                                    value={departmentRequirementNotes[`${currentDepartment}-${req}`] || ''}
                                    onChange={(e) => {
                                      setDepartmentRequirementNotes(prev => ({
                                        ...prev,
                                        [`${currentDepartment}-${req}`]: e.target.value
                                      }));
                                    }}
                                  />
                                </div>
                              </PopoverContent>
                            </Popover>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={cn(
                                "h-9 w-9 rounded-lg transition-colors",
                                isDarkMode 
                                  ? "text-zinc-400 hover:text-white hover:bg-zinc-700" 
                                  : "text-zinc-600 hover:text-black hover:bg-zinc-100"
                              )}
                              onClick={() => {
                                setDepartmentRequirements(prev => ({
                                  ...prev,
                                  [currentDepartment]: prev[currentDepartment].filter((_, i) => i !== index)
                                }));
                                // Clean up notes
                                const noteKey = `${currentDepartment}-${req}`;
                                setDepartmentRequirementNotes(prev => {
                                  const newNotes = { ...prev };
                                  delete newNotes[noteKey];
                                  return newNotes;
                                });
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className={cn(
                        "text-center py-12 rounded-lg border-2 border-dashed",
                        isDarkMode 
                          ? "border-zinc-800 text-zinc-400" 
                          : "border-zinc-200 text-zinc-500"
                      )}>
                        <p className="text-sm font-medium">No requirements added yet</p>
                        <p className="text-xs mt-1">Add your first requirement above</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};


export default RequestEvent;
