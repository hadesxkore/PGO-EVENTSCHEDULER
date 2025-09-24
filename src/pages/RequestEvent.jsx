import React, { useState, useRef, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { auth, db } from "../lib/firebase/firebase";
import { doc, getDoc, Timestamp, collection, query, where, getDocs } from "firebase/firestore";
import { uploadFile, formatFileSize } from "../lib/cloudinary";
import useEventStore from "../store/eventStore";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTheme } from "../contexts/ThemeContext";
import { getAllDepartments } from "../lib/firebase/departments";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { Checkbox } from "../components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogPortal, DialogOverlay } from "../components/ui/dialog";
import { Card, CardContent } from "../components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "../components/ui/command";
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
  Calendar,
  CalendarIcon,
  Clock,
  MapPin,
  Users,
  FileText,
  Plus,
  Search,
  Filter,
  Eye,
  User,
  Download,
  X,
  Check,
  Pencil,
  RotateCw,
  MessageCircle,
  AlertCircle,
  Send,
  ChevronRight,
  Loader2,
  ChevronDown,
  Building2,
  Shield,
  Phone,
  Mail
} from "lucide-react";
import { format } from "date-fns";
import ModernCalendar from "../components/ModernCalendar";
import { DatePicker } from "../components/DatePicker";
import TemplateModal from "../components/TemplateModal";



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
    withGov: false, // Default to false (without government)
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
  
  // VVIP field visibility
  const [showVVIP, setShowVVIP] = useState(false);
  
  // VIP/VVIP dropdown selections
  const [vipCount, setVipCount] = useState("0");
  const [vvipCount, setVvipCount] = useState("0");
  const [isStartCalendarOpen, setIsStartCalendarOpen] = useState(false);
  const [isEndCalendarOpen, setIsEndCalendarOpen] = useState(false);
  const [isPreferredStartCalendarOpen, setIsPreferredStartCalendarOpen] = useState(false);
  const [isPreferredEndCalendarOpen, setIsPreferredEndCalendarOpen] = useState(false);

  // Attachments state
  const [attachments, setAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [skipAttachments, setSkipAttachments] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);

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
  const [departmentSearchQuery, setDepartmentSearchQuery] = useState("");

  // Location suggestions
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [filteredLocations, setFilteredLocations] = useState([]);
  const [locationSelectedFromDropdown, setLocationSelectedFromDropdown] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [showCustomLocationInput, setShowCustomLocationInput] = useState(false);
  const [customLocation, setCustomLocation] = useState("");
  
  // Multiple locations state
  const [hasMultipleLocations, setHasMultipleLocations] = useState(false);
  
  // Multiple locations draft management
  const [currentLocationIndex, setCurrentLocationIndex] = useState(0);
  const [locationDrafts, setLocationDrafts] = useState([]);
  const [isInMultipleLocationMode, setIsInMultipleLocationMode] = useState(false);
  
  // Gov modal state
  const [showGovModal, setShowGovModal] = useState(false);
  const [govAttachments, setGovAttachments] = useState({
    brieferTemplate: null,
    availableForDLBriefer: null,
    programme: null
  });
  
  // Template modals state
  const [showPostBrieferModal, setShowPostBrieferModal] = useState(false);
  
  // ECR modal state
  const [showECRModal, setShowECRModal] = useState(false);
  const [ecrFile, setEcrFile] = useState(null);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [ecrFormData, setEcrFormData] = useState({
    eventTitle: "",
    dateAndVenue: "",
    organizingOffice: "",
    numberOfParticipants: "",
    summaryOfActivities: "",
    highlightsAndResults: "",
    challengesEncountered: "",
    recommendations: "",
    preparedBy: "",
    preparedDate: ""
  });
  const [ecrPhotos, setEcrPhotos] = useState([]);


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
    "1BOSSCO",
    "Emiliana Hall",
    "Pavilion"
  ];

  // Helper function to determine if a step is currently active
  const isStepActive = (step) => {
    const steps = ['eventDetails', 'attachments', 'tagDepartments', 'requirements', 'schedule'];
    const currentStepIndex = steps.findIndex(s => !completedSteps[s]);
    const stepIndex = steps.indexOf(step);
    return stepIndex === currentStepIndex;
  };

  useEffect(() => {
    // Check if user is authenticated and load initial data
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        toast.error("Please login to submit event requests");
        navigate('/');
      } else if (formData.location) {
        // If location is already set (e.g., from stored state), fetch booked dates
        await useEventStore.getState().getBookedDates(formData.location);
      }
    });

    return () => unsubscribe();
  }, [navigate, formData.location]);


  // Check form completion for each section

  useEffect(() => {
    // Check Event Details completion
    const isEventDetailsComplete = 
      formData.title && 
      formData.requestor && 
      (hasMultipleLocations ? 
        (isInMultipleLocationMode ? locationDrafts.length > 0 : formData.location) : 
        formData.location
      ) && 
      formData.participants &&
      formData.vip &&
      formData.classifications &&
      formData.withGov !== undefined; // withGov checkbox is always defined

    // Check Attachments completion
    const isAttachmentsComplete = skipAttachments || (attachments && attachments.length > 0);

    // Check Tag Departments completion - requires event details and either attachments or skip attachments
    const isTagDepartmentsComplete = selectedDepartments.length > 0 && isEventDetailsComplete && isAttachmentsComplete;

    // Check Requirements completion
    const isRequirementsComplete = selectedDepartments.some(deptId => 
      departmentRequirements[deptId] && departmentRequirements[deptId].length > 0
    ) && isTagDepartmentsComplete;

    // Check Schedule completion
    const isScheduleComplete = hasMultipleLocations ? (
      // For multiple locations: check if drafts have complete date/time info
      isInMultipleLocationMode ? (
        locationDrafts.some(draft => 
          draft.location.trim() && 
          draft.startDate && 
          draft.endDate && 
          draft.startTime && 
          draft.endTime
        ) && 
        formData.contactNumber && 
        formData.contactEmail
      ) : (
        // Fallback to single location check
        startDate && 
        endDate && 
        startTime && 
        endTime && 
        formData.contactNumber && 
        formData.contactEmail
      )
    ) : (
      // For single location: check traditional fields
      startDate && 
      endDate && 
      startTime && 
      endTime && 
      formData.contactNumber && 
      formData.contactEmail
    );

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
  }, [formData, selectedDepartments, startDate, endDate, startTime, endTime, attachments, departmentRequirements, skipAttachments, hasMultipleLocations, isInMultipleLocationMode, locationDrafts]);

  // Auto-save current location draft when form data changes (for multiple locations)
  useEffect(() => {
    if (hasMultipleLocations && isInMultipleLocationMode) {
      // Only auto-save if we have the minimum required fields for a location
      if (formData.location && formData.participants && formData.vip) {
        // Use a timeout to debounce the auto-save (avoid saving on every keystroke)
        const timeoutId = setTimeout(() => {
          saveCurrentLocationDraft();
        }, 1000); // Save 1 second after user stops typing

        return () => clearTimeout(timeoutId);
      }
    }
  }, [formData.location, formData.participants, formData.vip, formData.vvip, formData.classifications, startDate, endDate, startTime, endTime, hasMultipleLocations, isInMultipleLocationMode, currentLocationIndex]);




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
        toast.error("An error occurred while fetching departments");
      }
    };

    fetchDepartments();
  }, []);

  // Filter departments based on search query
  const filteredDepartments = useMemo(() => {
    if (!departmentSearchQuery.trim()) return departments;
    
    const searchTerm = departmentSearchQuery.toLowerCase().trim();
    return departments.filter(dept => 
      dept.name.toLowerCase().includes(searchTerm)
    );
  }, [departments, departmentSearchQuery]);

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
      // If all else fails, try basic normalization
      return text.toString()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
    }
  };

  const handleInputChange = async (e) => {
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

    // Handle location filtering and fetch booked dates
    if (name === 'location') {
      if (sanitizedText.length > 0) {
        const filtered = defaultLocations.filter(location =>
          location.toLowerCase().includes(sanitizedText.toLowerCase())
        );
        setFilteredLocations(filtered);
        setShowLocationDropdown(true);
        
        // Fetch booked dates when location is typed
        await useEventStore.getState().getBookedDates(sanitizedText.trim());
      } else {
        setShowLocationDropdown(false);
        setFilteredLocations([]);
      }
    }
  };

  const handleEcrInputChange = (e) => {
    const { name, value } = e.target;
    setEcrFormData(prev => ({ ...prev, [name]: value }));
  };

  // Helper function to compress image
  const compressImage = (file, maxWidth = 800, quality = 0.7) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(resolve, 'image/jpeg', quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  // Helper function to compress PDF files
  const compressPDF = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          // For PDF compression, we'll reduce quality by re-encoding
          // This is a basic approach - in production you might want to use a dedicated PDF library
          const arrayBuffer = e.target.result;
          const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
          
          // Create a compressed version (this is a simplified approach)
          // In a real scenario, you'd use libraries like PDF-lib or similar
          const compressedBlob = new Blob([arrayBuffer], { 
            type: 'application/pdf',
            // This doesn't actually compress, but represents where compression would happen
          });
          
          // For now, we'll simulate compression by reducing file size conceptually
          // In practice, you'd need a proper PDF compression library
          resolve(compressedBlob);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  // Helper function to compress files before upload
  const compressFileForUpload = async (file) => {
    const fileSizeMB = file.size / (1024 * 1024);
    
    // Only compress if file is above 2MB
    if (fileSizeMB > 2) {
      try {
        if (file.type.startsWith('image/')) {
          // Compress images
          const compressedBlob = await compressImage(file, 1200, 0.7);
          return new File([compressedBlob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
        } else if (file.type === 'application/pdf') {
          // For PDF files, we'll use Cloudinary's auto-optimization instead
          // Since client-side PDF compression is complex and requires large libraries
          return file;
        } else if (file.type.includes('document') || file.type.includes('word')) {
          // For DOCX files, client-side compression is very complex
          // We'll rely on Cloudinary's optimization
          return file;
        }
      } catch (error) {
        return file;
      }
    }
    
    // For files under 2MB, return as is
    return file;
  };

  // PDF Generation Functions
  const generatePDFPreview = async () => {
    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
      compress: true // Enable PDF compression
    });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    let yPosition = margin;

    // Load and add logo
    try {
      const logoImg = new Image();
      logoImg.src = '/images/bataanlogo.png';
      
      await new Promise((resolve, reject) => {
        logoImg.onload = resolve;
        logoImg.onerror = reject;
      });

      // Add logo (top left)
      const logoSize = 25;
      pdf.addImage(logoImg, 'PNG', margin, yPosition, logoSize, logoSize);
      
      // Header text next to logo
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('PROVINCIAL GOVERNMENT OF BATAAN', margin + logoSize + 10, yPosition + 8);
      
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Republic of the Philippines', margin + logoSize + 10, yPosition + 15);
      
      // Generation date and time (below Republic of the Philippines)
      const now = new Date();
      const dateTime = now.toLocaleString('en-PH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Generated: ${dateTime}`, margin + logoSize + 10, yPosition + 22);
      
      yPosition += logoSize + 10;
    } catch (error) {
      // Could not load logo, proceeding without it
      // Fallback header without logo
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('PROVINCIAL GOVERNMENT OF BATAAN', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 8;
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Republic of the Philippines', pageWidth / 2, yPosition, { align: 'center' });
      
      // Generation date and time (below Republic of the Philippines - fallback)
      const now = new Date();
      const dateTime = now.toLocaleString('en-PH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Generated: ${dateTime}`, pageWidth / 2, yPosition + 8, { align: 'center' });
      
      yPosition += 20;
    }

    // Main title - moved closer to header
    yPosition += 5;
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('EVENT COMPLETION REPORT (ECR)', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    // Add a line separator
    pdf.setLineWidth(0.5);
    pdf.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    // Create table for form fields
    const tableStartY = yPosition;
    const tableWidth = pageWidth - 2 * margin;
    const labelColumnWidth = tableWidth * 0.35; // 35% for labels
    const valueColumnWidth = tableWidth * 0.65; // 65% for values
    const rowHeight = 12;
    
    const fields = [
      { label: 'Event Title:', value: ecrFormData.eventTitle },
      { label: 'Date and Venue:', value: ecrFormData.dateAndVenue },
      { label: 'Organizing Office:', value: ecrFormData.organizingOffice },
      { label: 'Number of Participants:', value: ecrFormData.numberOfParticipants },
      { label: 'Summary of Activities Conducted:', value: ecrFormData.summaryOfActivities, isTextArea: true },
      { label: 'Highlights and Key Results:', value: ecrFormData.highlightsAndResults, isTextArea: true },
      { label: 'Challenges Encountered:', value: ecrFormData.challengesEncountered, isTextArea: true },
      { label: 'Recommendations:', value: ecrFormData.recommendations, isTextArea: true },
      { label: 'Prepared By:', value: ecrFormData.preparedBy },
      { label: 'Date:', value: ecrFormData.preparedDate }
    ];

    pdf.setFontSize(10);
    pdf.setLineWidth(0.3);
    
    fields.forEach((field, index) => {
      // Check if we need a new page
      if (yPosition > pageHeight - 60) {
        pdf.addPage();
        yPosition = margin;
      }

      let currentRowHeight = rowHeight;
      
      // Calculate height needed for text areas
      if (field.isTextArea && field.value) {
        const lines = pdf.splitTextToSize(field.value, valueColumnWidth - 4);
        currentRowHeight = Math.max(rowHeight, lines.length * 4 + 8);
      }

      // Draw cell borders
      pdf.rect(margin, yPosition, labelColumnWidth, currentRowHeight);
      pdf.rect(margin + labelColumnWidth, yPosition, valueColumnWidth, currentRowHeight);

      // Add label text
      pdf.setFont('helvetica', 'bold');
      pdf.text(field.label, margin + 2, yPosition + 7);

      // Add value text
      pdf.setFont('helvetica', 'normal');
      if (field.isTextArea && field.value) {
        const lines = pdf.splitTextToSize(field.value, valueColumnWidth - 4);
        pdf.text(lines, margin + labelColumnWidth + 2, yPosition + 7);
      } else {
        pdf.text(field.value || 'N/A', margin + labelColumnWidth + 2, yPosition + 7);
      }
      
      yPosition += currentRowHeight;
    });

    // Add photos section if photos exist
    if (ecrPhotos.length > 0) {
      // Add new page for photos
      pdf.addPage();
      yPosition = margin;
      
      // Add photo page header
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('PHOTO DOCUMENTATION', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 20;
      
      // Photo grid settings
      const photosPerRow = 2; // 2 photos per row
      const photoWidth = 70; // Fixed width in mm
      const photoHeight = 50; // Fixed height in mm
      const photoSpacing = 10; // Space between photos
      const startX = (pageWidth - (photosPerRow * photoWidth + (photosPerRow - 1) * photoSpacing)) / 2;
      
      let currentRow = 0;
      let currentCol = 0;
      
      // Process and add photos in grid layout
      for (let i = 0; i < ecrPhotos.length; i++) {
        const photo = ecrPhotos[i];
        
        try {
          // Compress image before adding to PDF
          const compressedImage = await compressImage(photo, 800, 0.6);
          
          // Convert compressed file to base64 for PDF
          const reader = new FileReader();
          const imageData = await new Promise((resolve, reject) => {
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(compressedImage);
          });
          
          // Calculate position
          const xPos = startX + currentCol * (photoWidth + photoSpacing);
          const yPos = yPosition + currentRow * (photoHeight + photoSpacing + 15);
          
          // Check if we need a new page
          if (yPos + photoHeight > pageHeight - margin) {
            pdf.addPage();
            yPosition = margin;
            currentRow = 0;
            currentCol = 0;
            const newYPos = yPosition + currentRow * (photoHeight + photoSpacing + 15);
            
            // Add image with fixed dimensions
            pdf.addImage(imageData, 'JPEG', xPos, newYPos, photoWidth, photoHeight);
            
            // Add photo caption
            pdf.setFontSize(8);
            pdf.setFont('helvetica', 'normal');
            pdf.text(`Photo ${i + 1}`, xPos, newYPos + photoHeight + 5);
          } else {
            // Add image with fixed dimensions
            pdf.addImage(imageData, 'JPEG', xPos, yPos, photoWidth, photoHeight);
            
            // Add photo caption
            pdf.setFontSize(8);
            pdf.setFont('helvetica', 'normal');
            pdf.text(`Photo ${i + 1}`, xPos, yPos + photoHeight + 5);
          }
          
          // Move to next position
          currentCol++;
          if (currentCol >= photosPerRow) {
            currentCol = 0;
            currentRow++;
          }
          
        } catch (error) {
          // Add error message instead of photo
          const xPos = startX + currentCol * (photoWidth + photoSpacing);
          const yPos = yPosition + currentRow * (photoHeight + photoSpacing + 15);
          
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'normal');
          pdf.text(`Error loading photo ${i + 1}`, xPos, yPos + 20);
          
          // Move to next position
          currentCol++;
          if (currentCol >= photosPerRow) {
            currentCol = 0;
            currentRow++;
          }
        }
      }
    }

    return pdf;
  };

  const downloadPDF = async () => {
    try {
      const pdf = await generatePDFPreview();
      pdf.save(`ECR_${ecrFormData.eventTitle || 'Event'}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      alert('Error generating PDF. Please try again.');
    }
  };

  const previewPDF = async () => {
    try {
      const pdf = await generatePDFPreview();
      const pdfBlob = pdf.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, '_blank');
    } catch (error) {
      alert('Error previewing PDF. Please try again.');
    }
  };

  const handleLocationSelect = async (location) => {
    
    setFormData(prev => ({
      ...prev,
      location: location
    }));
    setShowLocationDropdown(false);
    setFilteredLocations([]);
    setLocationSelectedFromDropdown(true);
    
    // Get booked dates for this location
    await useEventStore.getState().getBookedDates(location);
    
    // Show preferred dates modal
    useEventStore.getState().setPreferredDates({
      location: location,
      startDate: null,
      endDate: null
    });
    useEventStore.getState().togglePreferredDatesModal(true);
    
    // Reset location selection flag after a delay
    setTimeout(() => {
      setLocationSelectedFromDropdown(false);
    }, 2000);
  };

  // Helper function to check if a date is booked
  const isDateBooked = (date) => {
    const bookedDates = preferredDates.bookedDates;
    if (!bookedDates?.length || !date) return false;

    // Convert input date to local midnight
    const dateToCheck = new Date(date);
    dateToCheck.setHours(0, 0, 0, 0);
    const dateToCheckTimestamp = dateToCheck.getTime() / 1000; // Convert to seconds for comparison
    
     return bookedDates.some(booking => {
       // Get timestamps in seconds for comparison
       const startSeconds = booking.start.seconds;
       const endSeconds = booking.end.seconds;

       // Create Date objects for comparison
       const startDate = new Date(startSeconds * 1000);
       const endDate = new Date(endSeconds * 1000);
       startDate.setHours(0, 0, 0, 0);
       endDate.setHours(0, 0, 0, 0);
       
       // Compare using timestamps (in seconds)
       const startTimestamp = startDate.getTime() / 1000;
       const endTimestamp = endDate.getTime() / 1000;
       
       return dateToCheckTimestamp >= startTimestamp && dateToCheckTimestamp <= endTimestamp;
    });
  };

  // Helper function to get booked dates for calendar
  const getBookedDates = () => {
    if (!preferredDates.bookedDates?.length) return [];
    const bookedDates = preferredDates.bookedDates.map(booking => {
      const startDate = new Date(booking.start.seconds * 1000);
      const endDate = new Date(booking.end.seconds * 1000);
      const dates = [];
      
      // Generate all dates in the booking range
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }
      return dates;
    }).flat();
    
    return bookedDates;
  };

  // Helper function to get booking info for a date
  const getBookingInfo = (date) => {
    const bookedDates = preferredDates.bookedDates;
    if (!bookedDates?.length || !date) return null;

    const dateToCheck = new Date(date);
    dateToCheck.setHours(0, 0, 0, 0);
    const dateToCheckTimestamp = dateToCheck.getTime() / 1000;

    const booking = bookedDates.find(booking => {
      const startSeconds = booking.start.seconds;
      const endSeconds = booking.end.seconds;

      const startDate = new Date(startSeconds * 1000);
      const endDate = new Date(endSeconds * 1000);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);

      const startTimestamp = startDate.getTime() / 1000;
      const endTimestamp = endDate.getTime() / 1000;
      
      return dateToCheckTimestamp >= startTimestamp && dateToCheckTimestamp <= endTimestamp;
    });

    return booking ? `Booked by ${booking.department}` : null;
  };




  // Multiple locations helper functions
  const validateCurrentLocationForm = () => {
    const requiredFields = [
      { field: 'title', label: 'Event Title' },
      { field: 'requestor', label: 'Requestor' },
      { field: 'location', label: 'Location' }
    ];
    
    const missingFields = requiredFields.filter(({ field }) => {
      const value = formData[field];
      return !value || (typeof value === 'string' && !value.trim());
    });
    
    
    return missingFields.length === 0;
  };

  const saveCurrentLocationDraft = (showToast = false) => {
    const currentDraft = {
      ...formData,
      startDate: startDate ? startDate.toISOString().split('T')[0] : null,
      endDate: endDate ? endDate.toISOString().split('T')[0] : null,
      startTime: startTime,
      endTime: endTime,
      locationIndex: currentLocationIndex
    };
    
    
    setLocationDrafts(prev => {
      const newDrafts = [...prev];
      newDrafts[currentLocationIndex] = currentDraft;
      return newDrafts;
    });
    
    if (showToast) {
      toast.success(`Location ${currentLocationIndex + 1} saved with dates and schedule`);
    }
  };

  const handleNextLocation = () => {
    const requiredFields = [
      { field: 'title', label: 'Event Title' },
      { field: 'requestor', label: 'Requestor' },
      { field: 'location', label: 'Location' }
    ];
    
    const missingFields = requiredFields.filter(({ field }) => {
      const value = formData[field];
      return !value || (typeof value === 'string' && !value.trim());
    });

    if (missingFields.length > 0) {
      const missingFieldNames = missingFields.map(f => f.label).join(', ');
      toast.error(`Please fill in the following required fields: ${missingFieldNames}`);
      return;
    }

    // Save current form as draft
    saveCurrentLocationDraft();

    // Move to next location
    const nextIndex = currentLocationIndex + 1;
    setCurrentLocationIndex(nextIndex);

    // Clear form for next location - clear location-specific fields
    setFormData(prev => ({
      ...prev,
      title: '',        // Clear title for each location (different per location)
      requestor: '',    // Clear requestor for each location (different per location)
      location: '',
      classifications: '',
      participants: '', // Clear participants for each location
      vip: '',         // Clear VIP count for each location  
      vvip: '',        // Clear VVIP count for each location
      // Keep withGov as it applies to the overall event (same across all locations)
    }));

    // Reset dates and times for new location
    setStartDate(new Date());
    setEndDate(new Date());
    setStartTime("10:30");
    setEndTime("11:30");

    // Reset VIP/VVIP dropdown selections
    setVipCount("0");
    setVvipCount("0");
    setShowVVIP(false);

    // Clear any custom location input state
    setShowCustomLocationInput(false);
    setCustomLocation("");

    toast.success(`Saved location ${currentLocationIndex + 1}. Now configuring location ${nextIndex + 1}.`);
  };

  const { submitEventRequest, setPreferredDates, togglePreferredDatesModal } = useEventStore();
  const preferredDates = useEventStore((state) => state.preferredDates);

  // Effect to populate schedule dates from preferred dates
  useEffect(() => {
    // Check if we have stored preferred dates and they're not already set in the form
    if (preferredDates?.startDate && preferredDates?.endDate) {
      const preferredStart = new Date(preferredDates.startDate);
      const preferredEnd = new Date(preferredDates.endDate);
      const currentStart = startDate ? new Date(startDate) : null;
      const currentEnd = endDate ? new Date(endDate) : null;

      // Check if either date is booked
      if (isDateBooked(preferredStart) || isDateBooked(preferredEnd)) {
        toast.error("Cannot set schedule: One or more preferred dates are already booked");
        return;
      }

      // Only update if dates are different
      if (!currentStart || !currentEnd || 
          preferredStart.getTime() !== currentStart.getTime() || 
          preferredEnd.getTime() !== currentEnd.getTime()) {
        setStartDate(preferredStart);
        setEndDate(preferredEnd);
        setStartTime("10:30"); // Default start time
        setEndTime("11:30"); // Default end time
        
        // Also populate the location field if it's provided and current location is empty
        if (preferredDates?.location && !formData.location) {
          setFormData(prev => ({
            ...prev,
            location: preferredDates.location
          }));
        }
        
      }
    }
  }, [preferredDates?.startDate, preferredDates?.endDate, preferredDates?.location]);


  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      // Validate required fields - adjust based on location mode
      const baseRequiredFields = ['title', 'requestor', 'participants'];
      const requiredFields = hasMultipleLocations 
        ? baseRequiredFields // Skip location validation for multiple locations
        : [...baseRequiredFields, 'location']; // Include location for single location mode
      
      const missingFields = requiredFields.filter(field => !formData[field]);
      
      // Additional validation for multiple locations
      if (hasMultipleLocations && isInMultipleLocationMode) {
        if (locationDrafts.length === 0) {
          toast.error("Please add at least one location using the Next button");
          return;
        }
      }
      
      
      if (missingFields.length > 0) {
        toast.error(`Please fill in all required fields: ${missingFields.join(', ')}`);
        return;
      }
      
      // Additional validation checks
      if (!completedSteps.readyToSubmit) {
        toast.error("Please complete all required steps before submitting");
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

      // Upload local files to Cloudinary first
      const uploadedAttachments = [];
      for (const attachment of attachments) {
        if (attachment.isLocal && attachment.file) {
          try {
            const uploadedFile = await uploadFile(attachment.file);
            uploadedAttachments.push({
              name: attachment.name,
              size: attachment.size,
              type: attachment.type,
              url: uploadedFile.url,
              publicId: uploadedFile.publicId
            });
          } catch (error) {
            toast.error(`Failed to upload ${attachment.name}`);
            return;
          }
        } else {
          // File already uploaded
          uploadedAttachments.push({
            name: attachment.name,
            size: attachment.size,
            type: attachment.type,
            url: attachment.url,
            publicId: attachment.publicId
          });
        }
      }

      // Handle multiple locations vs single location submission
      let eventsToSubmit = [];
      
      if (hasMultipleLocations && isInMultipleLocationMode) {
        // Save current location as final draft if form is valid
        if (validateCurrentLocationForm()) {
          saveCurrentLocationDraft();
        }
        
        // Wait a moment for the state to update, then get the latest drafts
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Create separate events for each location draft
        const finalLocationDrafts = [...locationDrafts];
        
        // If current form has valid data and isn't already saved, add it
        if (validateCurrentLocationForm() && !finalLocationDrafts.find(draft => draft.locationIndex === currentLocationIndex)) {
          finalLocationDrafts.push({
            ...formData,
            startDate: startDate ? startDate.toISOString().split('T')[0] : null,
            endDate: endDate ? endDate.toISOString().split('T')[0] : null,
            startTime: startTime,
            endTime: endTime,
            locationIndex: currentLocationIndex
          });
        }
        
        for (const draft of finalLocationDrafts) {
          if (draft.location && draft.startDate && draft.endDate) {
            // Create timestamps for this specific location
            const [draftStartHours, draftStartMinutes] = draft.startTime.split(':');
            const draftStartEventDate = new Date(draft.startDate);
            draftStartEventDate.setHours(parseInt(draftStartHours), parseInt(draftStartMinutes));
            const draftStartTimestamp = Timestamp.fromDate(draftStartEventDate);

            const [draftEndHours, draftEndMinutes] = draft.endTime.split(':');
            const draftEndEventDate = new Date(draft.endDate);
            draftEndEventDate.setHours(parseInt(draftEndHours), parseInt(draftEndMinutes));
            const draftEndTimestamp = Timestamp.fromDate(draftEndEventDate);
            
            eventsToSubmit.push({
              // Use the draft's form data (which includes all the fields for that location)
              title: draft.title,
              requestor: draft.requestor,
              location: draft.location,
              participants: draft.participants,
              vip: draft.vip,
              vvip: draft.vvip,
              contactNumber: formData.contactNumber, // Contact info is same for all
              contactEmail: formData.contactEmail,
              classifications: draft.classifications,
              withGov: draft.withGov,
              startDate: draftStartTimestamp,
              endDate: draftEndTimestamp,
              isMultipleLocations: false, // Each event is now a single location
              locationIndex: draft.locationIndex + 1 // For identification
            });
          }
        }
      } else {
        // Single location - use the existing logic
        eventsToSubmit.push({
          title: formData.title,
          requestor: formData.requestor,
          location: formData.location,
          participants: formData.participants,
          vip: formData.vip,
          vvip: formData.vvip,
          contactNumber: formData.contactNumber,
          contactEmail: formData.contactEmail,
          classifications: formData.classifications,
          withGov: formData.withGov,
          startDate: startTimestamp,
          endDate: endTimestamp,
          isMultipleLocations: false
        });
      }

      // Upload Governor's Requirements files
      const uploadedGovAttachments = {};
      if (govAttachments.brieferTemplate) {
        try {
          const uploadedFile = await uploadFile(govAttachments.brieferTemplate);
          uploadedGovAttachments.brieferTemplate = {
            name: govAttachments.brieferTemplate.name,
            size: govAttachments.brieferTemplate.size,
            type: govAttachments.brieferTemplate.type,
            url: uploadedFile.url,
            publicId: uploadedFile.publicId
          };
        } catch (error) {
          toast.error('Failed to upload briefer template');
          return;
        }
      }

      if (govAttachments.programme) {
        try {
          const uploadedFile = await uploadFile(govAttachments.programme);
          uploadedGovAttachments.programme = {
            name: govAttachments.programme.name,
            size: govAttachments.programme.size,
            type: govAttachments.programme.type,
            url: uploadedFile.url,
            publicId: uploadedFile.publicId
          };
        } catch (error) {
          console.error('Error uploading programme:', error);
          toast.error('Failed to upload programme');
          return;
        }
      }

      if (govAttachments.availableForDLBriefer) {
        try {
          const uploadedFile = await uploadFile(govAttachments.availableForDLBriefer);
          uploadedGovAttachments.availableForDLBriefer = {
            name: govAttachments.availableForDLBriefer.name,
            size: govAttachments.availableForDLBriefer.size,
            type: govAttachments.availableForDLBriefer.type,
            url: uploadedFile.url,
            publicId: uploadedFile.publicId
          };
        } catch (error) {
          console.error('Error uploading available for DL briefer:', error);
          toast.error('Failed to upload available for DL briefer');
          return;
        }
      }

      // Upload ECR file if exists
      let uploadedEcrFile = null;
      if (ecrFile) {
        try {
          const uploadedFile = await uploadFile(ecrFile);
          uploadedEcrFile = {
            name: ecrFile.name,
            size: ecrFile.size,
            type: ecrFile.type,
            url: uploadedFile.url,
            publicId: uploadedFile.publicId
          };
        } catch (error) {
          console.error('Error uploading ECR file:', error);
          toast.error('Failed to upload ECR file');
          return;
        }
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

      // Submit each event separately
      let successCount = 0;
      let failCount = 0;
      
      
      for (const eventData of eventsToSubmit) {
        const eventDataWithUser = {
          ...eventData,
          departmentRequirements: formattedDepartmentRequirements,
          attachments: uploadedAttachments,
          govAttachments: uploadedGovAttachments,
          ecrFile: uploadedEcrFile,
          userId: currentUser.uid,
          userEmail: currentUser.email,
          userName: userData.username || userData.name || currentUser.email,
          department: userData.department || 'Not specified',
          // Add fields for easy identification in MyEvents page
          eventTitle: eventData.title,
          eventLocation: eventData.location,
          eventRequestor: eventData.requestor,
          eventParticipants: eventData.participants,
          eventStartDate: eventData.startDate,
          eventEndDate: eventData.endDate,
          multiLocationIndex: eventData.locationIndex || null
        };

        try {
          const result = await submitEventRequest(eventDataWithUser);
          if (result.success) {
            successCount++;
          } else {
            failCount++;
            console.error('Failed to submit event:', result.error);
          }
        } catch (error) {
          failCount++;
          console.error('Error submitting event:', error);
        }
      }
      
      // Show appropriate success/error messages
      if (successCount > 0 && failCount === 0) {
        if (eventsToSubmit.length > 1) {
          toast.success(`All ${successCount} location events submitted successfully!`);
        } else {
          toast.success("Event request submitted successfully");
        }
        navigate('/my-events');
      } else if (successCount > 0 && failCount > 0) {
        toast.warning(`${successCount} events submitted successfully, ${failCount} failed`);
        navigate('/my-events');
      } else {
        toast.error("Failed to submit event request(s)");
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
      className="max-w-7xl mx-auto px-2 sm:px-4 pt-2 pb-6"
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
        <div className="relative grid grid-cols-3 grid-rows-2 gap-3 sm:flex sm:flex-row sm:items-center sm:justify-between max-w-5xl mx-auto px-1 sm:px-2 sm:gap-0">
          {/* Event Details Step - Position 1 (Row 1, Col 1) */}
          <div className="flex items-center flex-col relative z-10 col-start-1 row-start-1 sm:col-auto sm:row-auto">
            <div className={cn(
              "w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center mb-1 sm:mb-1.5 transition-colors duration-200",
              completedSteps.eventDetails
                ? "bg-black"
                : isDarkMode ? "bg-zinc-800" : "bg-gray-100"
            )}>
              <FileText className={cn(
                "w-3 h-3 sm:w-4 sm:h-4",
                completedSteps.eventDetails
                  ? "text-white"
                  : isDarkMode ? "text-gray-300" : "text-gray-600"
              )} />
            </div>
            <span className={cn(
              "text-[9px] sm:text-xs font-medium text-center",
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

          {/* Attachments Step - Position 2 (Row 1, Col 2) */}
          <div className="flex flex-col items-center relative z-10 col-start-2 row-start-1 sm:col-auto sm:row-auto">
            <div className={cn(
              "w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center mb-1 sm:mb-1.5 transition-colors duration-200",
              completedSteps.attachments
                ? "bg-black"
                : isDarkMode ? "bg-zinc-800" : "bg-gray-100"
            )}>
              <FileText className={cn(
                "w-3 h-3 sm:w-4 sm:h-4",
                completedSteps.attachments
                  ? "text-white"
                  : isDarkMode ? "text-gray-300" : "text-gray-600"
              )} />
            </div>
            <span className={cn(
              "text-[9px] sm:text-xs font-medium text-center",
              isDarkMode ? "text-gray-300" : "text-gray-600"
            )}>Attachments</span>
          </div>

          {/* Connecting Line 2 */}
          <div className="hidden sm:block flex-1 h-[1px] relative -mx-1">
            <div className={cn(
              "absolute inset-0",
              isDarkMode ? "bg-zinc-700" : "bg-gray-200"
            )} />
            <div className={cn(
              "absolute inset-0 transition-all duration-200",
              (completedSteps.eventDetails && completedSteps.attachments) ? "bg-black" : "w-0"
            )} />
          </div>

          {/* Tag Departments Step - Position 3 (Row 1, Col 3) */}
          <div className="flex flex-col items-center relative z-10 col-start-3 row-start-1 sm:col-auto sm:row-auto">
            <div className={cn(
              "w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center mb-1 sm:mb-1.5 transition-colors duration-200",
              completedSteps.tagDepartments
                ? "bg-black"
                : (!completedSteps.eventDetails || !completedSteps.attachments)
                  ? isDarkMode ? "bg-zinc-700" : "bg-gray-200"
                  : isDarkMode ? "bg-zinc-800" : "bg-gray-100"
            )}>
              <Building2 className={cn(
                "w-3 h-3 sm:w-4 sm:h-4",
                completedSteps.tagDepartments
                  ? "text-white"
                  : (!completedSteps.eventDetails || !completedSteps.attachments)
                    ? isDarkMode ? "text-gray-500" : "text-gray-400"
                    : isDarkMode ? "text-gray-300" : "text-gray-600"
              )} />
            </div>
            <span className={cn(
              "text-[9px] sm:text-xs font-medium text-center",
              (!completedSteps.eventDetails || !completedSteps.attachments)
                ? isDarkMode ? "text-gray-500" : "text-gray-400"
                : isDarkMode ? "text-gray-300" : "text-gray-600"
            )}>Tag Departments</span>
          </div>

          {/* Connecting Line 3 */}
          <div className="hidden sm:block flex-1 h-[1px] relative -mx-1">
            <div className={cn(
              "absolute inset-0",
              isDarkMode ? "bg-zinc-700" : "bg-gray-200"
            )} />
            <div className={cn(
              "absolute inset-0 transition-all duration-200",
              (completedSteps.eventDetails && completedSteps.attachments && completedSteps.tagDepartments) ? "bg-black" : "w-0"
            )} />
          </div>

          {/* Requirements Step - Position 4 (Row 2, Col 1) */}
          <div className="flex flex-col items-center relative z-10 col-start-1 row-start-2 sm:col-auto sm:row-auto">
            <div className={cn(
              "w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center mb-1 sm:mb-1.5 transition-colors duration-200",
              completedSteps.requirements
                ? "bg-black"
                : (!completedSteps.eventDetails || !completedSteps.attachments || !completedSteps.tagDepartments)
                  ? isDarkMode ? "bg-zinc-700" : "bg-gray-200"
                  : isDarkMode ? "bg-zinc-800" : "bg-gray-100"
            )}>
              <FileText className={cn(
                "w-3 h-3 sm:w-4 sm:h-4",
                completedSteps.requirements
                  ? "text-white"
                  : (!completedSteps.eventDetails || !completedSteps.attachments || !completedSteps.tagDepartments)
                    ? isDarkMode ? "text-gray-500" : "text-gray-400"
                    : isDarkMode ? "text-gray-300" : "text-gray-600"
              )} />
            </div>
            <span className={cn(
              "text-[9px] sm:text-xs font-medium text-center",
              (!completedSteps.eventDetails || !completedSteps.attachments || !completedSteps.tagDepartments)
                ? isDarkMode ? "text-gray-500" : "text-gray-400"
                : isDarkMode ? "text-gray-300" : "text-gray-600"
            )}>Requirements</span>
          </div>

          {/* Connecting Line 4 */}
          <div className="hidden sm:block flex-1 h-[1px] relative -mx-1">
            <div className={cn(
              "absolute inset-0",
              isDarkMode ? "bg-zinc-700" : "bg-gray-200"
            )} />
            <div className={cn(
              "absolute inset-0 transition-all duration-200",
              (completedSteps.eventDetails && completedSteps.attachments && completedSteps.tagDepartments && completedSteps.requirements) ? "bg-black" : "w-0"
            )} />
          </div>

          {/* Schedule Step - Position 5 (Row 2, Col 2) */}
          <div className="flex flex-col items-center relative z-10 col-start-2 row-start-2 sm:col-auto sm:row-auto">
            <div className={cn(
              "w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center mb-1 sm:mb-1.5 transition-colors duration-200",
              completedSteps.schedule
                ? "bg-black"
                : (!completedSteps.eventDetails || !completedSteps.attachments || !completedSteps.tagDepartments || !completedSteps.requirements)
                  ? isDarkMode ? "bg-zinc-700" : "bg-gray-200"
                  : isDarkMode ? "bg-zinc-800" : "bg-gray-100"
            )}>
              <CalendarIcon className={cn(
                "w-3 h-3 sm:w-4 sm:h-4",
                completedSteps.schedule
                  ? "text-white"
                  : (!completedSteps.eventDetails || !completedSteps.attachments || !completedSteps.tagDepartments || !completedSteps.requirements)
                    ? isDarkMode ? "text-gray-500" : "text-gray-400"
                    : isDarkMode ? "text-gray-300" : "text-gray-600"
              )} />
            </div>
            <span className={cn(
              "text-[9px] sm:text-xs font-medium text-center",
              (!completedSteps.eventDetails || !completedSteps.attachments || !completedSteps.tagDepartments || !completedSteps.requirements)
                ? isDarkMode ? "text-gray-500" : "text-gray-400"
                : isDarkMode ? "text-gray-300" : "text-gray-600"
            )}>Schedule</span>
          </div>

          {/* Connecting Line 5 */}
          <div className="hidden sm:block flex-1 h-[1px] relative -mx-1">
            <div className={cn(
              "absolute inset-0",
              isDarkMode ? "bg-zinc-700" : "bg-gray-200"
            )} />
            <div className={cn(
              "absolute inset-0 transition-all duration-200",
              (completedSteps.eventDetails && completedSteps.attachments && completedSteps.tagDepartments && completedSteps.requirements && completedSteps.schedule) ? "bg-black" : "w-0"
            )} />
          </div>

          {/* Ready to Submit Step - Position 6 (Row 2, Col 3) */}
          <div className="flex flex-col items-center relative z-10 col-start-3 row-start-2 sm:col-auto sm:row-auto">
            <div className={cn(
              "w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center mb-1 sm:mb-1.5 transition-colors duration-200",
              completedSteps.readyToSubmit
                ? "bg-black"
                : (!completedSteps.eventDetails || !completedSteps.attachments || !completedSteps.tagDepartments || !completedSteps.requirements || !completedSteps.schedule)
                  ? isDarkMode ? "bg-zinc-700" : "bg-gray-200"
                  : isDarkMode ? "bg-zinc-800" : "bg-gray-100"
            )}>
              <Send className={cn(
                "w-3 h-3 sm:w-4 sm:h-4",
                completedSteps.readyToSubmit
                  ? "text-white"
                  : (!completedSteps.eventDetails || !completedSteps.attachments || !completedSteps.tagDepartments || !completedSteps.requirements || !completedSteps.schedule)
                    ? isDarkMode ? "text-gray-500" : "text-gray-400"
                    : isDarkMode ? "text-gray-300" : "text-gray-600"
              )} />
            </div>
            <span className={cn(
              "text-[9px] sm:text-xs font-medium text-center",
              (!completedSteps.eventDetails || !completedSteps.attachments || !completedSteps.tagDepartments || !completedSteps.requirements || !completedSteps.schedule)
                ? isDarkMode ? "text-gray-500" : "text-gray-400"
                : isDarkMode ? "text-gray-300" : "text-gray-600"
            )}>Ready to Submit</span>
          </div>
        </div>
      </motion.div>

      {/* Main Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6">
        {/* Left Column - Main Details */}
        <motion.div 
          variants={item}
          className="lg:col-span-2 space-y-3 sm:space-y-5"
        >
          {/* Event Details Card */}
          <div className={cn(
            "rounded-xl p-3 sm:p-6 shadow-sm",
            isDarkMode ? "bg-slate-800" : "bg-white"
          )}>
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <Badge variant="outline" className={cn(
                "px-2 py-1 sm:px-3 rounded-full text-xs sm:text-sm font-semibold",
                isDarkMode ? "border-gray-700 text-gray-300" : "border-gray-200 text-gray-600"
              )}>
                Step 1
              </Badge>
              <h2 className={cn(
                "text-xl sm:text-2xl font-bold",
                isDarkMode ? "text-gray-100" : "text-gray-900"
              )}>Event Details</h2>
            </div>
            
            <div className="space-y-4 sm:space-y-6">
              {/* Title and Requestor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
                      "rounded-lg h-10 sm:h-12 text-sm sm:text-base px-3 sm:px-4",
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
                    <User className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                    <Input
                      name="requestor"
                      type="text"
                      required
                      value={formData.requestor}
                      onChange={handleInputChange}
                      autoComplete={isStepActive('eventDetails') ? "on" : "off"}
                      placeholder="Your name"
                      className={cn(
                        "pl-10 sm:pl-12 rounded-lg h-10 sm:h-12 text-sm sm:text-base",
                        isDarkMode 
                          ? "bg-slate-900 border-slate-700" 
                          : "bg-white border-gray-200"
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* Location and Number of Participants */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Location */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className={cn("text-sm font-semibold", isDarkMode ? "text-gray-300" : "text-gray-700")}>
                      {hasMultipleLocations && isInMultipleLocationMode 
                        ? `Location ${currentLocationIndex + 1}` 
                        : "Location"
                      }
                    </Label>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <span className={cn("text-[10px] sm:text-xs", isDarkMode ? "text-gray-400" : "text-gray-500")}>
                        Multiple locations
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setHasMultipleLocations(!hasMultipleLocations);
                          if (!hasMultipleLocations) {
                            // Entering multiple location mode
                            setIsInMultipleLocationMode(true);
                            setCurrentLocationIndex(0);
                            setLocationDrafts([]);
                            // Clear single location field
                            setFormData(prev => ({ ...prev, location: '' }));
                          } else {
                            // Exiting multiple location mode
                            setIsInMultipleLocationMode(false);
                            setCurrentLocationIndex(0);
                            setLocationDrafts([]);
                          }
                        }}
                        className={cn(
                          "relative inline-flex h-4 w-7 sm:h-5 sm:w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2",
                          hasMultipleLocations ? "bg-black" : "bg-gray-200"
                        )}
                      >
                        <span
                          className={cn(
                            "inline-block h-2.5 w-2.5 sm:h-3 sm:w-3 transform rounded-full bg-white transition-transform",
                            hasMultipleLocations ? "translate-x-3.5 sm:translate-x-5" : "translate-x-0.5 sm:translate-x-1"
                          )}
                        />
                      </button>
                    </div>
                  </div>
                  {!hasMultipleLocations ? (
                    <Popover open={isLocationOpen} onOpenChange={setIsLocationOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={isLocationOpen}
                          className={cn(
                            "w-full justify-between h-12 text-base pl-12",
                            isDarkMode 
                              ? "bg-slate-800 border-slate-700 text-white hover:bg-slate-700" 
                              : "bg-white border-gray-200 text-gray-900 hover:bg-gray-50"
                          )}
                        >
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                          {formData.location || "Select location..."}
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                    <PopoverContent 
                      side="bottom"
                      align="start"
                      sideOffset={4}
                      avoidCollisions={false}
                      className={cn(
                        "w-[--radix-popover-trigger-width] max-h-[300px] p-0",
                        isDarkMode ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200"
                      )}
                    >
                      <Command className={isDarkMode ? "bg-slate-900" : "bg-white"}>
                        <CommandInput 
                          placeholder="Search locations..." 
                          className={isDarkMode ? "text-white" : "text-gray-900"}
                        />
                        <CommandEmpty className={cn(
                          "py-6 text-center text-sm",
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        )}>
                          No location found.
                        </CommandEmpty>
                        <CommandGroup className="max-h-[200px] overflow-y-auto">
                          <CommandItem
                            onSelect={() => {
                              setShowCustomLocationInput(true);
                              setIsLocationOpen(false);
                            }}
                            className={cn(
                              "cursor-pointer border-b",
                              isDarkMode 
                                ? "text-blue-400 hover:bg-slate-800 border-slate-700" 
                                : "text-blue-600 hover:bg-gray-100 border-gray-200"
                            )}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add custom location
                          </CommandItem>
                          {defaultLocations.map((location) => (
                            <CommandItem
                              key={location}
                              value={location}
                              onSelect={async (currentValue) => {
                                setFormData(prev => ({ ...prev, location: currentValue }));
                                setShowCustomLocationInput(false);
                                setCustomLocation("");
                                setIsLocationOpen(false);
                                
                                // Get booked dates for this location
                                await useEventStore.getState().getBookedDates(currentValue);
                                
                                // Show preferred dates modal
                                useEventStore.getState().setPreferredDates({
                                  location: currentValue,
                                  startDate: null,
                                  endDate: null
                                });
                                useEventStore.getState().togglePreferredDatesModal(true);
                              }}
                              className={cn(
                                "cursor-pointer",
                                isDarkMode 
                                  ? "text-gray-200 hover:bg-slate-800" 
                                  : "text-gray-900 hover:bg-gray-100"
                              )}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.location === location ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {location}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  ) : (
                    <Popover open={isLocationOpen} onOpenChange={setIsLocationOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={isLocationOpen}
                          className={cn(
                            "w-full justify-between h-12 text-base pl-12",
                            isDarkMode 
                              ? "bg-slate-800 border-slate-700 text-white hover:bg-slate-700" 
                              : "bg-white border-gray-200 text-gray-900 hover:bg-gray-50"
                          )}
                        >
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                          {formData.location || "Select location..."}
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                    <PopoverContent 
                      side="bottom"
                      align="start"
                      sideOffset={4}
                      avoidCollisions={false}
                      className={cn(
                        "w-[--radix-popover-trigger-width] max-h-[300px] p-0",
                        isDarkMode ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200"
                      )}
                    >
                      <Command className={isDarkMode ? "bg-slate-900" : "bg-white"}>
                        <CommandInput 
                          placeholder="Search locations..." 
                          className={isDarkMode ? "text-white" : "text-gray-900"}
                        />
                        <CommandEmpty className={cn(
                          "py-6 text-center text-sm",
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        )}>
                          No location found.
                        </CommandEmpty>
                        <CommandGroup className="max-h-[200px] overflow-y-auto">
                          <CommandItem
                            onSelect={() => {
                              setShowCustomLocationInput(true);
                              setIsLocationOpen(false);
                            }}
                            className={cn(
                              "cursor-pointer border-b",
                              isDarkMode 
                                ? "text-blue-400 hover:bg-slate-800 border-slate-700" 
                                : "text-blue-600 hover:bg-gray-100 border-gray-200"
                            )}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add custom location
                          </CommandItem>
                          {defaultLocations.map((location) => (
                            <CommandItem
                              key={location}
                              value={location}
                              onSelect={async (currentValue) => {
                                setFormData(prev => ({ ...prev, location: currentValue }));
                                setShowCustomLocationInput(false);
                                setCustomLocation("");
                                setIsLocationOpen(false);
                                
                                // Get booked dates for this location
                                await useEventStore.getState().getBookedDates(currentValue);
                                
                                // Show preferred dates modal
                                useEventStore.getState().setPreferredDates({
                                  location: currentValue,
                                  startDate: null,
                                  endDate: null
                                });
                                useEventStore.getState().togglePreferredDatesModal(true);
                              }}
                              className={cn(
                                "cursor-pointer",
                                isDarkMode 
                                  ? "text-gray-200 hover:bg-slate-800" 
                                  : "text-gray-900 hover:bg-gray-100"
                              )}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.location === location ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {location}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  )}

                  {/* Custom Location Input */}
                  {showCustomLocationInput && (
                    <div className="space-y-2 mt-2">
                      <Label className={cn(
                        "text-sm font-medium",
                        isDarkMode ? "text-gray-200" : "text-gray-700"
                      )}>
                        Custom Location
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter custom location"
                          value={customLocation}
                          onChange={(e) => setCustomLocation(e.target.value)}
                          className={cn(
                            "h-12 flex-1",
                            isDarkMode 
                              ? "bg-slate-800 border-slate-700" 
                              : "bg-white border-gray-200"
                          )}
                        />
                        <Button
                          type="button"
                          onClick={async () => {
                            if (customLocation.trim()) {
                              setFormData(prev => ({ ...prev, location: customLocation.trim() }));
                              setShowCustomLocationInput(false);
                              setCustomLocation("");
                              
                              // Get booked dates for this location
                              await useEventStore.getState().getBookedDates(customLocation.trim());
                              
                              // Show preferred dates modal
                              useEventStore.getState().setPreferredDates({
                                location: customLocation.trim(),
                                startDate: null,
                                endDate: null
                              });
                              useEventStore.getState().togglePreferredDatesModal(true);
                            }
                          }}
                          className="bg-black hover:bg-gray-800 text-white h-12"
                        >
                          Add
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowCustomLocationInput(false);
                            setCustomLocation("");
                          }}
                          className={cn(
                            "h-12",
                            isDarkMode 
                              ? "border-slate-700 text-gray-300 hover:bg-slate-800" 
                              : "border-gray-200 text-gray-700 hover:bg-gray-100"
                          )}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* No. of Participants */}
                <div className="space-y-2">
                  <Label className={cn("text-sm font-semibold", isDarkMode ? "text-gray-300" : "text-gray-700")}>
                    No. of Participants
                  </Label>
                  <div className="relative">
                    <Users className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
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
                        "pl-10 sm:pl-12 rounded-lg h-10 sm:h-12 text-sm sm:text-base",
                        isDarkMode 
                          ? "bg-slate-900 border-slate-700" 
                          : "bg-white border-gray-200"
                      )}
                    />
                  </div>
                </div>

              </div>

              {/* VIP, VVIP, and Governor Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                {/* VIP */}
                <div className="space-y-2">
                  <Label className={cn("text-sm font-semibold", isDarkMode ? "text-gray-300" : "text-gray-700")}>
                    Number of VIP
                  </Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      name="vip"
                      value={formData.vip}
                      onChange={handleInputChange}
                      type="number"
                      min="0"
                      autoComplete={isStepActive('eventDetails') ? "on" : "off"}
                      placeholder="VIPs"
                      className={cn(
                        "pl-10 rounded-lg h-10 sm:h-12 text-sm sm:text-base",
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
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      name="vvip"
                      value={formData.vvip}
                      onChange={handleInputChange}
                      type="number"
                      min="0"
                      autoComplete={isStepActive('eventDetails') ? "on" : "off"}
                      placeholder="VVIPs"
                      className={cn(
                        "pl-10 rounded-lg h-10 sm:h-12 text-sm sm:text-base",
                        isDarkMode 
                          ? "bg-slate-900 border-slate-700" 
                          : "bg-white border-gray-200"
                      )}
                    />
                  </div>
                </div>

                {/* Governor Involvement */}
                <div className="space-y-2">
                  <Label className={cn("text-sm font-semibold", isDarkMode ? "text-gray-300" : "text-gray-700")}>
                    With Governor
                  </Label>
                  <button
                    type="button"
                    onClick={() => {
                      const newValue = !formData.withGov;
                      setFormData(prev => ({ ...prev, withGov: newValue }));
                      if (newValue) {
                        setShowGovModal(true);
                      }
                    }}
                    className={cn(
                      "w-full h-10 sm:h-12 rounded-lg border-2 transition-all duration-200 ease-in-out",
                      "flex items-center justify-center gap-1 sm:gap-2 font-medium text-xs sm:text-sm",
                      "hover:scale-[1.02] active:scale-[0.98]",
                      formData.withGov 
                        ? "bg-gradient-to-r from-blue-500 to-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/25" 
                        : isDarkMode 
                          ? "bg-slate-800 border-slate-600 text-gray-300 hover:bg-slate-700 hover:border-slate-500" 
                          : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400"
                    )}
                  >
                    <Shield className={cn(
                      "h-4 w-4 transition-all duration-200", 
                      formData.withGov 
                        ? "text-white" 
                        : isDarkMode ? "text-gray-400" : "text-gray-500"
                    )} />
                    <span className="transition-all duration-200">
                      {formData.withGov ? "Governor Involved" : "No Governor"}
                    </span>
                    {formData.withGov && (
                      <div className={cn(
                        "w-2 h-2 rounded-full bg-white animate-pulse"
                      )} />
                    )}
                  </button>
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
                    "w-full min-h-[80px] sm:min-h-[100px] rounded-lg p-2 sm:p-3 text-sm sm:text-base resize-none border-2",
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
                  onChange={(e) => {
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

                    // Store files locally without uploading to Cloudinary
                    const fileObjects = files.map(file => ({
                      name: file.name,
                      size: file.size,
                      type: file.type,
                      file: file, // Store the actual file object for later upload
                      url: null, // Will be set after upload during form submission
                      publicId: null, // Will be set after upload during form submission
                      isLocal: true // Flag to indicate this is a local file not yet uploaded
                    }));

                    setAttachments(prev => [...prev, ...fileObjects]);
                    toast.success(`${files.length} file${files.length > 1 ? 's' : ''} added. Files will be uploaded when you submit the event.`);
                  }}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                />

                <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                  {/* Upload Button */}
                  <div className="shrink-0">
                    <Button
                      variant="outline"
                      className={cn(
                        "h-8 sm:h-9 px-3 sm:px-4 flex items-center gap-2 text-sm",
                        isDarkMode 
                          ? "border-gray-600 hover:bg-slate-800" 
                          : "border-gray-300 hover:bg-gray-100"
                      )}
                      onClick={() => document.getElementById('file-upload').click()}
                    >
                      <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span>Upload Files</span>
                    </Button>
                    <p className={cn(
                      "text-[10px] sm:text-[11px] mt-1",
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
                                    "text-[11px] shrink-0 flex items-center gap-1",
                                    isDarkMode ? "text-gray-400" : "text-gray-500"
                                  )}>
                                    ({formatFileSize(file.size)})
                                    {file.wasCompressed && (
                                      <span className={cn(
                                        "text-[10px] px-1 py-0.5 rounded bg-green-100 text-green-700",
                                        isDarkMode && "bg-green-900/30 text-green-400"
                                      )}>
                                        compressed
                                      </span>
                                    )}
                                    {!file.wasCompressed && file.originalSize && (file.originalSize / (1024 * 1024)) > 2 && (
                                      <span className={cn(
                                        "text-[10px] px-1 py-0.5 rounded bg-blue-100 text-blue-700",
                                        isDarkMode && "bg-blue-900/30 text-blue-400"
                                      )}>
                                        optimized
                                      </span>
                                    )}
                                  </span>
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

              {/* Next Button for Multiple Locations */}
              {hasMultipleLocations && isInMultipleLocationMode && (
                <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200 dark:border-gray-600">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                    <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                      {locationDrafts.length > 0 && (
                        <span>
                          {locationDrafts.length} location{locationDrafts.length > 1 ? 's' : ''} saved. 
                        </span>
                      )}
                      <span className="ml-1 sm:ml-2">
                        Currently configuring location {currentLocationIndex + 1}
                      </span>
                      {locationDrafts[currentLocationIndex] && 
                       locationDrafts[currentLocationIndex].location && 
                       locationDrafts[currentLocationIndex].participants && (
                        <span className="ml-1 sm:ml-2 text-green-600 dark:text-green-400 text-xs">
                          ✓ Auto-saved
                        </span>
                      )}
                    </div>
                    <Button
                      type="button"
                      onClick={handleNextLocation}
                      disabled={!validateCurrentLocationForm()}
                      className={cn(
                        "flex items-center gap-1 sm:gap-2 px-4 sm:px-6 py-2 rounded-lg font-medium transition-all duration-200 text-sm",
                        validateCurrentLocationForm()
                          ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg"
                          : "bg-gray-300 text-gray-500 cursor-not-allowed"
                      )}
                    >
                      <span>Next Location</span>
                      <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                  {!validateCurrentLocationForm() && (
                    <p className="text-xs text-red-500 mt-2 text-center sm:text-right">
                      Please fill in all required fields to continue
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Tag Departments Card */}
          <div className={cn(
            "rounded-xl p-3 sm:p-6 shadow-sm mt-3 sm:mt-5 relative",
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
              "text-sm mb-4",
              isDarkMode ? "text-gray-400" : "text-gray-500"
            )}>Select departments to notify about this event's requirements and coordinate resources needed.</p>
            
            {/* Search Input */}
            <div className="mb-4">
              <div className="relative">
                <Search className={cn(
                  "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4",
                  isDarkMode ? "text-gray-400" : "text-gray-500"
                )} />
                <Input
                  placeholder="Search departments..."
                  value={departmentSearchQuery}
                  onChange={(e) => setDepartmentSearchQuery(e.target.value)}
                  className={cn(
                    "pl-10 h-10",
                    isDarkMode 
                      ? "bg-slate-900 border-slate-700 placeholder:text-gray-400" 
                      : "bg-white border-gray-200 placeholder:text-gray-500"
                  )}
                />
                {departmentSearchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDepartmentSearchQuery("")}
                    className={cn(
                      "absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6",
                      isDarkMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900"
                    )}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
            
            {/* Departments List - Scrollable */}
            <div className="space-y-4">
              <div className={cn(
                "max-h-80 overflow-y-auto space-y-3 pr-2",
                "scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent"
              )}>
                {filteredDepartments.length > 0 ? (
                  filteredDepartments.map((dept) => (
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
                  ))
                ) : (
                  <div className={cn(
                    "flex flex-col items-center justify-center py-8 text-center",
                    isDarkMode ? "text-gray-400" : "text-gray-500"
                  )}>
                    <Building2 className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm font-medium">No departments found</p>
                    <p className="text-xs mt-1">
                      {departmentSearchQuery 
                        ? `No departments match "${departmentSearchQuery}"`
                        : "No departments available"
                      }
                    </p>
                  </div>
                )}
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
              {hasMultipleLocations && isInMultipleLocationMode ? (
                /* Multiple Locations Schedule Display */
                <div className="space-y-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Schedule configured for multiple locations
                  </div>
                  {locationDrafts.map((draft, index) => (
                    <div key={index} className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border-0">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {draft.location || `Location ${index + 1}`}
                        </h4>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Start:</span>
                          <div className="font-medium">
                            {draft.startDate && draft.startTime ? (
                              `${new Date(draft.startDate).toLocaleDateString()} at ${(() => {
                                const [hours, minutes] = draft.startTime.split(':');
                                const hour = parseInt(hours);
                                const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                                const ampm = hour < 12 ? 'AM' : 'PM';
                                return `${displayHour}:${minutes} ${ampm}`;
                              })()}`
                            ) : (
                              <span className="text-gray-400">Not set</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">End:</span>
                          <div className="font-medium">
                            {draft.endDate && draft.endTime ? (
                              `${new Date(draft.endDate).toLocaleDateString()} at ${(() => {
                                const [hours, minutes] = draft.endTime.split(':');
                                const hour = parseInt(hours);
                                const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                                const ampm = hour < 12 ? 'AM' : 'PM';
                                return `${displayHour}:${minutes} ${ampm}`;
                              })()}`
                            ) : (
                              <span className="text-gray-400">Not set</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {locationDrafts.length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      No locations configured yet. Use the Next button in Event Details to add locations.
                    </div>
                  )}
                </div>
              ) : (
                /* Single Location Schedule */
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
                            <ModernCalendar
                              selectedDate={startDate}
                              onDateSelect={(newDate) => {
                                setStartDate(newDate);
                                setIsStartCalendarOpen(false);
                              }}
                              isDarkMode={isDarkMode}
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
                            <ModernCalendar
                              selectedDate={endDate}
                              onDateSelect={(newDate) => {
                                setEndDate(newDate);
                                setIsEndCalendarOpen(false);
                              }}
                              isDarkMode={isDarkMode}
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
              )}

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
                  {isCompressing ? "Compressing Files..." : "Uploading Files..."}
                </h3>
                <p className={cn(
                  "text-sm",
                  isDarkMode ? "text-gray-400" : "text-gray-500"
                )}>
                  {isCompressing 
                    ? "Compressing large files (>2MB) to reduce size..." 
                    : "Please wait while we upload your files"
                  }
                </p>
              </div>

              {/* Progress Bars */}
              <div className="w-full space-y-3">
                {/* Compression Progress */}
                {isCompressing && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className={cn(
                        "text-xs font-medium",
                        isDarkMode ? "text-gray-300" : "text-gray-600"
                      )}>
                        Compression Progress
                      </span>
                      <span className={cn(
                        "text-xs",
                        isDarkMode ? "text-gray-400" : "text-gray-500"
                      )}>
                        {compressionProgress}%
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full overflow-hidden bg-gray-100 dark:bg-slate-800">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          isDarkMode ? "bg-orange-500" : "bg-orange-600"
                        )}
                        style={{ width: `${compressionProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Upload Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className={cn(
                      "text-xs font-medium",
                      isDarkMode ? "text-gray-300" : "text-gray-600"
                    )}>
                      Upload Progress
                    </span>
                    <span className={cn(
                      "text-xs",
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    )}>
                      {uploadProgress}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full overflow-hidden bg-gray-100 dark:bg-slate-800">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        isDarkMode ? "bg-blue-500" : "bg-blue-600"
                      )}
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
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

      {/* Preferred Dates Modal */}
      <Dialog open={preferredDates.showModal} onOpenChange={(open) => togglePreferredDatesModal(open)}>
        <DialogContent className={cn(
          "sm:max-w-[500px] p-0 border-0",
          isDarkMode ? "bg-zinc-900" : "bg-white"
        )}>
          <div className="p-6">
            <div className="flex flex-col gap-6">
              {/* Modal Header */}
              <div>
                <h3 className={cn(
                  "text-2xl font-bold tracking-tight",
                  isDarkMode ? "text-white" : "text-zinc-900"
                )}>
                  Preferred Dates
                </h3>
                <p className={cn(
                  "text-sm mt-2",
                  isDarkMode ? "text-zinc-400" : "text-zinc-500"
                )}>
                  Select your preferred dates for {preferredDates.location}
                </p>
              </div>

              {/* Date and Time Selection */}
              <div className="grid grid-cols-2 gap-4">
                {/* Start Date and Time */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className={cn(
                      "text-sm font-medium",
                      isDarkMode ? "text-gray-300" : "text-gray-700"
                    )}>
                      Preferred Start Date & Time
                    </Label>
                  <div className="relative">
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        "h-10 pl-3 text-sm",
                        !preferredDates.startDate && "text-muted-foreground",
                        isDarkMode 
                          ? "bg-zinc-800 border-zinc-700" 
                          : "bg-white border-zinc-200"
                      )}
                      onClick={() => setIsPreferredStartCalendarOpen(true)}
                    >
                      {preferredDates.startDate ? format(preferredDates.startDate, "MMM dd, yyyy") : <span>Pick a date</span>}
                    </Button>
                    <Popover open={isPreferredStartCalendarOpen} onOpenChange={setIsPreferredStartCalendarOpen}>
                      <PopoverTrigger asChild>
                        <div className="absolute inset-0" />
                      </PopoverTrigger>
                      <PopoverContent 
                        className={cn(
                          "w-auto p-0 rounded-lg shadow-lg border-0",
                          isDarkMode ? "bg-zinc-800 border-gray-600" : "bg-white border-gray-200"
                        )} 
                        align="center"
                      >
                        <ModernCalendar
                          selectedDate={preferredDates.startDate}
                          onDateSelect={(date) => {
                            setPreferredDates({ startDate: date });
                            setIsPreferredStartCalendarOpen(false);
                          }}
                          isDarkMode={isDarkMode}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  {/* Time Selection */}
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center">
                      <Clock className="h-4 w-4 text-gray-400" />
                    </div>
                    <select
                      value={startTime}
                      onChange={(e) => {
                        setStartTime(e.target.value);
                        setPreferredDates({ startTime: e.target.value });
                      }}
                      className={cn(
                        "w-full h-[38px] pl-9 pr-3 appearance-none rounded-md border font-normal text-sm",
                        isDarkMode 
                          ? "bg-zinc-800 border-zinc-700 text-gray-100" 
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

                {/* End Date and Time */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className={cn(
                      "text-sm font-medium",
                      isDarkMode ? "text-gray-300" : "text-gray-700"
                    )}>
                      Preferred End Date & Time
                    </Label>
                  <div className="relative">
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        "h-10 pl-3 text-sm",
                        !preferredDates.endDate && "text-muted-foreground",
                        isDarkMode 
                          ? "bg-zinc-800 border-zinc-700" 
                          : "bg-white border-zinc-200"
                      )}
                      onClick={() => setIsPreferredEndCalendarOpen(true)}
                    >
                      {preferredDates.endDate ? format(preferredDates.endDate, "MMM dd, yyyy") : <span>Pick a date</span>}
                    </Button>
                    <Popover open={isPreferredEndCalendarOpen} onOpenChange={setIsPreferredEndCalendarOpen}>
                      <PopoverTrigger asChild>
                        <div className="absolute inset-0" />
                      </PopoverTrigger>
                      <PopoverContent 
                        className={cn(
                          "w-auto p-0 rounded-lg shadow-lg border-0",
                          isDarkMode ? "bg-zinc-800 border-gray-600" : "bg-white border-gray-200"
                        )} 
                        align="center"
                      >
                        <ModernCalendar
                          selectedDate={preferredDates.endDate}
                          onDateSelect={(date) => {
                            setPreferredDates({ endDate: date });
                            setIsPreferredEndCalendarOpen(false);
                          }}
                          isDarkMode={isDarkMode}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  {/* Time Selection */}
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center">
                      <Clock className="h-4 w-4 text-gray-400" />
                    </div>
                    <select
                      value={endTime}
                      onChange={(e) => {
                        setEndTime(e.target.value);
                        setPreferredDates({ endTime: e.target.value });
                      }}
                      className={cn(
                        "w-full h-[38px] pl-9 pr-3 appearance-none rounded-md border font-normal text-sm",
                        isDarkMode 
                          ? "bg-zinc-800 border-zinc-700 text-gray-100" 
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

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 mt-4">
                <Button
                  variant="outline"
                  onClick={() => togglePreferredDatesModal(false)}
                  className={cn(
                    isDarkMode 
                      ? "border-zinc-700 text-zinc-300 hover:bg-zinc-800" 
                      : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                  )}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (preferredDates.startDate && preferredDates.endDate) {
                      // Set the form dates
                      setStartDate(preferredDates.startDate);
                      setEndDate(preferredDates.endDate);
                      
                      // Set the selected times from the preferred dates modal
                      setStartTime(startTime);
                      setEndTime(endTime);
                      
                      // Close the modal
                      togglePreferredDatesModal(false);
                      
                      // For multiple locations, auto-save the current location draft
                      if (hasMultipleLocations && isInMultipleLocationMode) {
                        // Use setTimeout to ensure state updates are applied first
                        setTimeout(() => {
                          saveCurrentLocationDraft(true);
                        }, 100);
                      }
                      
                      // Show success message
                      toast.success("Dates and times have been set in the schedule");
                    } else {
                      toast.error("Please select both start and end dates");
                    }
                  }}
                  className={cn(
                    "bg-black text-white hover:bg-zinc-800",
                    isDarkMode && "bg-white text-black hover:bg-zinc-200"
                  )}
                >
                  Confirm Dates
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Gov Modal - Modern 2-Column Design */}
      <Dialog 
        open={showGovModal} 
        onOpenChange={(open) => {
          if (!open) {
            // Check if any required files are missing when closing modal
            const hasAllRequiredFiles = govAttachments.brieferTemplate && 
                                      govAttachments.availableForDLBriefer && 
                                      govAttachments.programme;
            
            if (!hasAllRequiredFiles) {
              // Automatically turn off withGov if no files uploaded
              setFormData(prev => ({ ...prev, withGov: false }));
              // Clear any partial uploads
              setGovAttachments({
                brieferTemplate: null,
                availableForDLBriefer: null,
                programme: null
              });
              toast.warning("Governor involvement disabled - required files not uploaded");
            }
          }
          setShowGovModal(open);
        }}>
        <DialogContent className={cn(
          "!max-w-6xl !w-[85vw] max-h-[85vh] overflow-hidden",
          "bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800",
          "border-0 shadow-2xl backdrop-blur-sm",
          "animate-in fade-in-0 zoom-in-95 duration-300"
        )}>
          {/* Header */}
          <DialogHeader className="text-center pb-6 border-b border-gray-200/50 dark:border-slate-700/50 relative">
            <button
              onClick={() => {
                // Check if any required files are missing
                const hasAllRequiredFiles = govAttachments.brieferTemplate && 
                                          govAttachments.availableForDLBriefer && 
                                          govAttachments.programme;
                
                if (!hasAllRequiredFiles) {
                  // Automatically turn off withGov if no files uploaded
                  setFormData(prev => ({ ...prev, withGov: false }));
                  // Clear any partial uploads
                  setGovAttachments({
                    brieferTemplate: null,
                    availableForDLBriefer: null,
                    programme: null
                  });
                  toast.warning("Governor involvement disabled - required files not uploaded");
                }
                setShowGovModal(false);
              }}
              className="absolute right-0 top-0 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              Governor's Requirements
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400 text-base mt-2">
              Upload the required documents for the governor's briefer
            </DialogDescription>
          </DialogHeader>
          
          <div className="overflow-y-auto max-h-[70vh] px-4">
            {/* Two Column Layout */}
            <div className="py-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-none w-full">
                {/* Briefer Template Upload */}
                <div className="group">
                  <Label className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3 block">
                    📋 Briefer Template *
                  </Label>
                  <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-600">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Post briefer template for event documentation
                    </p>
                    <div className="flex flex-col gap-3">
                      <Button
                        size="sm"
                        className="h-10 px-4 text-sm bg-black text-white hover:bg-gray-800 shadow-lg"
                        onClick={() => setShowPostBrieferModal(true)}
                      >
                        View Post Briefer Template
                      </Button>
                      {govAttachments.brieferTemplate ? (
                        <div className="flex items-center gap-3 p-3 bg-white/70 dark:bg-slate-800/70 rounded-lg">
                          <FileText className="h-5 w-5 text-green-500" />
                          <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 truncate">
                            {govAttachments.brieferTemplate.name}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-3 text-xs hover:bg-red-50 hover:border-red-300 hover:text-red-600"
                            onClick={() => setGovAttachments(prev => ({ ...prev, brieferTemplate: null }))}
                          >
                            Remove
                          </Button>
                        </div>
                      ) : (
                        <>
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                setGovAttachments(prev => ({ ...prev, brieferTemplate: file }));
                              }
                            }}
                            className="hidden"
                            id="briefer-template-upload"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-10 px-4 text-sm bg-white/70 border-gray-200 text-gray-700 hover:bg-gray-50"
                            onClick={() => document.getElementById('briefer-template-upload').click()}
                          >
                            Upload Briefer File
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* ECR Template Section */}
                <div className="group">
                  <Label className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3 block">
                    📊 ECR Template *
                  </Label>
                  <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-600">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Event Completion Report template for post-event documentation
                    </p>
                    <div className="flex flex-col gap-3">
                      <Button
                        size="sm"
                        className="h-10 px-4 text-sm bg-black text-white hover:bg-gray-800 shadow-lg"
                        onClick={() => setShowECRModal(true)}
                      >
                        View ECR Template
                      </Button>
                      {ecrFile ? (
                        <div className="flex items-center gap-3 p-3 bg-white/70 dark:bg-slate-800/70 rounded-lg">
                          <FileText className="h-5 w-5 text-green-500" />
                          <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 truncate">
                            {ecrFile.name}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-3 text-xs hover:bg-red-50 hover:border-red-300 hover:text-red-600"
                            onClick={() => setEcrFile(null)}
                          >
                            Remove
                          </Button>
                        </div>
                      ) : (
                        <>
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                setEcrFile(file);
                              }
                            }}
                            className="hidden"
                            id="ecr-upload"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-10 px-4 text-sm bg-white/70 border-gray-200 text-gray-700 hover:bg-gray-50"
                            onClick={() => document.getElementById('ecr-upload').click()}
                          >
                            Upload ECR File
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Available for DL Briefer Upload */}
                <div className="group">
                  <Label className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3 block">
                    👤 Available for DL Briefer *
                  </Label>
                  <div className={cn(
                    "relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-300",
                    "hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10",
                    "group-hover:shadow-lg group-hover:scale-[1.02]",
                    govAttachments.availableForDLBriefer 
                      ? "border-green-300 bg-green-50/50 dark:bg-green-900/10" 
                      : "border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-slate-800/50"
                  )}>
                    {govAttachments.availableForDLBriefer ? (
                      <div className="space-y-3">
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                          <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                          {govAttachments.availableForDLBriefer.name}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-4 text-xs hover:bg-red-50 hover:border-red-300 hover:text-red-600"
                          onClick={() => setGovAttachments(prev => ({ ...prev, availableForDLBriefer: null }))}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto">
                          <FileText className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Click to upload available for DL briefer
                        </p>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              setGovAttachments(prev => ({ ...prev, availableForDLBriefer: file }));
                            }
                          }}
                          className="hidden"
                          id="available-dl-briefer-upload"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-4 text-xs bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100"
                          onClick={() => document.getElementById('available-dl-briefer-upload').click()}
                        >
                          Choose File
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Programme Upload */}
                <div className="group">
                  <Label className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3 block">
                    📅 Programme *
                  </Label>
                  <div className={cn(
                    "relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-300",
                    "hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10",
                    "group-hover:shadow-lg group-hover:scale-[1.02]",
                    govAttachments.programme 
                      ? "border-green-300 bg-green-50/50 dark:bg-green-900/10" 
                      : "border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-slate-800/50"
                  )}>
                    {govAttachments.programme ? (
                      <div className="space-y-3">
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                          <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                          {govAttachments.programme.name}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-4 text-xs hover:bg-red-50 hover:border-red-300 hover:text-red-600"
                          onClick={() => setGovAttachments(prev => ({ ...prev, programme: null }))}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto">
                          <FileText className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Click to upload programme document
                        </p>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              setGovAttachments(prev => ({ ...prev, programme: file }));
                            }
                          }}
                          className="hidden"
                          id="programme-upload"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-4 text-xs bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100"
                          onClick={() => document.getElementById('programme-upload').click()}
                        >
                          Choose File
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                
              </div>
            </div>
            
            {/* Footer */}
            <div className="flex justify-end items-center gap-3 pt-6 border-t border-gray-200/50 dark:border-slate-700/50 mt-4">
            <Button
              variant="outline"
              className="px-6 py-2 hover:bg-gray-50 dark:hover:bg-slate-800"
              onClick={() => {
                setShowGovModal(false);
                setFormData(prev => ({ ...prev, withGov: false }));
                // Clear gov attachments when canceling
                setGovAttachments({
                  brieferTemplate: null,
                  availableForDLBriefer: null,
                  programme: null
                });
                toast.info("Governor involvement canceled");
              }}
            >
              Cancel
            </Button>
            <Button
              className={cn(
                "px-8 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg",
                "hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed",
                "transition-all duration-200"
              )}
              onClick={() => {
                if (!govAttachments.brieferTemplate || !govAttachments.availableForDLBriefer || !govAttachments.programme) {
                  toast.error("Please upload all required files before continuing");
                  return;
                }
                setShowGovModal(false);
                toast.success("Governor requirements completed");
              }}
              disabled={!govAttachments.brieferTemplate || !govAttachments.availableForDLBriefer || !govAttachments.programme}
            >
              Continue
            </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>


      {/* ECR Template Modal */}
      <Dialog open={showECRModal} onOpenChange={setShowECRModal}>
        <DialogContent className="!max-w-6xl !w-[85vw] max-h-[90vh] overflow-y-auto bg-white border border-gray-200">
          <DialogHeader className="text-center relative">
            <button
              onClick={() => setShowECRModal(false)}
              className="absolute right-0 top-0 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
            <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-3">
              <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
              Event Completion Report (ECR) Template
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400 text-sm">
              Default format for documenting completed events
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 w-1/3">
                      Field
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 w-2/3">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                      Event Title
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        name="eventTitle"
                        value={ecrFormData.eventTitle}
                        onChange={handleEcrInputChange}
                        placeholder="Enter the complete title of the event"
                        className="w-full border-0 p-0 text-sm bg-transparent focus:ring-0"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                      Date and Venue
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        name="dateAndVenue"
                        value={ecrFormData.dateAndVenue}
                        onChange={handleEcrInputChange}
                        placeholder="Enter event date and location/venue"
                        className="w-full border-0 p-0 text-sm bg-transparent focus:ring-0"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                      Organizing Office
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        name="organizingOffice"
                        value={ecrFormData.organizingOffice}
                        onChange={handleEcrInputChange}
                        placeholder="Enter the department/office that organized the event"
                        className="w-full border-0 p-0 text-sm bg-transparent focus:ring-0"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                      Number of Participants
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        name="numberOfParticipants"
                        value={ecrFormData.numberOfParticipants}
                        onChange={handleEcrInputChange}
                        placeholder="Enter total number of attendees/participants"
                        className="w-full border-0 p-0 text-sm bg-transparent focus:ring-0"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 align-top">
                      Summary of Activities Conducted
                    </td>
                    <td className="px-4 py-3">
                      <textarea
                        name="summaryOfActivities"
                        value={ecrFormData.summaryOfActivities}
                        onChange={handleEcrInputChange}
                        placeholder="Provide a detailed summary of all activities, sessions, and programs conducted during the event"
                        className="w-full min-h-[80px] border-0 p-0 text-sm bg-transparent focus:ring-0 resize-none"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 align-top">
                      Highlights and Key Results
                    </td>
                    <td className="px-4 py-3">
                      <textarea
                        name="highlightsAndResults"
                        value={ecrFormData.highlightsAndResults}
                        onChange={handleEcrInputChange}
                        placeholder="List the main achievements, outcomes, and significant results of the event"
                        className="w-full min-h-[80px] border-0 p-0 text-sm bg-transparent focus:ring-0 resize-none"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 align-top">
                      Challenges Encountered
                    </td>
                    <td className="px-4 py-3">
                      <textarea
                        name="challengesEncountered"
                        value={ecrFormData.challengesEncountered}
                        onChange={handleEcrInputChange}
                        placeholder="Document any problems, issues, or challenges faced during the event"
                        className="w-full min-h-[80px] border-0 p-0 text-sm bg-transparent focus:ring-0 resize-none"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 align-top">
                      Recommendations
                    </td>
                    <td className="px-4 py-3">
                      <textarea
                        name="recommendations"
                        value={ecrFormData.recommendations}
                        onChange={handleEcrInputChange}
                        placeholder="Provide suggestions for improvement for future similar events"
                        className="w-full min-h-[80px] border-0 p-0 text-sm bg-transparent focus:ring-0 resize-none"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 align-top">
                      Photo Documentation
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-2">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => {
                            const files = Array.from(e.target.files);
                            setEcrPhotos(prev => [...prev, ...files]);
                          }}
                          className="hidden"
                          id="ecr-photo-upload"
                        />
                        <Button
                          size="sm"
                          className="h-7 px-2 text-xs bg-black text-white hover:bg-gray-800"
                          onClick={() => document.getElementById('ecr-photo-upload').click()}
                        >
                          Upload Photos
                        </Button>
                        {ecrPhotos.length > 0 && (
                          <div className="space-y-1">
                            {ecrPhotos.map((photo, index) => (
                              <div key={index} className="flex items-center gap-2 text-xs">
                                <FileText className="h-3 w-3 text-green-500" />
                                <span className="text-gray-600 dark:text-gray-400 truncate">
                                  {photo.name}
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-5 px-1 text-xs"
                                  onClick={() => setEcrPhotos(prev => prev.filter((_, i) => i !== index))}
                                >
                                  ×
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                      Prepared By / Date
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Input
                          name="preparedBy"
                          value={ecrFormData.preparedBy}
                          onChange={handleEcrInputChange}
                          placeholder="Name of person who prepared the report"
                          className="flex-1 border-0 p-0 text-sm bg-transparent focus:ring-0"
                        />
                        <span className="text-gray-400">/</span>
                        <Input
                          name="preparedDate"
                          value={ecrFormData.preparedDate}
                          onChange={handleEcrInputChange}
                          placeholder="Date"
                          className="flex-1 border-0 p-0 text-sm bg-transparent focus:ring-0"
                        />
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="flex justify-between items-center pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-2">
              <Button
                onClick={previewPDF}
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                Preview PDF
              </Button>
              <Button
                onClick={downloadPDF}
                className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            </div>
            <div className="flex justify-end">
              <Button
                variant="outline"
                className="hover:bg-gray-50 dark:hover:bg-slate-800"
                onClick={() => setShowECRModal(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Post Briefer Template Modal */}
      <TemplateModal
        isOpen={showPostBrieferModal}
        onClose={() => setShowPostBrieferModal(false)}
        title="Post Briefer Template"
        description="Complete the post briefer template for event documentation"
        icon={FileText}
        templateType="post_briefer"
        fields={[
          { key: 'eventTitle', label: 'Event Title:', type: 'text' },
          { key: 'proponentOffice', label: 'Proponent Office/Department:', type: 'text' },
          { key: 'dateAndTime', label: 'Date and Time:', type: 'text' },
          { key: 'venue', label: 'Venue:', type: 'text' },
          { key: 'objective', label: 'Objective:', type: 'textarea' },
          { key: 'targetAudience', label: 'Target Audience/Participants:', type: 'text' },
          { key: 'expectedParticipants', label: 'Expected Number of Participants:', type: 'text' },
          { key: 'briefDescription', label: 'Brief Description of the Activity:', type: 'textarea' }
        ]}
        onFileGenerated={(file) => {
          setGovAttachments(prev => ({ ...prev, brieferTemplate: file }));
        }}
      />
    </motion.div>
  );
};


export default RequestEvent;
