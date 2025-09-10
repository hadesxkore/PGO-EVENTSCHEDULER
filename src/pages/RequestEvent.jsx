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
  DialogPortal,
  DialogOverlay
} from "../components/ui/dialog";

import {
  CalendarIcon,
  Clock,
  Users,
  MapPin,
  FileText,
  Send,
  Building2,
  Plus,
  User,
  X,
  ChevronDown,
  Phone,
  Mail,
} from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "../components/ui/calendar";
import { DatePicker } from "../components/DatePicker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";



const RequestEvent = () => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();

  // Form state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    requestor: "",
    location: "",
    participants: "",
    vip: "",
    vvip: "",
    contactNumber: "",
    contactEmail: "",
    classifications: "",
  });

  // Process flow state
  const [completedSteps, setCompletedSteps] = useState({
    eventDetails: false,
    attachments: false,
    tagDepartments: false,
    requirements: false,
    schedule: false,
    readyToSubmit: false
  });

  // Date and time state
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [startTime, setStartTime] = useState("10:30");
  const [endTime, setEndTime] = useState("11:30");
  const [isStartCalendarOpen, setIsStartCalendarOpen] = useState(false);
  const [isEndCalendarOpen, setIsEndCalendarOpen] = useState(false);

  // Attachments state
  const [attachments, setAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [skipAttachments, setSkipAttachments] = useState(false);

  // Departments and requirements state
  const [departments, setDepartments] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [departmentRequirements, setDepartmentRequirements] = useState({});
  const [departmentRequirementNotes, setDepartmentRequirementNotes] = useState({});
  const [showRequirementsModal, setShowRequirementsModal] = useState(false);
  const [showConfirmCloseModal, setShowConfirmCloseModal] = useState(false);
  const [currentDepartment, setCurrentDepartment] = useState(null);
  const [newRequirement, setNewRequirement] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Location suggestions
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [filteredLocations, setFilteredLocations] = useState([]);
  const [locationSelectedFromDropdown, setLocationSelectedFromDropdown] = useState(false);

  // Location booking modal
  const [showLocationBookingModal, setShowLocationBookingModal] = useState(false);
  const [preferredStartDate, setPreferredStartDate] = useState(new Date());
  const [preferredEndDate, setPreferredEndDate] = useState(new Date());
  const [preferredStartTime, setPreferredStartTime] = useState("10:30");
  const [preferredEndTime, setPreferredEndTime] = useState("11:30");
  const [isPreferredStartCalendarOpen, setIsPreferredStartCalendarOpen] = useState(false);
  const [isPreferredEndCalendarOpen, setIsPreferredEndCalendarOpen] = useState(false);
  const [existingBookings, setExistingBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  const defaultLocations = [
    "Atrium",
    "Grand Lobby Entrance",
    "Main Entrance Lobby",
    "Main Entrance Leasable Area",
    "4th Flr. Conference Room 1",
    "4th Flr. Conference Room 2",
    "4th Flr. Conference Room 3",
    "5th Flr. Training Room 1 (BAC)",
    "5th Flr. Training Room 2",
    "6th Flr. Meeting Room 7",
    "6th Flr. DPOD",
    "Bataan Peoples Center",
    "Capitol Quadrangle",
    "1BOSSCO"
  ];

  // Helper function to determine if a step is currently active
  const isStepActive = (step) => {
    const steps = ['eventDetails', 'attachments', 'tagDepartments', 'requirements', 'schedule'];
    const currentStepIndex = steps.findIndex(s => !completedSteps[s]);
    const stepIndex = steps.indexOf(step);
    return stepIndex === currentStepIndex;
  };

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

  // Check form completion for each section

  useEffect(() => {
    // Check Event Details completion
    const isEventDetailsComplete = 
      formData.title && 
      formData.requestor && 
      formData.location && 
      formData.participants &&
      formData.vip &&
      formData.classifications;

    // Check Attachments completion
    const isAttachmentsComplete = skipAttachments || (attachments && attachments.length > 0);

    // Check Tag Departments completion - requires event details and either attachments or skip attachments
    const isTagDepartmentsComplete = selectedDepartments.length > 0 && isEventDetailsComplete && isAttachmentsComplete;

    // Check Requirements completion
    const isRequirementsComplete = selectedDepartments.some(deptId => 
      departmentRequirements[deptId] && departmentRequirements[deptId].length > 0
    ) && isTagDepartmentsComplete;

    // Check Schedule completion
    const isScheduleComplete = 
      startDate && 
      endDate && 
      startTime && 
      endTime && 
      formData.contactNumber && 
      formData.contactEmail;

    const isReadyToSubmit = isEventDetailsComplete && 
      isAttachmentsComplete && 
      isTagDepartmentsComplete && 
      isRequirementsComplete && 
      isScheduleComplete;

    setCompletedSteps({
      eventDetails: isEventDetailsComplete,
      attachments: isAttachmentsComplete,
      tagDepartments: isTagDepartmentsComplete,
      requirements: isRequirementsComplete,
      schedule: isScheduleComplete,
      readyToSubmit: isReadyToSubmit
    });
  }, [formData, selectedDepartments, startDate, endDate, startTime, endTime, attachments, departmentRequirements, skipAttachments]);

  // Load preferred dates when schedule step becomes active
  useEffect(() => {
    if (isStepActive('schedule')) {
      const savedDates = localStorage.getItem('preferredEventDates');
      if (savedDates) {
        try {
          const preferredDates = JSON.parse(savedDates);
          if (preferredDates.location === formData.location) {
            setStartDate(new Date(preferredDates.startDate));
            setEndDate(new Date(preferredDates.endDate));
            setStartTime(preferredDates.startTime);
            setEndTime(preferredDates.endTime);
          }
        } catch (error) {
          console.error('Error loading preferred dates:', error);
        }
      }
    }
  }, [isStepActive('schedule'), formData.location]);

  // Debug effect to monitor bookings state changes
  useEffect(() => {
    if (existingBookings.length > 0) {
      console.log('📊 Loaded bookings:', existingBookings.length, 'bookings for', formData.location);
      console.log('📊 Bookings data:', existingBookings.map(b => ({
        title: b.title,
        requestor: b.requestor,
        startDate: new Date(b.startDate).toDateString(),
        endDate: new Date(b.endDate).toDateString()
      })));
    }
  }, [existingBookings, formData.location]);

  // Effect to ensure modal has proper data when it opens (removed to prevent infinite loops)

  // Test booking removed - using real data from database


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

    // Handle location filtering
    if (name === 'location') {
      if (sanitizedText.length > 0) {
        const filtered = defaultLocations.filter(location =>
          location.toLowerCase().includes(sanitizedText.toLowerCase())
        );
        setFilteredLocations(filtered);
        setShowLocationDropdown(true);
      } else {
        setShowLocationDropdown(false);
        setFilteredLocations([]);
      }
    }
  };

  // Store all bookings by location
  const [allBookings, setAllBookings] = useState({});

  // Load all bookings when the page loads
  useEffect(() => {
    const loadInitialBookings = async () => {
      setLoadingBookings(true);
      try {
        await fetchAllBookings();
      } catch (error) {
        console.error('Error loading initial bookings:', error);
      } finally {
        setLoadingBookings(false);
      }
    };
    
    loadInitialBookings();
  }, []);

  // Function to fetch all existing bookings
  const fetchAllBookings = async () => {
    try {
      const eventsRef = collection(db, 'eventRequests');
      const q = query(
        eventsRef,
        where('status', 'in', ['pending', 'approved'])
      );
      
      const querySnapshot = await getDocs(q);
      const bookingsByLocation = {};
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('📄 Processing document:', doc.id, data);
        
        if (data.location && data.startDate && data.endDate) {
          // Convert Firestore Timestamps to dates
          let startDate, endDate;
          
          if (data.startDate.toDate) {
            startDate = data.startDate.toDate();
            endDate = data.endDate.toDate();
          } else {
            startDate = new Date(data.startDate);
            endDate = new Date(data.endDate);
          }
          
          console.log('📅 Converted dates:', {
            start: startDate.toISOString(),
            end: endDate.toISOString()
          });
          
          const booking = {
            id: doc.id,
            title: data.title,
            requestor: data.requestor || data.userName,
            startDate: startDate, // Store as full Date object
            endDate: endDate, // Store as full Date object
            startTime: data.startTime || '10:00',
            endTime: data.endTime || '11:00'
          };
          
          console.log('📝 Created booking:', booking);
          
          // Group bookings by location
          if (!bookingsByLocation[data.location]) {
            bookingsByLocation[data.location] = [];
          }
          bookingsByLocation[data.location].push(booking);
        }
      });
      
      console.log('📚 All bookings by location:', bookingsByLocation);
      setAllBookings(bookingsByLocation);
      return bookingsByLocation;
    } catch (error) {
      console.error('Error fetching all bookings:', error);
      return {};
    }
  };

  // Function to get bookings for a specific location
  const fetchExistingBookings = async (location) => {
    // Return cached bookings if available
    if (allBookings[location]) {
      return allBookings[location];
    }
    
    // If not cached, fetch all bookings again
    const bookings = await fetchAllBookings();
    return bookings[location] || [];
  };

  const handleLocationSelect = async (location) => {
    console.log('🎯 Location selected:', location);
    
    setFormData(prev => ({
      ...prev,
      location: location
    }));
    setShowLocationDropdown(false);
    setFilteredLocations([]);
    setLocationSelectedFromDropdown(true);
    
    // Get bookings from cache first
    const cachedBookings = allBookings[location] || [];
    console.log('📚 Cached bookings:', cachedBookings);
    
    // Set cached bookings immediately
    setExistingBookings(cachedBookings);
    
    // Show modal
    setShowLocationBookingModal(true);
    
    // Refresh bookings in background
    setLoadingBookings(true);
    try {
      // Fetch fresh bookings
      const freshBookings = await fetchExistingBookings(location);
      console.log('📚 Fresh bookings:', freshBookings);
      
      // Update state with fresh data
      setExistingBookings(freshBookings);
    } catch (error) {
      console.error('Error refreshing bookings:', error);
      toast.error('Error refreshing booking data');
    } finally {
      setLoadingBookings(false);
    }
    
    // Reset location selection flag after a delay
    setTimeout(() => {
      setLocationSelectedFromDropdown(false);
    }, 2000);
  };

  // Function to check if a date is booked
  const isDateBooked = async (date) => {
    if (!date || !formData.location) return false;

    try {
      // Convert check date to start of day
      const checkDate = new Date(date);
      checkDate.setHours(0, 0, 0, 0);

      // Query Firestore directly for conflicts
      const eventsRef = collection(db, 'eventRequests');
      const q = query(
        eventsRef,
        where('location', '==', formData.location),
        where('status', 'in', ['pending', 'approved'])
      );

      const querySnapshot = await getDocs(q);
      const conflicts = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.startDate && data.endDate) {
          // Convert booking dates to YYYY-MM-DD format
          const startDate = data.startDate.toDate().toISOString().split('T')[0];
          const endDate = data.endDate.toDate().toISOString().split('T')[0];

          // Check if date falls within range
          const checkDateStr = checkDate.toISOString().split('T')[0];
          if (checkDateStr >= startDate && checkDateStr <= endDate) {
            conflicts.push({
              title: data.title,
              requestor: data.requestor,
              startDate: startDate,
              endDate: endDate
            });
          }
        }
      });

      // Update state with conflicts for display
      if (conflicts.length > 0) {
        console.log('🚫 Found conflicts:', conflicts);
        setExistingBookings(conflicts);
        return true;
      }

      console.log('✅ No conflicts found for date:', checkDate);
      return false;
    } catch (error) {
      console.error('Error checking date conflicts:', error);
      return false;
    }
  };

  // Function to get booking details for a specific date
  const getBookingDetails = (date) => {
    return existingBookings.filter(booking => {
      // Handle different date formats from Firestore
      let bookingStart, bookingEnd;
      
      if (booking.startDate && booking.startDate.toDate) {
        bookingStart = booking.startDate.toDate();
      } else if (booking.startDate) {
        bookingStart = new Date(booking.startDate);
      } else {
        return false;
      }
      
      if (booking.endDate && booking.endDate.toDate) {
        bookingEnd = booking.endDate.toDate();
      } else if (booking.endDate) {
        bookingEnd = new Date(booking.endDate);
      } else {
        return false;
      }
      
      bookingStart.setHours(0, 0, 0, 0);
      bookingEnd.setHours(23, 59, 59, 999);
      const checkDate = new Date(date);
      checkDate.setHours(0, 0, 0, 0);
      return checkDate >= bookingStart && checkDate <= bookingEnd;
    });
  };

  const handlePreferredDatesSave = async () => {
    // Check for conflicts before saving
    const [startConflict, endConflict] = await Promise.all([
      isDateBooked(preferredStartDate),
      isDateBooked(preferredEndDate)
    ]);
    
    if (startConflict || endConflict) {
      toast.error("Selected dates conflict with existing bookings. Please choose different dates.");
      return;
    }
    
    // Save to localStorage
    const preferredDates = {
      location: formData.location,
      startDate: preferredStartDate,
      endDate: preferredEndDate,
      startTime: preferredStartTime,
      endTime: preferredEndTime
    };
    
    localStorage.setItem('preferredEventDates', JSON.stringify(preferredDates));
    
    // Update schedule card if it's active
    if (isStepActive('schedule')) {
      setStartDate(preferredStartDate);
      setEndDate(preferredEndDate);
      setStartTime(preferredStartTime);
      setEndTime(preferredEndTime);
    }
    
    setShowLocationBookingModal(false);
    toast.success("Preferred dates saved! They will be used when you reach the schedule step.");
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

      // Combine start date and time
      const [startHours, startMinutes] = startTime.split(':');
      const startEventDate = new Date(startDate);
      startEventDate.setHours(parseInt(startHours), parseInt(startMinutes));
      const startTimestamp = Timestamp.fromDate(startEventDate);

      // Combine end date and time
      const [endHours, endMinutes] = endTime.split(':');
      const endEventDate = new Date(endDate);
      endEventDate.setHours(parseInt(endHours), parseInt(endMinutes));
      const endTimestamp = Timestamp.fromDate(endEventDate);

      // Validate that end date/time is after start date/time
      if (endEventDate <= startEventDate) {
        toast.error("End date/time must be after start date/time");
        return;
      }

      // Create event request data
      // Format department requirements with notes
      const formattedDepartmentRequirements = selectedDepartments.map(deptId => {
        const requirements = departmentRequirements[deptId] || [];
        return {
          departmentId: deptId,
          departmentName: departments.find(d => d.id === deptId)?.name,
          requirements: requirements.map(req => {
            const note = departmentRequirementNotes[`${deptId}-${req}`];
            return note ? { name: req, note } : { name: req };
          })
        };
      });

      const eventDataWithUser = {
        ...formData,
        startDate: startTimestamp,
        endDate: endTimestamp,
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
      className="max-w-6xl mx-auto px-6 pt-2 pb-6"
    >
      {/* Header */}
      <motion.div variants={item} className="mb-8">
        <h1 className={cn(
          "text-3xl font-bold",
          isDarkMode ? "text-white" : "text-gray-900"
        )}>Request Event</h1>
        <p className={cn(
          "text-base mt-1 mb-6",
          isDarkMode ? "text-gray-400" : "text-gray-500"
        )}>Create a new event request for approval.</p>

        {/* Process Flow */}
        <div className="relative flex flex-col sm:flex-row items-center sm:items-center justify-between max-w-4xl mx-auto px-4 gap-4 sm:gap-0">
          {/* Event Details Step */}
          <div className="flex items-center sm:flex-col sm:items-center relative z-10">
            <div className={cn(
              "w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center sm:mb-1.5 transition-colors duration-200",
              completedSteps.eventDetails
                ? "bg-black"
                : isDarkMode ? "bg-zinc-800" : "bg-gray-100"
            )}>
              <FileText className={cn(
                "w-3.5 h-3.5 sm:w-4 sm:h-4",
                completedSteps.eventDetails
                  ? "text-white"
                  : isDarkMode ? "text-gray-300" : "text-gray-600"
              )} />
            </div>
            <span className={cn(
              "text-[10px] sm:text-xs font-medium ml-2 sm:ml-0",
              isDarkMode ? "text-gray-300" : "text-gray-600"
            )}>Event Details</span>
          </div>

          {/* Connecting Line 1 */}
          <div className="hidden sm:block flex-1 h-[1px] relative -mx-1">
            <div className={cn(
              "absolute inset-0",
              isDarkMode ? "bg-zinc-700" : "bg-gray-200"
            )} />
            <div className={cn(
              "absolute inset-0 transition-all duration-200",
              completedSteps.eventDetails ? "bg-black" : "w-0"
            )} />
          </div>

          {/* Attachments Step */}
          <div className="flex flex-col items-center relative z-10">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center mb-1.5 transition-colors duration-200",
              completedSteps.attachments
                ? "bg-black"
                : isDarkMode ? "bg-zinc-800" : "bg-gray-100"
            )}>
              <FileText className={cn(
                "w-3.5 h-3.5 sm:w-4 sm:h-4",
                completedSteps.attachments
                  ? "text-white"
                  : isDarkMode ? "text-gray-300" : "text-gray-600"
              )} />
            </div>
            <span className={cn(
              "text-xs font-medium",
              isDarkMode ? "text-gray-300" : "text-gray-600"
            )}>Attachments</span>
          </div>

          {/* Connecting Line 2 */}
          <div className="flex-1 h-[1px] relative -mx-1">
            <div className={cn(
              "absolute inset-0",
              isDarkMode ? "bg-zinc-700" : "bg-gray-200"
            )} />
            <div className={cn(
              "absolute inset-0 transition-all duration-200",
              (completedSteps.eventDetails && completedSteps.attachments) ? "bg-black" : "w-0"
            )} />
          </div>

          {/* Tag Departments Step */}
          <div className="flex flex-col items-center relative z-10">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center mb-1.5 transition-colors duration-200",
              completedSteps.tagDepartments
                ? "bg-black"
                : (!completedSteps.eventDetails || !completedSteps.attachments)
                  ? isDarkMode ? "bg-zinc-700" : "bg-gray-200"
                  : isDarkMode ? "bg-zinc-800" : "bg-gray-100"
            )}>
              <Building2 className={cn(
                "w-4 h-4",
                completedSteps.tagDepartments
                  ? "text-white"
                  : (!completedSteps.eventDetails || !completedSteps.attachments)
                    ? isDarkMode ? "text-gray-500" : "text-gray-400"
                    : isDarkMode ? "text-gray-300" : "text-gray-600"
              )} />
            </div>
            <span className={cn(
              "text-xs font-medium",
              (!completedSteps.eventDetails || !completedSteps.attachments)
                ? isDarkMode ? "text-gray-500" : "text-gray-400"
                : isDarkMode ? "text-gray-300" : "text-gray-600"
            )}>Tag Departments</span>
          </div>

          {/* Connecting Line 3 */}
          <div className="flex-1 h-[1px] relative -mx-1">
            <div className={cn(
              "absolute inset-0",
              isDarkMode ? "bg-zinc-700" : "bg-gray-200"
            )} />
            <div className={cn(
              "absolute inset-0 transition-all duration-200",
              (completedSteps.eventDetails && completedSteps.attachments && completedSteps.tagDepartments) ? "bg-black" : "w-0"
            )} />
          </div>

          {/* Requirements Step */}
          <div className="flex flex-col items-center relative z-10">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center mb-1.5 transition-colors duration-200",
              completedSteps.requirements
                ? "bg-black"
                : (!completedSteps.eventDetails || !completedSteps.attachments || !completedSteps.tagDepartments)
                  ? isDarkMode ? "bg-zinc-700" : "bg-gray-200"
                  : isDarkMode ? "bg-zinc-800" : "bg-gray-100"
            )}>
              <FileText className={cn(
                "w-3.5 h-3.5 sm:w-4 sm:h-4",
                completedSteps.requirements
                  ? "text-white"
                  : (!completedSteps.eventDetails || !completedSteps.attachments || !completedSteps.tagDepartments)
                    ? isDarkMode ? "text-gray-500" : "text-gray-400"
                    : isDarkMode ? "text-gray-300" : "text-gray-600"
              )} />
            </div>
            <span className={cn(
              "text-xs font-medium",
              (!completedSteps.eventDetails || !completedSteps.attachments || !completedSteps.tagDepartments)
                ? isDarkMode ? "text-gray-500" : "text-gray-400"
                : isDarkMode ? "text-gray-300" : "text-gray-600"
            )}>Requirements</span>
          </div>

          {/* Connecting Line 4 */}
          <div className="flex-1 h-[1px] relative -mx-1">
            <div className={cn(
              "absolute inset-0",
              isDarkMode ? "bg-zinc-700" : "bg-gray-200"
            )} />
            <div className={cn(
              "absolute inset-0 transition-all duration-200",
              (completedSteps.eventDetails && completedSteps.attachments && completedSteps.tagDepartments && completedSteps.requirements) ? "bg-black" : "w-0"
            )} />
          </div>

          {/* Schedule Step */}
          <div className="flex flex-col items-center relative z-10">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center mb-1.5 transition-colors duration-200",
              completedSteps.schedule
                ? "bg-black"
                : (!completedSteps.eventDetails || !completedSteps.attachments || !completedSteps.tagDepartments || !completedSteps.requirements)
                  ? isDarkMode ? "bg-zinc-700" : "bg-gray-200"
                  : isDarkMode ? "bg-zinc-800" : "bg-gray-100"
            )}>
              <CalendarIcon className={cn(
                "w-4 h-4",
                completedSteps.schedule
                  ? "text-white"
                  : (!completedSteps.eventDetails || !completedSteps.attachments || !completedSteps.tagDepartments || !completedSteps.requirements)
                    ? isDarkMode ? "text-gray-500" : "text-gray-400"
                    : isDarkMode ? "text-gray-300" : "text-gray-600"
              )} />
            </div>
            <span className={cn(
              "text-xs font-medium",
              (!completedSteps.eventDetails || !completedSteps.attachments || !completedSteps.tagDepartments || !completedSteps.requirements)
                ? isDarkMode ? "text-gray-500" : "text-gray-400"
                : isDarkMode ? "text-gray-300" : "text-gray-600"
            )}>Schedule</span>
          </div>

          {/* Connecting Line 5 */}
          <div className="flex-1 h-[1px] relative -mx-1">
            <div className={cn(
              "absolute inset-0",
              isDarkMode ? "bg-zinc-700" : "bg-gray-200"
            )} />
            <div className={cn(
              "absolute inset-0 transition-all duration-200",
              (completedSteps.eventDetails && completedSteps.attachments && completedSteps.tagDepartments && completedSteps.requirements && completedSteps.schedule) ? "bg-black" : "w-0"
            )} />
          </div>

          {/* Ready to Submit Step */}
          <div className="flex flex-col items-center relative z-10">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center mb-1.5 transition-colors duration-200",
              completedSteps.readyToSubmit
                ? "bg-black"
                : (!completedSteps.eventDetails || !completedSteps.attachments || !completedSteps.tagDepartments || !completedSteps.requirements || !completedSteps.schedule)
                  ? isDarkMode ? "bg-zinc-700" : "bg-gray-200"
                  : isDarkMode ? "bg-zinc-800" : "bg-gray-100"
            )}>
              <Send className={cn(
                "w-4 h-4",
                completedSteps.readyToSubmit
                  ? "text-white"
                  : (!completedSteps.eventDetails || !completedSteps.attachments || !completedSteps.tagDepartments || !completedSteps.requirements || !completedSteps.schedule)
                    ? isDarkMode ? "text-gray-500" : "text-gray-400"
                    : isDarkMode ? "text-gray-300" : "text-gray-600"
              )} />
            </div>
            <span className={cn(
              "text-xs font-medium",
              (!completedSteps.eventDetails || !completedSteps.attachments || !completedSteps.tagDepartments || !completedSteps.requirements || !completedSteps.schedule)
                ? isDarkMode ? "text-gray-500" : "text-gray-400"
                : isDarkMode ? "text-gray-300" : "text-gray-600"
            )}>Ready to Submit</span>
          </div>
        </div>
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
            <div className="flex items-center gap-3 mb-6">
              <Badge variant="outline" className={cn(
                "px-3 py-1 rounded-full text-sm font-semibold",
                isDarkMode ? "border-gray-700 text-gray-300" : "border-gray-200 text-gray-600"
              )}>
                Step 1
              </Badge>
              <h2 className={cn(
                "text-2xl font-bold",
                isDarkMode ? "text-gray-100" : "text-gray-900"
              )}>Event Details</h2>
            </div>
            
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
                      autoComplete={isStepActive('eventDetails') ? "on" : "off"}
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
                      autoComplete={isStepActive('eventDetails') ? "on" : "off"}
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
              <div className="grid grid-cols-4 gap-4">
                {/* Location */}
                <div className="col-span-1 space-y-2">
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
                      onFocus={() => {
                        if (formData.location.length > 0) {
                          const filtered = defaultLocations.filter(location =>
                            location.toLowerCase().includes(formData.location.toLowerCase())
                          );
                          setFilteredLocations(filtered);
                          setShowLocationDropdown(true);
                        }
                      }}
                      onBlur={() => {
                        // Delay hiding to allow click on dropdown items
                        setTimeout(async () => {
                          setShowLocationDropdown(false);
                          
                          // Show modal if location has text and wasn't selected from dropdown
                          const isPartialText = formData.location.length < 3; // Likely partial typing
                          
                          if (formData.location.trim().length > 0 && !locationSelectedFromDropdown && !isPartialText) {
                            // Reset bookings state and show loading
                            setExistingBookings([]);
                            setLoadingBookings(true);
                            
                            try {
                              // Fetch and wait for bookings data
                              const bookings = await fetchExistingBookings(formData.location);
                              
                              // Set bookings data and show modal
                              setExistingBookings(bookings);
                              setShowLocationBookingModal(true);
                            } catch (error) {
                              console.error('Error loading bookings:', error);
                              toast.error('Error loading booking data. Please try again.');
                            } finally {
                              setLoadingBookings(false);
                            }
                          }
                        }, 200);
                      }}
                      autoComplete={isStepActive('eventDetails') ? "on" : "off"}
                      placeholder="Event location"
                      className={cn(
                        "pl-12 rounded-lg h-12 text-base",
                        isDarkMode 
                          ? "bg-slate-900 border-slate-700" 
                          : "bg-white border-gray-200"
                      )}
                    />
                    
                    {/* Location Dropdown */}
                    {showLocationDropdown && filteredLocations.length > 0 && (
                      <div className={cn(
                        "absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border shadow-lg",
                        "max-h-60 overflow-y-auto",
                        isDarkMode 
                          ? "bg-slate-800 border-slate-700" 
                          : "bg-white border-gray-200"
                      )}>
                        {filteredLocations.map((location, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleLocationSelect(location)}
                            className={cn(
                              "w-full px-4 py-3 text-left text-sm transition-colors",
                              "hover:bg-gray-100 dark:hover:bg-slate-700",
                              "first:rounded-t-lg last:rounded-b-lg",
                              isDarkMode ? "text-gray-200" : "text-gray-900"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-gray-400" />
                              <span>{location}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* No. of Participants */}
                <div className="space-y-2">
                  <Label className={cn("text-sm font-semibold", isDarkMode ? "text-gray-300" : "text-gray-700")}>
                    No. of Participants
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
                      autoComplete={isStepActive('eventDetails') ? "on" : "off"}
                      placeholder="Expected attendees"
                      className={cn(
                        "pl-12 rounded-lg h-12 text-base",
                        isDarkMode 
                          ? "bg-slate-900 border-slate-700" 
                          : "bg-white border-gray-200"
                      )}
                    />
                  </div>
                </div>

                {/* VIP */}
                <div className="space-y-2">
                  <Label className={cn("text-sm font-semibold", isDarkMode ? "text-gray-300" : "text-gray-700")}>
                    Number of VIP
                  </Label>
                  <div className="relative">
                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      name="vip"
                      value={formData.vip}
                      onChange={handleInputChange}
                      type="number"
                      min="0"
                      autoComplete={isStepActive('eventDetails') ? "on" : "off"}
                      placeholder="Number of VIPs"
                      className={cn(
                        "pl-12 rounded-lg h-12 text-base",
                        isDarkMode 
                          ? "bg-slate-900 border-slate-700" 
                          : "bg-white border-gray-200"
                      )}
                    />
                  </div>
                </div>

                {/* VVIP */}
                <div className="space-y-2">
                  <Label className={cn("text-sm font-semibold", isDarkMode ? "text-gray-300" : "text-gray-700")}>
                    Number of VVIP
                  </Label>
                  <div className="relative">
                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      name="vvip"
                      value={formData.vvip}
                      onChange={handleInputChange}
                      type="number"
                      min="0"
                      autoComplete={isStepActive('eventDetails') ? "on" : "off"}
                      placeholder="Number of VVIPs"
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



              {/* Description */}
              <div className="space-y-2">
                <Label className={cn("text-sm font-semibold", isDarkMode ? "text-gray-300" : "text-gray-700")}>
                  Description
                </Label>
                <textarea
                  name="classifications"
                  value={formData.classifications}
                  onChange={handleInputChange}
                  placeholder="Enter event description..."
                  className={cn(
                    "w-full min-h-[100px] rounded-lg p-3 text-base resize-none border-2",
                    isDarkMode 
                      ? "bg-slate-900 border-gray-600 text-white placeholder:text-zinc-500" 
                      : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                  )}
                />
              </div>

              {/* Attachments */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className={cn("text-sm font-semibold", isDarkMode ? "text-gray-300" : "text-gray-700")}>
                    Attachments
                  </Label>
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="skip-attachments"
                      checked={skipAttachments}
                      onCheckedChange={(checked) => {
                        setSkipAttachments(checked);
                        setCompletedSteps(prev => ({
                          ...prev,
                          attachments: checked
                        }));
                      }}
                      className={cn(
                        isDarkMode ? "border-gray-700" : "border-gray-200"
                      )}
                    />
                    <Label 
                      htmlFor="skip-attachments" 
                      className={cn(
                        "text-sm cursor-pointer",
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      )}
                    >
                      No attachments needed
                    </Label>
                  </div>
                </div>
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

                <div className="flex items-start gap-4">
                  {/* Upload Button */}
                  <div className="shrink-0">
                    <Button
                      variant="outline"
                      className={cn(
                        "h-9 px-4 flex items-center gap-2",
                        isDarkMode 
                          ? "border-gray-600 hover:bg-slate-800" 
                          : "border-gray-300 hover:bg-gray-100"
                      )}
                      onClick={() => document.getElementById('file-upload').click()}
                    >
                      <FileText className="h-4 w-4" />
                      <span>Upload Files</span>
                    </Button>
                    <p className={cn(
                      "text-[11px] mt-1",
                      isDarkMode ? "text-gray-500" : "text-gray-400"
                    )}>
                      PDF, DOC, JPG, PNG (max 10MB)
                    </p>
                  </div>

                  {/* Uploaded Files List */}
                  <div className="flex-1 min-w-0">
                    {attachments.length > 0 ? (
                      <div className={cn(
                        "rounded-lg border divide-y",
                        isDarkMode ? "border-gray-600 divide-gray-600" : "border-gray-300 divide-gray-300"
                      )}>
                        {attachments.map((file, index) => (
                          <div
                            key={index}
                            className={cn(
                              "flex items-center justify-between py-1 px-3",
                              isDarkMode 
                                ? "hover:bg-slate-800/50" 
                                : "hover:bg-gray-100/50"
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={cn(
                                "p-1 rounded-md shrink-0",
                                isDarkMode ? "bg-blue-500/10" : "bg-blue-50"
                              )}>
                                <FileText className="h-3 w-3 text-blue-500" />
                              </div>
                              <div className="min-w-0">
                                <p className={cn(
                                  "text-sm font-medium truncate flex items-center gap-2",
                                  isDarkMode ? "text-gray-200" : "text-gray-900"
                                )}>
                                  <span className="truncate">{file.name}</span>
                                  <span className={cn(
                                    "text-[11px] shrink-0",
                                    isDarkMode ? "text-gray-400" : "text-gray-500"
                                  )}>({formatFileSize(file.size)})</span>
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={cn(
                                "h-6 w-6 p-0",
                                isDarkMode ? "hover:bg-slate-700 text-red-400 hover:text-red-500" : "hover:bg-gray-200 text-red-500 hover:text-red-600"
                              )}
                              onClick={() => {
                                setAttachments(prev => prev.filter((_, i) => i !== index));
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className={cn(
                        "flex items-center justify-center h-9 rounded-lg border border-dashed",
                        isDarkMode 
                          ? "border-gray-600 text-gray-400" 
                          : "border-gray-300 text-gray-500"
                      )}>
                        <p className="text-sm">No files uploaded</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tag Departments Card */}
          <div className={cn(
            "rounded-xl p-6 shadow-sm mt-5 relative",
            isDarkMode ? "bg-slate-800" : "bg-white",
            (!completedSteps.eventDetails || !completedSteps.attachments) && "pointer-events-none"
          )}>
            {/* Blur overlay */}
            {(!completedSteps.eventDetails || !completedSteps.attachments) && (
              <div className="absolute inset-0 bg-white/30 dark:bg-black/30 backdrop-blur-[2px] rounded-xl z-10 flex items-center justify-center">
                <p className={cn(
                  "text-sm font-medium",
                  isDarkMode ? "text-gray-300" : "text-gray-600"
                )}>
                  {!completedSteps.eventDetails 
                    ? "Complete Step 1 to tag departments" 
                    : "Upload attachments to tag departments"
                  }
                </p>
              </div>
            )}
            <div className="flex items-center gap-3 mb-2">
              <Badge variant="outline" className={cn(
                "px-3 py-1 rounded-full text-sm font-semibold",
                isDarkMode ? "border-gray-700 text-gray-300" : "border-gray-200 text-gray-600"
              )}>
                Step 3
              </Badge>
              <h2 className={cn(
                "text-2xl font-bold",
                isDarkMode ? "text-gray-100" : "text-gray-900"
              )}>Tag Departments</h2>
            </div>
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
                              setShowCustomInput(false); // Reset custom input state
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
            "rounded-xl p-6 shadow-sm relative",
            isDarkMode ? "bg-slate-800" : "bg-white",
            (!completedSteps.eventDetails || !completedSteps.attachments || !completedSteps.tagDepartments || !completedSteps.requirements) && "pointer-events-none"
          )}>
            {/* Blur overlay */}
            {(!completedSteps.eventDetails || !completedSteps.attachments || !completedSteps.tagDepartments || !completedSteps.requirements) && (
              <div className="absolute inset-0 bg-white/30 dark:bg-black/30 backdrop-blur-[2px] rounded-xl z-10 flex items-center justify-center">
                <p className={cn(
                  "text-sm font-medium",
                  isDarkMode ? "text-gray-300" : "text-gray-600"
                )}>
                  {!completedSteps.eventDetails 
                    ? "Complete Step 1 to set schedule"
                    : !completedSteps.attachments
                    ? "Upload attachments to set schedule"
                    : !completedSteps.tagDepartments
                    ? "Tag departments to set schedule"
                    : "Set requirements to set schedule"
                  }
                </p>
              </div>
            )}
            <div className="flex items-center gap-3 mb-6">
              <Badge variant="outline" className={cn(
                "px-3 py-1 rounded-full text-sm font-semibold",
                isDarkMode ? "border-gray-700 text-gray-300" : "border-gray-200 text-gray-600"
              )}>
                Step 5
              </Badge>
              <h2 className={cn(
                "text-2xl font-bold",
                isDarkMode ? "text-gray-100" : "text-gray-900"
              )}>Schedule</h2>
            </div>

            <div className="space-y-6">
              {/* Date and Time Selection */}
              <div className="space-y-6">
                {/* Start Date and Time */}
                <div>
                  <Label className={cn(
                    "text-sm font-medium mb-3 block", 
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  )}>
                    Start Date & Time
                  </Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="relative">
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-start text-left font-normal text-sm",
                            "h-[38px] pl-9 pr-3 appearance-none rounded-md border",
                            !startDate && "text-muted-foreground",
                            isDarkMode 
                              ? "bg-slate-900 border-slate-700 text-gray-100" 
                              : "bg-white border-gray-200 text-gray-900"
                          )}
                          onClick={() => setIsStartCalendarOpen(true)}
                        >
                          <div className="absolute left-3 top-1/2 -translate-y-1/2">
                            <CalendarIcon className="h-4 w-4 text-gray-400" />
                          </div>
                          {startDate ? format(startDate, "MMM dd, yyyy") : <span>Pick a date</span>}
                        </Button>
                        <Popover open={isStartCalendarOpen} onOpenChange={setIsStartCalendarOpen}>
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
                              selected={startDate}
                              onSelect={(newDate) => {
                                setStartDate(newDate);
                                setIsStartCalendarOpen(false);
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
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center">
                          <Clock className="h-4 w-4 text-gray-400" />
                        </div>
                        <select
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
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
                </div>

                {/* End Date and Time */}
                <div>
                  <Label className={cn(
                    "text-sm font-medium mb-3 block", 
                    isDarkMode ? "text-gray-300" : "text-gray-700"
                  )}>
                    End Date & Time
                  </Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="relative">
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-start text-left font-normal text-sm",
                            "h-[38px] pl-9 pr-3 appearance-none rounded-md border",
                            !endDate && "text-muted-foreground",
                            isDarkMode 
                              ? "bg-slate-900 border-slate-700 text-gray-100" 
                              : "bg-white border-gray-200 text-gray-900"
                          )}
                          onClick={() => setIsEndCalendarOpen(true)}
                        >
                          <div className="absolute left-3 top-1/2 -translate-y-1/2">
                            <CalendarIcon className="h-4 w-4 text-gray-400" />
                          </div>
                          {endDate ? format(endDate, "MMM dd, yyyy") : <span>Pick a date</span>}
                        </Button>
                        <Popover open={isEndCalendarOpen} onOpenChange={setIsEndCalendarOpen}>
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
                              selected={endDate}
                              onSelect={(newDate) => {
                                setEndDate(newDate);
                                setIsEndCalendarOpen(false);
                              }}
                              disabled={(date) => date < startDate}
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
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center">
                          <Clock className="h-4 w-4 text-gray-400" />
                        </div>
                        <select
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
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
                      autoComplete={isStepActive('schedule') ? "on" : "off"}
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
                      autoComplete={isStepActive('schedule') ? "on" : "off"}
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
            onClick={() => {
              if (!completedSteps.readyToSubmit) {
                toast.error("Please complete all steps before submitting");
                return;
              }
              handleSubmit();
            }}
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
      <Dialog open={showRequirementsModal} onOpenChange={() => {}} modal>
        <DialogPortal>
          <DialogOverlay className="bg-black/50" />
          <DialogContent className="sm:max-w-[600px] p-0 border-0 !border-none shadow-none !ring-0" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()} hideClose>
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
                <div className="flex items-center gap-3">
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
                  <Button
                    onClick={() => {
                      if (currentDepartment && departmentRequirements[currentDepartment]?.length > 0 && !selectedDepartments.includes(currentDepartment)) {
                        setShowConfirmCloseModal(true);
                      } else {
                        setShowRequirementsModal(false);
                      }
                    }}
                    variant="outline"
                    className={cn(
                      "px-6 h-10 rounded-lg font-medium transition-colors",
                      isDarkMode 
                        ? "border-zinc-700 text-zinc-300 hover:bg-zinc-800" 
                        : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                    )}
                  >
                    Close
                  </Button>
                </div>
              </div>

              {/* Default Requirements and Others Section */}
              <div className={cn(
                "pt-4 pb-3 px-6 border-b border-zinc-200 dark:border-zinc-800",
                isDarkMode ? "bg-zinc-900/50" : "bg-zinc-50/50"
              )}>
                <div className="flex flex-wrap gap-2">
                  {/* Default Requirements */}
                  {currentDepartment && departments.find(d => d.id === currentDepartment)?.defaultRequirements?.map((req, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-8 px-3 text-xs rounded-lg transition-colors",
                        "bg-black text-white hover:bg-zinc-800 border-transparent"
                      )}
                      onClick={() => {
                        if (currentDepartment) {
                          setDepartmentRequirements(prev => ({
                            ...prev,
                            [currentDepartment]: [...(prev[currentDepartment] || []), req]
                          }));
                        }
                      }}
                    >
                      + {req}
                    </Button>
                  ))}
                  {/* Others Button - Always visible */}
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 px-3 text-xs rounded-lg transition-colors",
                      "bg-black text-white hover:bg-zinc-800 border-transparent"
                    )}
                    onClick={() => setShowCustomInput(true)}
                  >
                    + Others
                  </Button>
                </div>
              </div>

              {/* Main Requirements Card */}
              <div className={cn(
                "rounded-xl border",
                isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"
              )}>
                {/* Card Header with Input */}
                {showCustomInput && (
                  <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
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
                )}

                {/* Requirements List */}
                <div className="p-6">
                  <div className={cn(
                    "grid gap-3",
                    {
                      'grid-cols-1': (departmentRequirements[currentDepartment] || []).length <= 3,
                      'grid-cols-2': (departmentRequirements[currentDepartment] || []).length > 3 && (departmentRequirements[currentDepartment] || []).length <= 6,
                      'grid-cols-3': (departmentRequirements[currentDepartment] || []).length > 6
                    }
                  )}>
                    {currentDepartment && (departmentRequirements[currentDepartment] || []).length > 0 ? (
                      departmentRequirements[currentDepartment].map((req, index) => (
                        <div 
                          key={index} 
                          className={cn(
                            "flex items-center justify-between p-2 rounded-lg border transition-all gap-2",
                            isDarkMode 
                              ? "bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800" 
                              : "bg-zinc-50/50 border-zinc-200 hover:bg-zinc-50"
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={cn(
                              "text-sm font-medium truncate",
                              isDarkMode ? "text-zinc-100" : "text-zinc-700"
                            )}>{req}</span>
                            {departmentRequirementNotes[`${currentDepartment}-${req}`] && (
                              <Badge variant="outline" className={cn(
                                "text-[10px] px-1 py-0 h-4",
                                isDarkMode ? "border-blue-500/30 bg-blue-500/10 text-blue-400" : "border-blue-200 bg-blue-50 text-blue-600"
                              )}>
                                Has notes
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={cn(
                                    "h-6 w-6 p-0 rounded transition-colors",
                                    isDarkMode ? "hover:bg-zinc-700" : "hover:bg-zinc-100"
                                  )}
                                >
                                  <FileText className="h-3.5 w-3.5" />
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
                                "h-6 w-6 p-0 rounded transition-colors",
                                isDarkMode ? "hover:bg-zinc-700 text-red-400 hover:text-red-500" : "hover:bg-zinc-100 text-red-500 hover:text-red-600"
                              )}
                              onClick={() => {
                                setDepartmentRequirements(prev => ({
                                  ...prev,
                                  [currentDepartment]: prev[currentDepartment].filter((_, i) => i !== index)
                                }));
                                const noteKey = `${currentDepartment}-${req}`;
                                setDepartmentRequirementNotes(prev => {
                                  const newNotes = { ...prev };
                                  delete newNotes[noteKey];
                                  return newNotes;
                                });
                              }}
                            >
                              <X className="h-3.5 w-3.5" />
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
        </DialogPortal>
      </Dialog>

      {/* Location Booking Modal */}
      <Dialog 
        open={showLocationBookingModal} 
        onOpenChange={async (open) => {
          if (!open) {
            // When closing, only reset date selections
            setPreferredStartDate(new Date());
            setPreferredEndDate(new Date());
            setPreferredStartTime("10:30");
            setPreferredEndTime("11:30");
          } else if (formData.location) {
            // When opening, fetch fresh booking data
            setLoadingBookings(true);
            
            try {
              // Get fresh bookings
              const freshBookings = await fetchExistingBookings(formData.location);
              console.log('📚 Fresh bookings on modal open:', freshBookings);
              
              // Update state with fresh data
              setExistingBookings(freshBookings);

              // Show booking conflict message if there are bookings
              if (freshBookings?.length > 0) {
                const booking = freshBookings[0];
                const startDate = new Date(booking.startDate).toLocaleDateString();
                const endDate = new Date(booking.endDate).toLocaleDateString();
                toast.error(`This location is booked from ${startDate} to ${endDate}`, { 
                  duration: 5000,
                  position: 'top-center'
                });
              }
            } catch (error) {
              console.error('Error loading bookings:', error);
              toast.error('Error loading booking data');
            } finally {
              setLoadingBookings(false);
            }
          }
          setShowLocationBookingModal(open);
        }}
      >
        <DialogContent className={cn(
          "sm:max-w-[600px] p-0 border-0 !border-none shadow-lg",
          isDarkMode ? "bg-slate-900" : "bg-white"
        )}>
          <div className="p-6">
            <div className="flex flex-col gap-6">
              {/* Modal Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className={cn(
                    "text-2xl font-bold tracking-tight",
                    isDarkMode ? "text-white" : "text-gray-900"
                  )}>
                    Preferred Dates for {formData.location}
                  </h3>
                  <p className={cn(
                    "text-sm mt-2",
                    isDarkMode ? "text-gray-400" : "text-gray-500"
                  )}>
                    Select your preferred start and end dates. These will be automatically filled in the schedule step.
                  </p>
                  {loadingBookings && (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      <span className={cn(
                        "text-sm",
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      )}>
                        Checking existing bookings...
                      </span>
                    </div>
                  )}
                  {!loadingBookings && !preferredStartDate && !preferredEndDate && (
                    <div className={cn(
                      "mt-3 p-3 rounded-lg border",
                      existingBookings.length > 0 
                        ? (isDarkMode ? "bg-red-900/20 border-red-800" : "bg-red-50 border-red-200")
                        : (isDarkMode ? "bg-green-900/20 border-green-800" : "bg-green-50 border-green-200")
                    )}>
                      {existingBookings.length > 0 ? (
                        <>
                          <p className={cn(
                            "text-sm font-medium",
                            isDarkMode ? "text-red-300" : "text-red-700"
                          )}>
                            ⚠️ This location has {existingBookings.length} existing booking(s)
                          </p>
                          <p className={cn(
                            "text-xs mt-1",
                            isDarkMode ? "text-red-400" : "text-red-600"
                          )}>
                            Red dates in the calendar are already booked by other users.
                          </p>
                          <div className="mt-2 space-y-1">
                            {existingBookings.map((booking, index) => (
                              <p key={index} className={cn(
                                "text-xs",
                                isDarkMode ? "text-red-300" : "text-red-600"
                              )}>
                                • {booking.title} by {booking.requestor} ({format(booking.startDate, "MMM dd")} - {format(booking.endDate, "MMM dd")})
                              </p>
                            ))}
                          </div>
                        </>
                      ) : (
                        <p className={cn(
                          "text-sm font-medium",
                          isDarkMode ? "text-green-300" : "text-green-700"
                        )}>
                          ✅ This location is available for booking
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* Real-time availability message for selected dates */}
                  {preferredStartDate && preferredEndDate && !loadingBookings && (
                    <div className={cn(
                      "mt-3 p-3 rounded-lg border",
                      (() => {
                        const startConflict = isDateBooked(preferredStartDate);
                        const endConflict = isDateBooked(preferredEndDate);
                        const hasConflict = startConflict || endConflict;
                        
                        return hasConflict 
                          ? (isDarkMode ? "bg-red-900/20 border-red-800" : "bg-red-50 border-red-200")
                          : (isDarkMode ? "bg-green-900/20 border-green-800" : "bg-green-50 border-green-200");
                      })()
                    )}>
                      {(() => {
                        const startConflict = isDateBooked(preferredStartDate);
                        const endConflict = isDateBooked(preferredEndDate);
                        const hasConflict = startConflict || endConflict;
                        
                        if (hasConflict) {
                          const conflictDates = [];
                          // Get the actual conflicting booking
                          const conflictingBooking = existingBookings.find(booking => {
                            const bookingStart = booking.startDate.toDate ? booking.startDate.toDate() : new Date(booking.startDate);
                            const bookingEnd = booking.endDate.toDate ? booking.endDate.toDate() : new Date(booking.endDate);
                            return (
                              (preferredStartDate >= bookingStart && preferredStartDate <= bookingEnd) ||
                              (preferredEndDate >= bookingStart && preferredEndDate <= bookingEnd)
                            );
                          });

                          if (conflictingBooking) {
                            const bookingStart = conflictingBooking.startDate.toDate ? 
                              conflictingBooking.startDate.toDate() : 
                              new Date(conflictingBooking.startDate);
                            const bookingEnd = conflictingBooking.endDate.toDate ? 
                              conflictingBooking.endDate.toDate() : 
                              new Date(conflictingBooking.endDate);
                            
                            conflictDates.push(format(bookingStart, "MMM dd"));
                            if (bookingStart.getDate() !== bookingEnd.getDate()) {
                              conflictDates.push(format(bookingEnd, "MMM dd"));
                            }
                          }
                          
                          return (
                            <div>
                              <p className={cn(
                                "text-sm font-medium",
                                isDarkMode ? "text-red-300" : "text-red-700"
                              )}>
                                🚫 Booking Conflict Detected
                              </p>
                              <p className={cn(
                                "text-xs mt-1",
                                isDarkMode ? "text-red-400" : "text-red-600"
                              )}>
                                This location is booked from {conflictDates.join(" to ")}
                              </p>
                            </div>
                          );
                        } else {
                          return (
                            <p className={cn(
                              "text-sm font-medium",
                              isDarkMode ? "text-green-300" : "text-green-700"
                            )}>
                              ✅ Selected dates are available for booking
                            </p>
                          );
                        }
                      })()}
                    </div>
                  )}
                </div>
                <Button
                  onClick={() => setShowLocationBookingModal(false)}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-8 w-8 p-0",
                    isDarkMode ? "hover:bg-slate-800" : "hover:bg-gray-100"
                  )}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Date Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Start Date & Time */}
                <div className="space-y-4">
                  <div>
                    <Label className={cn(
                      "text-sm font-medium mb-3 block",
                      isDarkMode ? "text-gray-300" : "text-gray-700"
                    )}>
                      Preferred Start Date & Time
                    </Label>
                    <div className="space-y-3">
                      <div className="relative">
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-start text-left font-normal text-sm",
                            "h-[38px] pl-9 pr-3 appearance-none rounded-md border",
                            !preferredStartDate && "text-muted-foreground",
                            isDarkMode 
                              ? "bg-slate-800 border-slate-700 text-gray-100" 
                              : "bg-white border-gray-200 text-gray-900"
                          )}
                          onClick={() => setIsPreferredStartCalendarOpen(true)}
                        >
                          <div className="absolute left-3 top-1/2 -translate-y-1/2">
                            <CalendarIcon className="h-4 w-4 text-gray-400" />
                          </div>
                          {preferredStartDate ? format(preferredStartDate, "MMM dd, yyyy") : <span>Pick a date</span>}
                        </Button>
                        <Popover open={isPreferredStartCalendarOpen} onOpenChange={setIsPreferredStartCalendarOpen}>
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
                            {loadingBookings ? (
                              <div className={cn(
                                "flex items-center justify-center p-4",
                                isDarkMode ? "text-slate-400" : "text-gray-500"
                              )}>
                                <div className="w-6 h-6 border-2 border-current rounded-full animate-spin border-t-transparent" />
                              </div>
                            ) : (
                            <DatePicker
                              date={preferredStartDate}
                              onSelect={(newDate) => {
                                if (newDate) {
                                  const isBooked = existingBookings.some(booking => {
                                    const checkDateStr = newDate.toISOString().split('T')[0];
                                    const startDateStr = new Date(booking.startDate).toISOString().split('T')[0];
                                    const endDateStr = new Date(booking.endDate).toISOString().split('T')[0];
                                    return checkDateStr >= startDateStr && checkDateStr <= endDateStr;
                                  });

                                  if (isBooked) {
                                    const booking = existingBookings.find(b => {
                                      const checkDateStr = newDate.toISOString().split('T')[0];
                                      const startDateStr = new Date(b.startDate).toISOString().split('T')[0];
                                      const endDateStr = new Date(b.endDate).toISOString().split('T')[0];
                                      return checkDateStr >= startDateStr && checkDateStr <= endDateStr;
                                    });

                                    if (booking) {
                                      const startDate = new Date(booking.startDate).toLocaleDateString();
                                      const endDate = new Date(booking.endDate).toLocaleDateString();
                                      toast.error(`This location is booked from ${startDate} to ${endDate}`, { duration: 3000 });
                                    }
                                    return;
                                  }

                                  setPreferredStartDate(newDate);
                                  setIsPreferredStartCalendarOpen(false);
                                }
                              }}
                              disabled={(date) => {
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                return date < today;
                              }}
                              existingBookings={existingBookings}
                              loadingBookings={loadingBookings}
                              isDarkMode={isDarkMode}
                            />
                            )}
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center">
                          <Clock className="h-4 w-4 text-gray-400" />
                        </div>
                        <select
                          value={preferredStartTime}
                          onChange={(e) => setPreferredStartTime(e.target.value)}
                          className={cn(
                            "w-full h-[38px] pl-9 pr-3 appearance-none rounded-md border font-normal text-sm",
                            isDarkMode 
                              ? "bg-slate-800 border-slate-700 text-gray-100" 
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
                </div>

                {/* End Date & Time */}
                <div className="space-y-4">
                  <div>
                    <Label className={cn(
                      "text-sm font-medium mb-3 block",
                      isDarkMode ? "text-gray-300" : "text-gray-700"
                    )}>
                      Preferred End Date & Time
                    </Label>
                    <div className="space-y-3">
                      <div className="relative">
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-start text-left font-normal text-sm",
                            "h-[38px] pl-9 pr-3 appearance-none rounded-md border",
                            !preferredEndDate && "text-muted-foreground",
                            isDarkMode 
                              ? "bg-slate-800 border-slate-700 text-gray-100" 
                              : "bg-white border-gray-200 text-gray-900"
                          )}
                          onClick={() => setIsPreferredEndCalendarOpen(true)}
                        >
                          <div className="absolute left-3 top-1/2 -translate-y-1/2">
                            <CalendarIcon className="h-4 w-4 text-gray-400" />
                          </div>
                          {preferredEndDate ? format(preferredEndDate, "MMM dd, yyyy") : <span>Pick a date</span>}
                        </Button>
                        <Popover open={isPreferredEndCalendarOpen} onOpenChange={setIsPreferredEndCalendarOpen}>
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
                              selected={preferredEndDate}
                              onSelect={(newDate) => {
                                // Check if date is booked
                                const isBooked = existingBookings.some(booking => {
                                  const checkDate = new Date(newDate);
                                  checkDate.setHours(0, 0, 0, 0);
                                  
                                  const startDate = new Date(booking.startDate);
                                  startDate.setHours(0, 0, 0, 0);
                                  
                                  const endDate = new Date(booking.endDate);
                                  endDate.setHours(23, 59, 59, 999);
                                  
                                  return checkDate >= startDate && checkDate <= endDate;
                                });

                                if (isBooked) {
                                  const booking = existingBookings.find(b => {
                                    const checkDateStr = newDate.toISOString().split('T')[0];
                                    const startDateStr = new Date(b.startDate).toISOString().split('T')[0];
                                    const endDateStr = new Date(b.endDate).toISOString().split('T')[0];
                                    return checkDateStr >= startDateStr && checkDateStr <= endDateStr;
                                  });

                                  if (booking) {
                                    const startDate = new Date(booking.startDate).toLocaleDateString();
                                    const endDate = new Date(booking.endDate).toLocaleDateString();
                                    toast.error(`This location is booked from ${startDate} to ${endDate}`, { duration: 3000 });
                                  } else {
                                    toast.error("This date is already booked", { duration: 3000 });
                                  }
                                  return;
                                }

                                setPreferredEndDate(newDate);
                                setIsPreferredEndCalendarOpen(false);
                              }}
                              disabled={(date) => {
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                
                                // Check if before start date
                                const beforeStart = preferredStartDate ? date < preferredStartDate : false;
                                
                                // Check if date is booked
                                const isBooked = existingBookings.some(booking => {
                                  const checkDateStr = date.toISOString().split('T')[0];
                                  const startDateStr = new Date(booking.startDate).toISOString().split('T')[0];
                                  const endDateStr = new Date(booking.endDate).toISOString().split('T')[0];
                                  return checkDateStr >= startDateStr && checkDateStr <= endDateStr;
                                });

                                // Disable if past date, before start date, or booked
                                return date < today || beforeStart || isBooked;
                              }}
                              initialFocus
                              showOutsideDays={false}
                              className={cn(
                                "rounded-md shadow-none",
                                isDarkMode && "dark"
                              )}
                              modifiers={{
                                booked: (date) => {
                                  // Check if date is within any existing booking
                                  if (!existingBookings?.length) return false;

                                  return existingBookings.some(booking => {
                                    // Convert all dates to YYYY-MM-DD for comparison
                                    const checkDateStr = date.toISOString().split('T')[0];
                                    const startDateStr = new Date(booking.startDate).toISOString().split('T')[0];
                                    const endDateStr = new Date(booking.endDate).toISOString().split('T')[0];
                                    
                                    console.log('📅 Checking date:', {
                                      date: checkDateStr,
                                      start: startDateStr,
                                      end: endDateStr
                                    });

                                    // Check if date is within range
                                    const isBooked = checkDateStr >= startDateStr && checkDateStr <= endDateStr;
                                    console.log('📅 Is date booked?', isBooked);
                                    return isBooked;
                                  });
                                }
                              }}
                              modifiersStyles={{
                                booked: {
                                  backgroundColor: '#ef4444',
                                  color: 'white',
                                  fontWeight: 'bold',
                                  cursor: 'not-allowed',
                                  opacity: '0.7',
                                  textDecoration: 'line-through'
                                }
                              }}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center">
                          <Clock className="h-4 w-4 text-gray-400" />
                        </div>
                        <select
                          value={preferredEndTime}
                          onChange={(e) => setPreferredEndTime(e.target.value)}
                          className={cn(
                            "w-full h-[38px] pl-9 pr-3 appearance-none rounded-md border font-normal text-sm",
                            isDarkMode 
                              ? "bg-slate-800 border-slate-700 text-gray-100" 
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
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  onClick={() => setShowLocationBookingModal(false)}
                  variant="outline"
                  className={cn(
                    "px-6 h-10",
                    isDarkMode 
                      ? "border-gray-700 text-gray-300 hover:bg-slate-800" 
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  )}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePreferredDatesSave}
                  className={cn(
                    "px-6 h-10",
                    isDarkMode 
                      ? "bg-white text-black hover:bg-gray-200" 
                      : "bg-black text-white hover:bg-gray-800"
                  )}
                >
                  Save Preferred Dates
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Close Modal */}
      <Dialog open={showConfirmCloseModal} onOpenChange={setShowConfirmCloseModal}>
        <DialogContent className={cn(
          "sm:max-w-[360px] shadow-lg",
          isDarkMode 
            ? "bg-zinc-900 border border-zinc-800" 
            : "bg-white border border-zinc-200"
        )}>
          <div className="p-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "p-2.5 rounded-full",
                  isDarkMode ? "bg-yellow-500/10" : "bg-yellow-50"
                )}>
                  <FileText className={cn(
                    "w-5 h-5",
                    isDarkMode ? "text-yellow-400" : "text-yellow-600"
                  )} />
                </div>
                <div>
                  <h3 className={cn(
                    "text-base font-semibold",
                    isDarkMode ? "text-gray-100" : "text-gray-900"
                  )}>
                    Unsaved Changes
                  </h3>
                  <p className={cn(
                    "text-sm mt-1",
                    isDarkMode ? "text-gray-400" : "text-gray-500"
                  )}>
                    You have unsaved requirements. Are you sure you want to close without saving?
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 mt-3">
                <Button
                  variant="outline"
                  onClick={() => setShowConfirmCloseModal(false)}
                  className={cn(
                    "px-4 h-9",
                    isDarkMode 
                      ? "border-zinc-700 text-zinc-300 hover:bg-zinc-800" 
                      : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                  )}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    // Clear requirements for this department if not saved
                    setDepartmentRequirements(prev => {
                      const newReqs = { ...prev };
                      delete newReqs[currentDepartment];
                      return newReqs;
                    });
                    // Clear notes for this department
                    setDepartmentRequirementNotes(prev => {
                      const newNotes = { ...prev };
                      Object.keys(newNotes).forEach(key => {
                        if (key.startsWith(`${currentDepartment}-`)) {
                          delete newNotes[key];
                        }
                      });
                      return newNotes;
                    });
                    setShowConfirmCloseModal(false);
                    setShowRequirementsModal(false);
                  }}
                  className={cn(
                    "px-4 h-9",
                    isDarkMode 
                      ? "bg-red-500 text-white hover:bg-red-600" 
                      : "bg-red-600 text-white hover:bg-red-700"
                  )}
                >
                  Close Without Saving
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};


export default RequestEvent;
