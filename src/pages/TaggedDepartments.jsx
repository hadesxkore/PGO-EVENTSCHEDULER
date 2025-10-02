import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";
import { 
  FileText, 
  Calendar, 
  Clock, 
  Users, 
  MapPin, 
  ArrowLeft, 
  CalendarDays, 
  Building2, 
  Target, 
  UserCheck, 
  AlertCircle, 
  
  CheckCircle2, 
  UserPlus, 
  ChevronRight,
  ArrowRight,
  Search,
  X,
  Send,
  Edit,
  Filter,
  Download,
  Eye,
  Paperclip,
  File
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { PDFDownloadLink, PDFViewer } from "@react-pdf/renderer";
import AccomplishmentReportPDF from "@/components/reports/AccomplishmentReportPDF";
import { format } from "date-fns";
import { useLocation, useNavigate } from "react-router-dom";
import { auth } from "@/lib/firebase/firebase";
import { db } from "@/lib/firebase/firebase";
import { doc, getDoc, setDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import useEventStore from "@/store/eventStore";
import useMessageStore from "@/store/messageStore";
import useAccomplishmentStore from "@/store/accomplishmentStore";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const TaggedDepartments = () => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [events, setEvents] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState(location.state?.selectedTab || "created");
  const [requirementStatus, setRequirementStatus] = useState({}); // Track checkbox states
  const [requirementRemarks, setRequirementRemarks] = useState({}); // Track remarks
  const [isSubmitting, setIsSubmitting] = useState(false); // Track submission state
  const [submittedEvents, setSubmittedEvents] = useState({}); // Track which events are submitted
  const [editingEvent, setEditingEvent] = useState(null); // Track which event is being edited
  const [requirementFilter, setRequirementFilter] = useState('all'); // Filter for requirements: 'all', 'complied', 'not-complied'
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [showAttachmentsModal, setShowAttachmentsModal] = useState(false); // Track PDF preview modal

  // Completed accomplishments tracking
  const [completedAccomplishments, setCompletedAccomplishments] = useState({});
  const [lastViewedTimestamps, setLastViewedTimestamps] = useState({});

  // Get message store actions
  const { usersWhoTaggedMe, setUsersWhoTaggedMe } = useMessageStore();

  // Get accomplishment store actions
  const { 
    getCompletedCount, 
    getMultipleCompletedCounts, 
    submitAccomplishment: submitAccomplishmentToStore, 
    loadAccomplishmentData: loadAccomplishmentFromStore,
    clearEventCache 
  } = useAccomplishmentStore();

  // Reset badge count when component mounts
  useEffect(() => {
    setUsersWhoTaggedMe([]);
  }, [setUsersWhoTaggedMe]);

  // Fetch tagged departments events using Zustand
  useEffect(() => {
    const fetchTaggedEvents = async () => {
      setLoading(true);
      try {
        // Get current user's document to get their department
        const user = auth.currentUser;
        if (!user) {
          throw new Error("User not authenticated");
        }

        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (!userDocSnap.exists()) {
          throw new Error("User not found");
        }
        const userData = userDocSnap.data();
        const userDepartment = userData.department;

        // Use Zustand store to get all events (with caching)
        const result = await useEventStore.getState().fetchAllEvents();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch events');
        }

        // Filter events where user's department is tagged OR where user has tagged others
        const taggedEvents = result.events
          .map(event => {
            const departmentRequirements = event.departmentRequirements || [];

            // Case 1: User's department is tagged in this event
            const taggedDept = departmentRequirements.find(
              dept => dept.departmentName === userDepartment
            );

            if (taggedDept && event.userId !== user.uid) {
              return {
                id: event.id,
                title: event.title,
                department: event.department,
                requestor: event.requestor || event.eventRequestor, // Add requestor field
                startDate: event.startDate,
                endDate: event.endDate,
                date: event.date,
                start: event.start, // EventStore transformed field
                actualEndDate: event.actualEndDate, // EventStore transformed field
                recentActivity: event.recentActivity || [], // Include recent activity
                location: event.location,
                locations: event.locations,
                isMultipleLocations: event.isMultipleLocations,
                participants: event.participants,
                attachments: event.attachments || [], // Include attachments
                tagType: 'received',
                requirements: taggedDept.requirements || []
              };
            }

            // Case 2: User created this event and tagged other departments
            if (event.userId === user.uid && departmentRequirements.length > 0) {
              // Flatten all requirements from all departments for display
              const allRequirements = departmentRequirements.reduce((acc, dept) => {
                if (dept.requirements && dept.requirements.length > 0) {
                  // Add department name prefix to each requirement for clarity
                  const deptRequirements = dept.requirements.map(req => {
                    return {
                      name: `${dept.departmentName}: ${req.name || req}`,
                      note: req.note || null,
                      departmentName: dept.departmentName,
                      originalReq: req
                    };
                  });
                  return [...acc, ...deptRequirements];
                }
                return acc;
              }, []);
              
              return {
                id: event.id,
                title: event.title,
                department: event.department,
                requestor: event.requestor || event.eventRequestor, // Add requestor field
                startDate: event.startDate,
                endDate: event.endDate,
                date: event.date,
                start: event.start, // EventStore transformed field
                actualEndDate: event.actualEndDate, // EventStore transformed field
                recentActivity: event.recentActivity || [], // Include recent activity
                location: event.location,
                locations: event.locations,
                isMultipleLocations: event.isMultipleLocations,
                participants: event.participants,
                attachments: event.attachments || [], // Include attachments
                tagType: 'sent',
                requirements: allRequirements
              };
            }

            return null;
          })
          .filter(event => event !== null);

        setEvents(taggedEvents);
        setError(null);
      } catch (err) {
        setError('Failed to fetch tagged events');
        toast.error('Failed to fetch tagged events');
      } finally {
        setLoading(false);
      }
    };

    fetchTaggedEvents();
  }, []);

  // Show error toast if there's an error
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  // Load accomplishment data when event is selected
  useEffect(() => {
    if (selectedEvent) {
      // Clear previous data first
      setRequirementStatus({});
      setRequirementRemarks({});
      setSubmittedEvents({});
      setEditingEvent(null);
      
      // Then load new data
      loadAccomplishmentData(selectedEvent.id);
    }
  }, [selectedEvent]);

  // Load last viewed timestamps from localStorage on mount
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('taggedDepartmentsViewTimestamps') || '{}');
    setLastViewedTimestamps(stored);
  }, []);

  // Check for completed accomplishments when events are loaded (only for created events)
  useEffect(() => {
    if (events.length > 0) {
      const checkAllAccomplishments = async () => {
        // Only check created events (events that the user created and tagged other departments)
        const createdEvents = events.filter(event => event.tagType === 'sent');
        
        if (createdEvents.length > 0) {
          const eventIds = createdEvents.map(event => event.id);
          const completedCounts = await getMultipleCompletedCounts(eventIds);
          
          setCompletedAccomplishments(completedCounts);
        }
      };
      
      checkAllAccomplishments();
    }
  }, [events, getMultipleCompletedCounts]);

  // Realtime polling for completed accomplishments (every 30 seconds)
  useEffect(() => {
    if (events.length === 0) return;

    const pollAccomplishments = async () => {
      const createdEvents = events.filter(event => event.tagType === 'sent');
      
      if (createdEvents.length > 0) {
        const eventIds = createdEvents.map(event => event.id);
        const completedCounts = await getMultipleCompletedCounts(eventIds, true); // Force refresh
        
        setCompletedAccomplishments(prev => {
          // Only update if there are actual changes to prevent unnecessary re-renders
          const hasChanges = JSON.stringify(prev) !== JSON.stringify(completedCounts);
          return hasChanges ? completedCounts : prev;
        });
      }
    };

    // Initial check
    pollAccomplishments();

    // Set up polling interval (every 30 seconds)
    const intervalId = setInterval(pollAccomplishments, 30000);

    // Add focus event listener for immediate updates when user returns to tab
    const handleFocus = () => {
      pollAccomplishments();
    };

    // Add visibility change listener for when tab becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        pollAccomplishments();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup interval and event listeners on unmount
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [events, getMultipleCompletedCounts]);

  // Mark accomplishments as viewed when user clicks on an event
  useEffect(() => {
    if (selectedEvent && selectedEvent.tagType === 'sent') {
      markAccomplishmentsAsViewed(selectedEvent.id);
    }
  }, [selectedEvent]);

  // Helper function to get location display text
  const getLocationDisplay = (event) => {
    if (event.isMultipleLocations && event.locations && event.locations.length > 0) {
      const validLocations = event.locations.filter(loc => loc.location && loc.location.trim());
      if (validLocations.length === 1) {
        return validLocations[0].location;
      } else if (validLocations.length > 1) {
        return `${validLocations.length} locations`;
      }
    }
    return event.location || 'TBD';
  };

  // Helper function to get date display for multiple locations
  const getDateDisplay = (event) => {
    if (event.isMultipleLocations && event.locations && event.locations.length > 0) {
      const validLocations = event.locations.filter(loc => loc.startDate);
      if (validLocations.length > 0) {
        // Show the earliest start date
        const earliestDate = validLocations.reduce((earliest, loc) => {
          const locDate = loc.startDate?.toDate ? loc.startDate.toDate() : new Date(loc.startDate);
          const earliestDate = earliest?.toDate ? earliest.toDate() : new Date(earliest);
          return locDate < earliestDate ? loc.startDate : earliest;
        }, validLocations[0].startDate);
        
        const dateObj = earliestDate?.toDate ? earliestDate.toDate() : new Date(earliestDate);
        return format(dateObj, "MMM d");
      }
    }
    
    // Try to get from recentActivity first
    if (event.recentActivity && event.recentActivity.length > 0) {
      const startDateActivity = event.recentActivity
        .filter(activity => activity.type === 'startDateTime')
        .sort((a, b) => (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0))[0];
      
      if (startDateActivity && startDateActivity.newValue) {
        try {
          const date = new Date(startDateActivity.newValue);
          if (!isNaN(date.getTime())) {
            return format(date, "MMM d");
          }
        } catch (e) {
          // Continue to fallback options
        }
      }
    }
    
    // Fallback to eventStore transformed fields
    if (event.start) {
      return format(event.start, "MMM d");
    }
    
    // Fallback to direct startDate field
    if (event.startDate?.toDate) {
      return format(event.startDate.toDate(), "MMM d");
    }
    
    if (event.startDate) {
      try {
        const date = new Date(event.startDate);
        if (!isNaN(date.getTime())) {
          return format(date, "MMM d");
        }
      } catch (e) {
        // Continue to TBD
      }
    }
    
    return 'TBD';
  };

  // Filter events based on search query
  const filterEvents = (eventsList, query) => {
    if (!query.trim()) return eventsList;
    
    const searchTerm = query.toLowerCase().trim();
    return eventsList.filter(event => {
      // Search in title
      if (event.title?.toLowerCase().includes(searchTerm)) return true;
      
      // Search in department
      if (event.department?.toLowerCase().includes(searchTerm)) return true;
      
      // Search in location (single location)
      if (event.location?.toLowerCase().includes(searchTerm)) return true;
      
      // Search in multiple locations
      if (event.isMultipleLocations && event.locations) {
        return event.locations.some(loc => 
          loc.location?.toLowerCase().includes(searchTerm)
        );
      }
      
      return false;
    });
  };

  // Helper functions for requirement management
  const getRequirementKey = (eventId, reqName) => `${eventId}-${reqName}`;
  
  const handleRequirementStatusChange = (eventId, reqName, checked) => {
    const key = getRequirementKey(eventId, reqName);
    setRequirementStatus(prev => ({
      ...prev,
      [key]: checked
    }));
  };

  const handleRequirementRemarksChange = (eventId, reqName, remarks) => {
    const key = getRequirementKey(eventId, reqName);
    setRequirementRemarks(prev => ({
      ...prev,
      [key]: remarks
    }));
  };

  // Load existing accomplishment data using Zustand store
  const loadAccomplishmentData = async (eventId) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (!userDocSnap.exists()) return;
      
      const userData = userDocSnap.data();
      const userDepartment = userData.department;

      console.log('Loading accomplishment data using Zustand store for event:', eventId);
      
      // Determine if this is a tagged event (current user's department) or created event (all departments)
      const isTaggedEvent = selectedEvent && selectedEvent.tagType === 'received';
      const departmentFilter = isTaggedEvent ? userDepartment : null;
      
      // Use Zustand store to load accomplishment data
      const result = await loadAccomplishmentFromStore(eventId, departmentFilter);
      
      if (result.success && result.allAccomplishments && result.allAccomplishments.length > 0) {
        console.log('Found accomplishment data from store:', result.allAccomplishments);
        
        // Load the saved data into state
        const newRequirementStatus = {};
        const newRequirementRemarks = {};
        
        // Process all accomplishment documents (from different departments)
        result.allAccomplishments.forEach((accomplishmentDoc, docIndex) => {
          console.log(`Processing accomplishment doc ${docIndex + 1} from department: ${accomplishmentDoc.departmentName}`);
          
          // For tagged events, only process current user's department
          // For created events, process all departments
          if (isTaggedEvent && accomplishmentDoc.departmentName !== userDepartment) {
            return; // Skip other departments for tagged events
          }
          
          // Process requirements
          if (accomplishmentDoc.requirements && Array.isArray(accomplishmentDoc.requirements)) {
            accomplishmentDoc.requirements.forEach((req) => {
              let matchedRequirement = null;
              
              // Try exact match first
              matchedRequirement = selectedEvent?.requirements?.find(eventReq => 
                eventReq.name.trim() === req.requirementName.trim()
              );
              
              // If no exact match, try matching with department prefix
              if (!matchedRequirement) {
                matchedRequirement = selectedEvent?.requirements?.find(eventReq => {
                  // Check if the event requirement ends with the saved requirement name
                  // e.g., "PIO: Documentation" should match "Documentation"
                  const eventReqParts = eventReq.name.split(':');
                  if (eventReqParts.length === 2) {
                    const eventReqSuffix = eventReqParts[1].trim();
                    return eventReqSuffix === req.requirementName.trim();
                  }
                  return false;
                });
              }
              
              if (matchedRequirement) {
                // Found match - use the current event requirement name as key
                const key = getRequirementKey(eventId, matchedRequirement.name);
                newRequirementStatus[key] = req.completed;
                newRequirementRemarks[key] = req.remarks || '';
                console.log(`✅ Matched: "${req.requirementName}" → "${matchedRequirement.name}" - Completed: ${req.completed}, Remarks: "${req.remarks}"`);
              } else {
                console.log(`❌ No match found for: "${req.requirementName}"`);
                console.log('Available requirements:', selectedEvent?.requirements?.map(r => r.name));
              }
            });
          }
        });
        
        setRequirementStatus(prev => ({ ...prev, ...newRequirementStatus }));
        setRequirementRemarks(prev => ({ ...prev, ...newRequirementRemarks }));
        setSubmittedEvents(prev => ({ ...prev, [eventId]: true }));
        
        console.log('Final requirement status:', newRequirementStatus);
        console.log('Final requirement remarks:', newRequirementRemarks);
      } else {
        console.log('No accomplishment data found for event:', eventId);
      }
    } catch (error) {
      console.error('Error loading accomplishment data:', error);
    }
  };


  // Submit accomplishment function
  const handleSubmitAccomplishment = async () => {
    if (!selectedEvent) return;

    // Validate that at least one requirement is checked
    const hasCompletedRequirements = selectedEvent.requirements?.some((req) => {
      const key = getRequirementKey(selectedEvent.id, req.name);
      return requirementStatus[key] === true;
    });

    if (!hasCompletedRequirements) {
      toast.error('Please check at least one requirement as completed before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Prepare accomplishment data
      const accomplishmentData = {
        eventId: selectedEvent.id,
        submittedAt: new Date(),
        requirements: selectedEvent.requirements?.map((req) => {
          const key = getRequirementKey(selectedEvent.id, req.name);
          return {
            requirementName: req.name,
            completed: requirementStatus[key] || false,
            remarks: requirementRemarks[key] || '',
            originalRequirement: req
          };
        }) || []
      };

      // Get user department
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (!userDocSnap.exists()) throw new Error('User not found');
      
      const userData = userDocSnap.data();
      const userDepartment = userData.department;

      // Save using Zustand store
      const result = await submitAccomplishmentToStore(selectedEvent.id, userDepartment, accomplishmentData);
      
      if (result.success) {
        // Mark event as submitted
        setSubmittedEvents(prev => ({ ...prev, [selectedEvent.id]: true }));
        setEditingEvent(null); // Exit edit mode
        
        // Refresh the completed counts for all events
        const createdEvents = events.filter(event => event.tagType === 'sent');
        if (createdEvents.length > 0) {
          const eventIds = createdEvents.map(event => event.id);
          const updatedCounts = await getMultipleCompletedCounts(eventIds, true); // Force refresh
          setCompletedAccomplishments(updatedCounts);
        }
        
        // Show success message
        const completedCount = accomplishmentData.requirements.filter(req => req.completed).length;
        toast.success(`Accomplishment submitted successfully! ${completedCount} requirement(s) marked as completed.`);
      } else {
        throw new Error(result.error || 'Failed to submit accomplishment');
      }
      
    } catch (error) {
      console.error('Error submitting accomplishment:', error);
      toast.error('Failed to submit accomplishment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle edit mode
  const handleEditAccomplishment = (eventId) => {
    setEditingEvent(eventId);
  };


  // Filter requirements based on completion status
  const getFilteredRequirements = (requirements) => {
    if (!requirements) return [];
    
    return requirements.filter((req) => {
      const requirementKey = getRequirementKey(selectedEvent.id, req.name);
      const isCompleted = requirementStatus[requirementKey] || false;
      
      switch (requirementFilter) {
        case 'complied':
          return isCompleted;
        case 'not-complied':
          return !isCompleted;
        case 'all':
        default:
          return true;
      }
    });
  };


  // Function to mark accomplishments as viewed
  const markAccomplishmentsAsViewed = (eventId) => {
    const now = Date.now();
    setLastViewedTimestamps(prev => ({
      ...prev,
      [eventId]: now
    }));
    
    // Also store in localStorage for persistence
    const stored = JSON.parse(localStorage.getItem('taggedDepartmentsViewTimestamps') || '{}');
    stored[eventId] = now;
    localStorage.setItem('taggedDepartmentsViewTimestamps', JSON.stringify(stored));
    
    // Clear the completed count for this event
    setCompletedAccomplishments(prev => ({
      ...prev,
      [eventId]: 0
    }));
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };



  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={cn(
          "min-h-screen rounded-lg",
          isDarkMode ? "bg-slate-950" : "bg-white"
        )}
      >
        {/* Simple Header */}
        <div className={cn(
          "sticky top-0 z-50 w-full border-b",
          isDarkMode 
            ? "bg-slate-950 border-slate-800" 
            : "bg-white border-slate-200"
        )}>
          <div className="container flex h-16 items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className={cn(
                "mr-4",
                isDarkMode 
                  ? "hover:bg-slate-800 text-slate-400 hover:text-white" 
                  : "hover:bg-slate-100 text-slate-600 hover:text-slate-900"
              )}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                isDarkMode 
                  ? "bg-blue-500/20" 
                  : "bg-blue-50"
              )}>
                <Building2 className={cn(
                  "h-5 w-5",
                  isDarkMode ? "text-blue-400" : "text-blue-600"
                )} />
              </div>
              
              <div>
                <h1 className={cn(
                  "text-lg font-semibold",
                  isDarkMode ? "text-white" : "text-slate-900"
                )}>
                  Tagged Departments
                </h1>
                <p className={cn(
                  "text-sm",
                  isDarkMode ? "text-slate-400" : "text-slate-500"
                )}>
                  Department collaboration events
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Simple Title Section */}
        <div className="container py-8">
          <div className="text-center">
            <h2 className={cn(
              "text-2xl font-bold mb-2",
              isDarkMode ? "text-white" : "text-slate-900"
            )}>
              Department Events
            </h2>
            <p className={cn(
              "text-base",
              isDarkMode ? "text-slate-400" : "text-slate-600"
            )}>
              View and manage collaborative events
            </p>
          </div>
        </div>

      {/* Events List */}
      {!selectedEvent && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="container mt-6"
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-6xl mx-auto">
            <TabsList className={cn(
              "grid w-full grid-cols-2 mb-6 p-1 rounded-lg h-auto",
              isDarkMode 
                ? "bg-slate-800" 
                : "bg-slate-100"
            )}>
              <TabsTrigger 
                value="created" 
                className={cn(
                  "py-3 px-4 font-medium transition-all duration-200 rounded-md h-full flex items-center justify-center",
                  "data-[state=active]:bg-black data-[state=active]:text-white hover:bg-gray-800 hover:text-white",
                  isDarkMode ? "text-slate-300" : "text-slate-700"
                )}
              >
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">Created Events</span>
                  {(() => {
                    const totalCompleted = Object.values(completedAccomplishments).reduce((sum, count) => sum + count, 0);
                    return totalCompleted > 0 ? (
                      <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center ml-1">
                        <span className="text-white text-xs font-bold">
                          {totalCompleted > 9 ? '9+' : totalCompleted}
                        </span>
                      </div>
                    ) : null;
                  })()}
                </div>
              </TabsTrigger>
              <TabsTrigger 
                value="tagged" 
                className={cn(
                  "py-3 px-4 font-medium transition-all duration-200 rounded-md h-full flex items-center justify-center",
                  "data-[state=active]:bg-black data-[state=active]:text-white hover:bg-gray-800 hover:text-white",
                  isDarkMode ? "text-slate-300" : "text-slate-700"
                )}
              >
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">Tagged Events</span>
                  {events.filter(event => event.tagType === 'received').length > 0 && (
                    <span className={cn(
                      "ml-1 min-w-[20px] h-5 rounded-full px-1.5 text-xs font-bold flex items-center justify-center flex-shrink-0",
                      "bg-blue-600 text-white"
                    )}>
                      {events.filter(event => event.tagType === 'received').length}
                    </span>
                  )}
                </div>
              </TabsTrigger>
            </TabsList>

            {/* Search Input */}
            <div className="mb-6">
              <div className="relative max-w-md">
                <Search className={cn(
                  "absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4",
                  isDarkMode ? "text-slate-400" : "text-slate-500"
                )} />
                <input
                  type="text"
                  placeholder={`Search ${activeTab === 'created' ? 'created' : 'tagged'} events...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn(
                    "w-full pl-10 pr-10 py-2.5 rounded-lg border text-sm transition-colors",
                    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                    isDarkMode 
                      ? "bg-slate-800 border-slate-700 text-white placeholder-slate-400" 
                      : "bg-white border-slate-300 text-slate-900 placeholder-slate-500"
                  )}
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSearchQuery("")}
                    className={cn(
                      "absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6",
                      isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900"
                    )}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className={cn(
                  "h-8 w-8 animate-spin mb-4",
                  isDarkMode ? "text-blue-400" : "text-blue-600"
                )} />
                <p className={cn(
                  "text-base font-medium",
                  isDarkMode ? "text-slate-300" : "text-slate-700"
                )}>
                  Loading events...
                </p>
              </div>
            ) : (
              <>
                <TabsContent value="created" className="space-y-6">
                  {(() => {
                    const createdEvents = events.filter(event => event.tagType === 'sent');
                    const filteredEvents = filterEvents(createdEvents, searchQuery);
                    
                    if (createdEvents.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center py-12">
                          <AlertCircle className={cn(
                            "h-12 w-12",
                            isDarkMode ? "text-slate-600" : "text-slate-300"
                          )} />
                          <h3 className={cn(
                            "mt-4 text-lg font-medium",
                            isDarkMode ? "text-slate-300" : "text-slate-700"
                          )}>No Created Events</h3>
                          <p className={cn(
                            "mt-2 text-sm text-center",
                            isDarkMode ? "text-slate-400" : "text-slate-500"
                          )}>
                            You haven't created any events that tag other departments.
                          </p>
                        </div>
                      );
                    }

                    if (filteredEvents.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center py-12">
                          <Search className={cn(
                            "h-12 w-12",
                            isDarkMode ? "text-slate-600" : "text-slate-300"
                          )} />
                          <h3 className={cn(
                            "mt-4 text-lg font-medium",
                            isDarkMode ? "text-slate-300" : "text-slate-700"
                          )}>No Results Found</h3>
                          <p className={cn(
                            "mt-2 text-sm text-center",
                            isDarkMode ? "text-slate-400" : "text-slate-500"
                          )}>
                            No created events match "{searchQuery}". Try a different search term.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-6 py-4">
                        {filteredEvents.map((event) => (
                
                          <motion.div
                            key={event.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ y: -4 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => setSelectedEvent(event)}
                            className="cursor-pointer"
                          >
                            <Card className={cn(
                              "border transition-all duration-200 hover:shadow-lg relative",
                              isDarkMode 
                                ? "bg-slate-900 border-slate-700 hover:border-blue-500/50" 
                                : "bg-white border-slate-200 hover:border-blue-300"
                            )}>
                              {/* Completed Accomplishments Badge - Positioned at top-right of card */}
                              {completedAccomplishments[event.id] > 0 && (
                                <HoverCard>
                                  <HoverCardTrigger>
                                    <div className="absolute -top-2 -right-2 z-10 cursor-pointer">
                                      <div className="relative">
                                        <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center shadow-lg hover:bg-green-700 transition-colors">
                                          <span className="text-white text-xs font-bold">
                                            {completedAccomplishments[event.id] > 9 ? '9+' : completedAccomplishments[event.id]}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </HoverCardTrigger>
                                  <HoverCardContent className="w-80 p-4 bg-white border border-gray-200 shadow-lg rounded-lg">
                                    <div className="space-y-2">
                                      <h4 className={cn(
                                        "font-medium",
                                        isDarkMode ? "text-gray-200" : "text-gray-900"
                                      )}>
                                        Completed Accomplishments
                                      </h4>
                                      <p className={cn(
                                        "text-sm",
                                        isDarkMode ? "text-gray-400" : "text-gray-500"
                                      )}>
                                        {completedAccomplishments[event.id]} accomplishment{completedAccomplishments[event.id] > 1 ? 's' : ''} completed by departments for this event.
                                      </p>
                                      <p className={cn(
                                        "text-xs",
                                        isDarkMode ? "text-gray-500" : "text-gray-400"
                                      )}>
                                        Click on the event to view accomplishment details.
                                      </p>
                                    </div>
                                  </HoverCardContent>
                                </HoverCard>
                              )}
                              
                              <CardHeader className="pb-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-3">
                                      <div className={cn(
                                        "p-2 rounded-lg",
                                        isDarkMode 
                                          ? "bg-blue-500/20" 
                                          : "bg-blue-50"
                                      )}>
                                        <Building2 className={cn(
                                          "h-4 w-4",
                                          isDarkMode ? "text-blue-400" : "text-blue-600"
                                        )} />
                                      </div>
                                      <div>
                                        <CardTitle className={cn(
                                          "text-lg font-semibold",
                                          isDarkMode ? "text-white" : "text-slate-900"
                                        )}>
                                          {event.title}
                                        </CardTitle>
                                        <CardDescription className={cn(
                                          "text-sm mt-1",
                                          isDarkMode ? "text-slate-400" : "text-slate-500"
                                        )}>
                                          {event.department}
                                        </CardDescription>
                                      </div>
                                    </div>
                                    
                                    <Badge 
                                      className={cn(
                                        "w-fit font-medium",
                                        event.tagType === 'received' 
                                          ? "bg-blue-600 text-white hover:bg-blue-700" 
                                          : "bg-slate-600 text-white hover:bg-slate-700"
                                      )}
                                    >
                                      {event.tagType === 'received' ? 'Tagged Event' : 'Created Event'}
                                    </Badge>
                                  </div>
                                  
                                  <ArrowRight className={cn(
                                    "h-5 w-5 opacity-50",
                                    isDarkMode ? "text-slate-400" : "text-slate-500"
                                  )} />
                                </div>
                              </CardHeader>
                              
                              <CardContent>
                                <div className="space-y-4">
                                  {/* Event Info Grid */}
                                  <div className="grid grid-cols-3 gap-4 text-sm">
                                    <div className="flex items-center gap-2">
                                      <CalendarDays className={cn(
                                        "h-4 w-4",
                                        isDarkMode ? "text-blue-400" : "text-blue-600"
                                      )} />
                                      <span className={cn(
                                        "font-medium",
                                        isDarkMode ? "text-slate-300" : "text-slate-700"
                                      )}>
                                        {getDateDisplay(event)}
                                      </span>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                      <MapPin className={cn(
                                        "h-4 w-4",
                                        isDarkMode ? "text-blue-400" : "text-blue-600"
                                      )} />
                                      <span className={cn(
                                        "font-medium truncate",
                                        isDarkMode ? "text-slate-300" : "text-slate-700"
                                      )}>
                                        {getLocationDisplay(event)}
                                      </span>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                      <Users className={cn(
                                        "h-4 w-4",
                                        isDarkMode ? "text-blue-400" : "text-blue-600"
                                      )} />
                                      <span className={cn(
                                        "font-medium",
                                        isDarkMode ? "text-slate-300" : "text-slate-700"
                                      )}>
                                        {event.participants || '0'}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  {/* Requirements */}
                                  {event.requirements && event.requirements.length > 0 && (
                                    <div>
                                      <div className="flex flex-wrap gap-2">
                                        {event.requirements.slice(0, 2).map((req, reqIndex) => (
                                          <Badge
                                            key={reqIndex}
                                            variant="outline"
                                            className={cn(
                                              "text-xs max-w-[200px]",
                                              isDarkMode 
                                                ? "border-slate-600 text-slate-300" 
                                                : "border-slate-300 text-slate-600"
                                            )}
                                          >
                                            <span className="truncate">
                                              {typeof req === 'string' ? req : req.name}
                                            </span>
                                          </Badge>
                                        ))}
                                        {event.requirements.length > 2 && (
                                          <Badge
                                            variant="outline"
                                            className={cn(
                                              "text-xs",
                                              isDarkMode 
                                                ? "border-slate-600 text-slate-400" 
                                                : "border-slate-300 text-slate-500"
                                            )}
                                          >
                                            +{event.requirements.length - 2} more
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </div>
                    );
                  })()}
                </TabsContent>

                <TabsContent value="tagged" className="space-y-6">
                  {(() => {
                    const taggedEvents = events.filter(event => event.tagType === 'received');
                    const filteredEvents = filterEvents(taggedEvents, searchQuery);
                    
                    if (taggedEvents.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center py-12">
                          <AlertCircle className={cn(
                            "h-12 w-12",
                            isDarkMode ? "text-slate-600" : "text-slate-300"
                          )} />
                          <h3 className={cn(
                            "mt-4 text-lg font-medium",
                            isDarkMode ? "text-slate-300" : "text-slate-700"
                          )}>No Tagged Events</h3>
                          <p className={cn(
                            "mt-2 text-sm text-center",
                            isDarkMode ? "text-slate-400" : "text-slate-500"
                          )}>
                            There are no events where your department has been tagged.
                          </p>
                        </div>
                      );
                    }

                    if (filteredEvents.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center py-12">
                          <Search className={cn(
                            "h-12 w-12",
                            isDarkMode ? "text-slate-600" : "text-slate-300"
                          )} />
                          <h3 className={cn(
                            "mt-4 text-lg font-medium",
                            isDarkMode ? "text-slate-300" : "text-slate-700"
                          )}>No Results Found</h3>
                          <p className={cn(
                            "mt-2 text-sm text-center",
                            isDarkMode ? "text-slate-400" : "text-slate-500"
                          )}>
                            No tagged events match "{searchQuery}". Try a different search term.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-6 py-4">
                        {filteredEvents.map((event) => (
                          <motion.div
                            key={event.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ y: -4 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => setSelectedEvent(event)}
                            className="cursor-pointer"
                          >
                            <Card className={cn(
                              "border transition-all duration-200 hover:shadow-lg",
                              isDarkMode 
                                ? "bg-slate-900 border-slate-700 hover:border-blue-500/50" 
                                : "bg-white border-slate-200 hover:border-blue-300"
                            )}>
                              <CardHeader className="pb-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-3">
                                      <div className={cn(
                                        "p-2 rounded-lg",
                                        isDarkMode 
                                          ? "bg-blue-500/20" 
                                          : "bg-blue-50"
                                      )}>
                                        <Building2 className={cn(
                                          "h-4 w-4",
                                          isDarkMode ? "text-blue-400" : "text-blue-600"
                                        )} />
                                      </div>
                                      <div>
                                        <CardTitle className={cn(
                                          "text-lg font-semibold",
                                          isDarkMode ? "text-white" : "text-slate-900"
                                        )}>
                                          {event.title}
                                        </CardTitle>
                                        <CardDescription className={cn(
                                          "text-sm mt-1",
                                          isDarkMode ? "text-slate-400" : "text-slate-500"
                                        )}>
                                          {event.department}
                                        </CardDescription>
                                      </div>
                                    </div>
                                    
                                    <Badge 
                                      className={cn(
                                        "w-fit font-medium",
                                        event.tagType === 'received' 
                                          ? "bg-blue-600 text-white hover:bg-blue-700" 
                                          : "bg-slate-600 text-white hover:bg-slate-700"
                                      )}
                                    >
                                      {event.tagType === 'received' ? 'Tagged Event' : 'Created Event'}
                                    </Badge>
                                  </div>
                                  
                                  <ArrowRight className={cn(
                                    "h-5 w-5 opacity-50",
                                    isDarkMode ? "text-slate-400" : "text-slate-500"
                                  )} />
                                </div>
                              </CardHeader>
                              
                              <CardContent>
                                <div className="space-y-4">
                                  {/* Event Info Grid */}
                                  <div className="grid grid-cols-3 gap-4 text-sm">
                                    <div className="flex items-center gap-2">
                                      <CalendarDays className={cn(
                                        "h-4 w-4",
                                        isDarkMode ? "text-blue-400" : "text-blue-600"
                                      )} />
                                      <span className={cn(
                                        "font-medium",
                                        isDarkMode ? "text-slate-300" : "text-slate-700"
                                      )}>
                                        {getDateDisplay(event)}
                                      </span>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                      <MapPin className={cn(
                                        "h-4 w-4",
                                        isDarkMode ? "text-blue-400" : "text-blue-600"
                                      )} />
                                      <span className={cn(
                                        "font-medium truncate",
                                        isDarkMode ? "text-slate-300" : "text-slate-700"
                                      )}>
                                        {getLocationDisplay(event)}
                                      </span>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                      <Users className={cn(
                                        "h-4 w-4",
                                        isDarkMode ? "text-blue-400" : "text-blue-600"
                                      )} />
                                      <span className={cn(
                                        "font-medium",
                                        isDarkMode ? "text-slate-300" : "text-slate-700"
                                      )}>
                                        {event.participants || '0'}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  {/* Requirements */}
                                  {event.requirements && event.requirements.length > 0 && (
                                    <div>
                                      <div className="flex flex-wrap gap-2">
                                        {event.requirements.slice(0, 2).map((req, reqIndex) => (
                                          <Badge
                                            key={reqIndex}
                                            variant="outline"
                                            className={cn(
                                              "text-xs max-w-[200px]",
                                              isDarkMode 
                                                ? "border-slate-600 text-slate-300" 
                                                : "border-slate-300 text-slate-600"
                                            )}
                                          >
                                            <span className="truncate">
                                              {typeof req === 'string' ? req : req.name}
                                            </span>
                                          </Badge>
                                        ))}
                                        {event.requirements.length > 2 && (
                                          <Badge
                                            variant="outline"
                                            className={cn(
                                              "text-xs",
                                              isDarkMode 
                                                ? "border-slate-600 text-slate-400" 
                                                : "border-slate-300 text-slate-500"
                                            )}
                                          >
                                            +{event.requirements.length - 2} more
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </div>
                    );
                  })()}
                </TabsContent>
              </>
            )}
          </Tabs>
        </motion.div>
      )}

      {/* Selected Event Details */}
      {selectedEvent && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="container py-6"
        >
          <div className="flex items-center gap-4 mb-6 px-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedEvent(null)}
              className={cn(
                "shrink-0",
                isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
              )}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className={cn(
                "text-2xl font-semibold tracking-tight",
                isDarkMode ? "text-white" : "text-slate-900"
              )}>{selectedEvent.title}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={selectedEvent.tagType === 'received' ? "default" : "secondary"}>
                  {selectedEvent.tagType === 'received' ? 'Tagged' : 'Created'}
                </Badge>
                <span className={cn(
                  "text-sm",
                  isDarkMode ? "text-slate-400" : "text-slate-600"
                )}>
                  {selectedEvent.department}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-6 px-6">
                        {/* Event Overview */}
                <Card className={cn(
                  "overflow-hidden border shadow-lg",
                  isDarkMode 
                    ? "bg-slate-800 border-slate-700/50" 
                    : "bg-white border-slate-200/50"
                )}>
               <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <div className={cn(
                        "p-2 rounded-full",
                        isDarkMode ? "bg-purple-500/20" : "bg-purple-100"
                      )}>
                        <CalendarDays className="h-5 w-5 text-purple-500" />
                      </div>
                      <span>Event Overview</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedEvent.isMultipleLocations && selectedEvent.locations && selectedEvent.locations.length > 0 ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                          <div className={cn(
                            "p-1.5 rounded-lg",
                            isDarkMode ? "bg-blue-500/20" : "bg-blue-100"
                          )}>
                            <MapPin className={cn(
                              "h-4 w-4",
                              isDarkMode ? "text-blue-400" : "text-blue-600"
                            )} />
                          </div>
                          <h4 className={cn(
                            "text-sm font-medium",
                            isDarkMode ? "text-slate-300" : "text-slate-600"
                          )}>Multiple Locations ({selectedEvent.locations.length})</h4>
                        </div>
                        
                        {selectedEvent.locations.map((location, index) => (
                            <div key={index} className={cn(
                              "p-4 rounded-xl border",
                              isDarkMode 
                                ? "bg-slate-800 border-slate-700" 
                                : "bg-slate-50 border-slate-200"
                            )}>
                              <div className="grid gap-3 md:grid-cols-3">
                                <div>
                                  <h5 className={cn(
                                    "text-xs font-medium mb-1",
                                    isDarkMode ? "text-slate-400" : "text-slate-500"
                                  )}>Location</h5>
                                  <p className={cn(
                                    "text-sm font-medium",
                                    isDarkMode ? "text-white" : "text-slate-900"
                                  )}>
                                    {location.location || 'Not specified'}
                                  </p>
                                </div>
                                
                                <div>
                                  <h5 className={cn(
                                    "text-xs font-medium mb-1",
                                    isDarkMode ? "text-slate-400" : "text-slate-500"
                                  )}>Start</h5>
                                  <div className="space-y-1">
                                    <p className={cn(
                                      "text-sm font-medium",
                                      isDarkMode ? "text-white" : "text-slate-900"
                                    )}>
                                      {(() => {
                                        const startDate = location.startDate || location.date;
                                        if (startDate) {
                                          try {
                                            const dateObj = startDate?.toDate ? startDate.toDate() : new Date(startDate);
                                            return format(dateObj, "MMM d, yyyy");
                                          } catch (e) {
                                            return startDate.toString();
                                          }
                                        }
                                        return 'Date not specified';
                                      })()}
                                    </p>
                                    <p className={cn(
                                      "text-xs",
                                      isDarkMode ? "text-slate-400" : "text-slate-500"
                                    )}>
                                      {(() => {
                                        // Extract start time from startDate timestamp
                                        if (location.startDate) {
                                          try {
                                            const startDateTime = location.startDate?.toDate ? location.startDate.toDate() : new Date(location.startDate);
                                            return format(startDateTime, "h:mm a");
                                          } catch (e) {
                                            return 'Time parsing error';
                                          }
                                        }
                                        
                                        return 'Time not specified';
                                      })()}
                                    </p>
                                  </div>
                                </div>
                                
                                <div>
                                  <h5 className={cn(
                                    "text-xs font-medium mb-1",
                                    isDarkMode ? "text-slate-400" : "text-slate-500"
                                  )}>End</h5>
                                  <div className="space-y-1">
                                    <p className={cn(
                                      "text-sm font-medium",
                                      isDarkMode ? "text-white" : "text-slate-900"
                                    )}>
                                      {(() => {
                                        const endDate = location.endDate;
                                        if (endDate) {
                                          try {
                                            const dateObj = endDate?.toDate ? endDate.toDate() : new Date(endDate);
                                            return format(dateObj, "MMM d, yyyy");
                                          } catch (e) {
                                            return endDate.toString();
                                          }
                                        }
                                        return 'Date not specified';
                                      })()}
                                    </p>
                                    <p className={cn(
                                      "text-xs",
                                      isDarkMode ? "text-slate-400" : "text-slate-500"
                                    )}>
                                      {(() => {
                                        // Extract end time from endDate timestamp
                                        if (location.endDate) {
                                          try {
                                            const endDateTime = location.endDate?.toDate ? location.endDate.toDate() : new Date(location.endDate);
                                            return format(endDateTime, "h:mm a");
                                          } catch (e) {
                                            return 'Time parsing error';
                                          }
                                        }
                                        
                                        return 'Time not specified';
                                      })()}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid gap-6 md:grid-cols-4">
                        {/* Start Time */}
                        <div className={cn(
                          "p-4 rounded-xl space-y-2",
                          isDarkMode 
                            ? "bg-slate-800 border border-slate-700" 
                            : "bg-slate-50 border border-slate-200"
                        )}>
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "p-1.5 rounded-lg",
                              isDarkMode ? "bg-blue-500/20" : "bg-blue-100"
                            )}>
                              <Clock className={cn(
                                "h-4 w-4",
                                isDarkMode ? "text-blue-400" : "text-blue-600"
                              )} />
                            </div>
                            <h4 className={cn(
                              "text-sm font-medium",
                              isDarkMode ? "text-slate-300" : "text-slate-600"
                            )}>Start Time</h4>
                          </div>
                          <p className={cn(
                            "text-sm font-medium",
                            isDarkMode ? "text-white" : "text-slate-900"
                          )}>
                            {(() => {
                              // First try to get from recentActivity
                              if (selectedEvent.recentActivity && selectedEvent.recentActivity.length > 0) {
                                const startDateActivity = selectedEvent.recentActivity
                                  .filter(activity => activity.type === 'startDateTime')
                                  .sort((a, b) => (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0))[0];
                                
                                if (startDateActivity && startDateActivity.newValue) {
                                  try {
                                    const date = new Date(startDateActivity.newValue);
                                    if (!isNaN(date.getTime())) {
                                      return format(date, "MMMM d, yyyy 'at' h:mm a");
                                    }
                                  } catch (e) {
                                    // If parsing fails, return the raw value
                                    return startDateActivity.newValue;
                                  }
                                }
                              }
                              
                              // Fallback to eventStore transformed fields
                              if (selectedEvent.start) {
                                return format(selectedEvent.start, "MMMM d, yyyy 'at' h:mm a");
                              }
                              
                              // Fallback to direct startDate field
                              if (selectedEvent.startDate) {
                                const date = selectedEvent.startDate?.toDate ? 
                                  selectedEvent.startDate.toDate() : 
                                  new Date(selectedEvent.startDate);
                                return format(date, "MMMM d, yyyy 'at' h:mm a");
                              }
                              
                              return 'Not specified';
                            })()}
                          </p>
                        </div>

                        {/* End Time */}
                        <div className={cn(
                          "p-4 rounded-xl space-y-2",
                          isDarkMode 
                            ? "bg-slate-800 border border-slate-700" 
                            : "bg-slate-50 border border-slate-200"
                        )}>
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "p-1.5 rounded-lg",
                              isDarkMode ? "bg-blue-500/20" : "bg-blue-100"
                            )}>
                              <Clock className={cn(
                                "h-4 w-4",
                                isDarkMode ? "text-blue-400" : "text-blue-600"
                              )} />
                            </div>
                            <h4 className={cn(
                              "text-sm font-medium",
                              isDarkMode ? "text-slate-300" : "text-slate-600"
                            )}>End Time</h4>
                          </div>
                          <p className={cn(
                            "text-sm font-medium",
                            isDarkMode ? "text-white" : "text-slate-900"
                          )}>
                            {(() => {
                              // First try to get from recentActivity
                              if (selectedEvent.recentActivity && selectedEvent.recentActivity.length > 0) {
                                const endDateActivity = selectedEvent.recentActivity
                                  .filter(activity => activity.type === 'endDateTime')
                                  .sort((a, b) => (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0))[0];
                                
                                if (endDateActivity && endDateActivity.newValue) {
                                  try {
                                    const date = new Date(endDateActivity.newValue);
                                    if (!isNaN(date.getTime())) {
                                      return format(date, "MMMM d, yyyy 'at' h:mm a");
                                    }
                                  } catch (e) {
                                    // If parsing fails, return the raw value
                                    return endDateActivity.newValue;
                                  }
                                }
                              }
                              
                              // Fallback to eventStore transformed fields
                              if (selectedEvent.actualEndDate) {
                                return format(selectedEvent.actualEndDate, "MMMM d, yyyy 'at' h:mm a");
                              }
                              
                              // Fallback to direct endDate field
                              if (selectedEvent.endDate) {
                                const date = selectedEvent.endDate?.toDate ? 
                                  selectedEvent.endDate.toDate() : 
                                  new Date(selectedEvent.endDate);
                                return format(date, "MMMM d, yyyy 'at' h:mm a");
                              }
                              
                              return 'Not specified';
                            })()}
                          </p>
                        </div>

                        {/* Location */}
                        <div className={cn(
                          "p-4 rounded-xl space-y-2",
                          isDarkMode 
                            ? "bg-slate-800 border border-slate-700" 
                            : "bg-slate-50 border border-slate-200"
                        )}>
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "p-1.5 rounded-lg",
                              isDarkMode ? "bg-blue-500/20" : "bg-blue-100"
                            )}>
                              <MapPin className={cn(
                                "h-4 w-4",
                                isDarkMode ? "text-blue-400" : "text-blue-600"
                              )} />
                            </div>
                            <h4 className={cn(
                              "text-sm font-medium",
                              isDarkMode ? "text-slate-300" : "text-slate-600"
                            )}>Location</h4>
                          </div>
                          <p className={cn(
                            "text-sm font-medium",
                            isDarkMode ? "text-white" : "text-slate-900"
                          )}>
                            {selectedEvent.location || 'Not specified'}
                          </p>
                        </div>

                        {/* File Attachments */}
                        <div className={cn(
                          "p-4 rounded-xl space-y-2",
                          isDarkMode 
                            ? "bg-slate-800 border border-slate-700" 
                            : "bg-slate-50 border border-slate-200"
                        )}>
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "p-1.5 rounded-lg",
                              isDarkMode ? "bg-green-500/20" : "bg-green-100"
                            )}>
                              <Paperclip className={cn(
                                "h-4 w-4",
                                isDarkMode ? "text-green-400" : "text-green-600"
                              )} />
                            </div>
                            <h4 className={cn(
                              "text-sm font-medium",
                              isDarkMode ? "text-slate-300" : "text-slate-600"
                            )}>Attachments</h4>
                          </div>
                          <div className={cn(
                            "text-sm font-medium",
                            isDarkMode ? "text-white" : "text-slate-900"
                          )}>
                            {selectedEvent.attachments && selectedEvent.attachments.length > 0 ? (
                              <div className="space-y-1">
                                <p>{selectedEvent.attachments.length} file{selectedEvent.attachments.length > 1 ? 's' : ''}</p>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className={cn(
                                    "w-full gap-1 h-7 text-xs",
                                    isDarkMode 
                                      ? "border-slate-600 hover:bg-slate-700" 
                                      : "border-slate-300 hover:bg-slate-50"
                                  )}
                                  onClick={() => {
                                    // Always show modal for both single and multiple files
                                    setShowAttachmentsModal(true);
                                  }}
                                >
                                  <Eye className="h-3 w-3" />
                                  View Files
                                </Button>
                              </div>
                            ) : (
                              <p className={cn(
                                "text-xs",
                                isDarkMode ? "text-slate-400" : "text-slate-500"
                              )}>
                                No files
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

              {/* Requirements */}
              <Card className={cn(
                "overflow-hidden border shadow-lg",
                isDarkMode 
                  ? "bg-slate-800 border-slate-700/50" 
                  : "bg-white border-slate-200/50"
              )}>
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <div className={cn(
                          "p-2 rounded-full",
                          isDarkMode ? "bg-purple-500/20" : "bg-purple-100"
                        )}>
                          <CheckCircle2 className="h-5 w-5 text-purple-500" />
                        </div>
                        <span>Department Requirements</span>
                      </CardTitle>
                      <CardDescription className="ml-10">
                        Resources and requirements needed for this event
                      </CardDescription>
                    </div>
                    
                    {/* Filter Dropdown and PDF Report Button - Responsive */}
                    {selectedEvent.requirements && selectedEvent.requirements.length > 0 && (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                        {/* Filter Dropdown */}
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <Filter className={cn(
                            "h-4 w-4 shrink-0",
                            isDarkMode ? "text-slate-400" : "text-slate-600"
                          )} />
                          <Select value={requirementFilter} onValueChange={setRequirementFilter}>
                            <SelectTrigger className={cn(
                              "w-full sm:w-[180px] h-8 text-xs",
                              isDarkMode 
                                ? "bg-slate-700 border-slate-600 text-white" 
                                : "bg-white border-slate-300 text-slate-900"
                            )}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">
                                All ({selectedEvent.requirements.length})
                              </SelectItem>
                              <SelectItem value="complied">
                                Complied ({selectedEvent.requirements.filter(req => {
                                  const key = getRequirementKey(selectedEvent.id, req.name);
                                  return requirementStatus[key];
                                }).length})
                              </SelectItem>
                              <SelectItem value="not-complied">
                                Not Complied ({selectedEvent.requirements.filter(req => {
                                  const key = getRequirementKey(selectedEvent.id, req.name);
                                  return !requirementStatus[key];
                                }).length})
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* PDF Report Button */}
                        <Dialog open={showPdfPreview} onOpenChange={setShowPdfPreview}>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              className={cn(
                                "h-8 px-3 text-xs gap-2 w-full sm:w-auto",
                                isDarkMode
                                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                                  : "bg-blue-600 hover:bg-blue-700 text-white"
                              )}
                            >
                              <FileText className="h-3 w-3" />
                              <span className="hidden xs:inline">Report</span>
                              <span className="xs:hidden">PDF</span>
                            </Button>
                          </DialogTrigger>
                          <DialogContent className={cn(
                            "max-w-[95vw] sm:max-w-[900px] p-0 border-none h-[90vh] sm:h-auto",
                            isDarkMode ? "bg-slate-900" : "bg-white"
                          )}>
                            <DialogHeader className="p-6 pb-2">
                              <DialogTitle className={cn(
                                isDarkMode ? "text-gray-100" : "text-gray-900"
                              )}>Preview Report</DialogTitle>
                            </DialogHeader>

                            <div className={cn(
                              "flex flex-col gap-4 p-3 sm:p-6 pt-2",
                              isDarkMode ? "text-gray-100" : "text-gray-900"
                            )}>
                              <div className={cn(
                                "w-full h-[60vh] sm:h-[70vh] rounded-lg overflow-hidden",
                                isDarkMode ? "bg-slate-800" : "bg-gray-50"
                              )}>
                                <PDFViewer
                                  width="100%"
                                  height="100%"
                                  style={{
                                    border: 'none',
                                    backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                                  }}
                                >
                                  <AccomplishmentReportPDF 
                                    event={selectedEvent}
                                    requirementStatus={requirementStatus}
                                    requirementRemarks={requirementRemarks}
                                    userDepartment={auth.currentUser?.displayName || 'Department'}
                                  />
                                </PDFViewer>
                              </div>

                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3">
                                <Button
                                  variant="outline"
                                  className={cn(
                                    isDarkMode ? "border-slate-700 hover:bg-slate-800" : "border-gray-200 hover:bg-gray-100"
                                  )}
                                  onClick={() => setShowPdfPreview(false)}
                                >
                                  Close
                                </Button>
                                <PDFDownloadLink
                                  document={
                                    <AccomplishmentReportPDF 
                                      event={selectedEvent}
                                      requirementStatus={requirementStatus}
                                      requirementRemarks={requirementRemarks}
                                      userDepartment={auth.currentUser?.displayName || 'Department'}
                                    />
                                  }
                                  fileName={`accomplishment-report-${selectedEvent.title?.replace(/[^a-zA-Z0-9]/g, '-')}-${format(new Date(), "yyyy-MM-dd")}.pdf`}
                                >
                                  {({ loading }) => (
                                    <Button
                                      className="bg-black hover:bg-gray-800 text-white gap-2 w-full sm:w-auto"
                                      disabled={loading}
                                    >
                                      <Download className="h-4 w-4" />
                                      <span className="hidden xs:inline">{loading ? "Preparing..." : "Download PDF"}</span>
                                      <span className="xs:hidden">{loading ? "..." : "Download"}</span>
                                    </Button>
                                  )}
                                </PDFDownloadLink>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    {getFilteredRequirements(selectedEvent.requirements)?.map((req, index) => {
                      const requirementKey = getRequirementKey(selectedEvent.id, req.name);
                      const isCompleted = requirementStatus[requirementKey] || false;
                      const remarks = requirementRemarks[requirementKey] || '';
                      const hasData = isCompleted || (remarks && remarks.trim() !== '');
                      const isCardSubmitted = submittedEvents[selectedEvent.id] && hasData && editingEvent !== selectedEvent.id;
                      const isTaggedEvent = selectedEvent.tagType === 'received'; // Only show completion for tagged events
                      
                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: index * 0.1 }}
                        >
                          <div className="relative">
                            {/* Edit Button Overlay for individual card - outside blur container */}
                            {isCardSubmitted && isTaggedEvent && (
                              <div className="absolute inset-0 flex items-center justify-center z-10">
                                <Button
                                  onClick={() => handleEditAccomplishment(selectedEvent.id)}
                                  className={cn(
                                    "gap-2 px-3 py-1.5 text-sm font-semibold shadow-xl transition-all duration-200 backdrop-blur-none",
                                    isDarkMode
                                      ? "bg-blue-600 hover:bg-blue-700 text-white border border-blue-500"
                                      : "bg-blue-600 hover:bg-blue-700 text-white border border-blue-500"
                                  )}
                                >
                                  <Edit className="h-3 w-3" />
                                  Edit
                                </Button>
                              </div>
                            )}
                            <div
                              className={cn(
                                "flex flex-col gap-3 md:gap-4 rounded-xl p-3 md:p-4 transition-all shadow-sm",
                                isDarkMode 
                                  ? "bg-slate-900/50 ring-1 ring-slate-700/50" 
                                  : "bg-slate-50 ring-1 ring-slate-200/50",
                                isCardSubmitted && isTaggedEvent && "blur-[2px] pointer-events-none"
                              )}
                            >
                            <div className="flex items-start gap-3 md:gap-4">
                              <div className={cn(
                                "p-2 md:p-3 rounded-xl shrink-0",
                                isDarkMode ? "bg-purple-500/10" : "bg-purple-50"
                              )}>
                                <FileText className={cn(
                                  "h-4 w-4 md:h-5 md:w-5",
                                  isDarkMode ? "text-purple-400" : "text-purple-500"
                                )} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-2">
                                  <h4 className={cn(
                                    "font-medium flex flex-col sm:flex-row sm:items-center gap-2",
                                    isDarkMode ? "text-white" : "text-slate-900"
                                  )}>
                                    <span className="text-sm md:text-base">{req.name}</span>
                                    <Badge className={cn(
                                      "w-fit px-2 py-0.5 text-[10px] font-medium",
                                      isDarkMode 
                                        ? "bg-purple-500/10 text-purple-300 border border-purple-500/20" 
                                        : "bg-purple-50 text-purple-700 border border-purple-100"
                                    )}>
                                      Required
                                    </Badge>
                                  </h4>
                                  
                                  {/* Checkbox in the right corner */}
                                  <div className="flex items-center gap-2 self-start sm:self-auto">
                                    <Label 
                                      htmlFor={`req-${requirementKey}`}
                                      className={cn(
                                        "text-xs md:text-sm font-medium",
                                        isTaggedEvent ? "cursor-pointer" : "cursor-default",
                                        isDarkMode ? "text-slate-300" : "text-slate-700"
                                      )}
                                    >
                                      {isTaggedEvent ? "Completed" : (isCompleted ? "Complied" : "Not Yet Complied")}
                                    </Label>
                                    <Checkbox
                                      id={`req-${requirementKey}`}
                                      checked={isCompleted}
                                      onCheckedChange={isTaggedEvent ? (checked) => 
                                        handleRequirementStatusChange(selectedEvent.id, req.name, checked) : undefined
                                      }
                                      disabled={!isTaggedEvent}
                                      className={cn(
                                        "h-4 w-4 md:h-5 md:w-5 data-[state=checked]:font-bold",
                                        isDarkMode 
                                          ? "border-slate-600 data-[state=checked]:bg-black data-[state=checked]:border-black data-[state=checked]:text-white" 
                                          : "border-slate-400 data-[state=checked]:bg-black data-[state=checked]:border-black data-[state=checked]:text-white",
                                        !isTaggedEvent && "opacity-60 cursor-not-allowed"
                                      )}
                                    />
                                  </div>
                                </div>

                                {req.note && (
                                  <div className={cn(
                                    "mt-3 md:mt-4 pt-3 space-y-2 border-t",
                                    isDarkMode ? "border-slate-800" : "border-slate-200"
                                  )}>
                                    {req.note.split('\n').map((line, lineIndex) => {
                                      const [key, value] = line.split(':').map(s => s.trim());
                                      return (
                                        <div key={lineIndex} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                          <span className={cn(
                                            "text-sm md:text-base font-medium",
                                            isDarkMode ? "text-slate-300" : "text-slate-700"
                                          )}>
                                            {key}
                                          </span>
                                          {value && (
                                            <span className={cn(
                                              "text-sm md:text-base",
                                              isDarkMode ? "text-slate-400" : "text-slate-600"
                                            )}>
                                              : {value}
                                            </span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Remarks Section */}
                                <div className={cn(
                                  "mt-3 md:mt-4 pt-3 space-y-2 md:space-y-3 border-t",
                                  isDarkMode ? "border-slate-800" : "border-slate-200"
                                )}>
                                  <Label 
                                    htmlFor={`remarks-${requirementKey}`}
                                    className={cn(
                                      "text-xs md:text-sm font-medium",
                                      isDarkMode ? "text-slate-300" : "text-slate-700"
                                    )}
                                  >
                                    Remarks {!isTaggedEvent && "(from tagged department)"}
                                  </Label>
                                  <Textarea
                                    id={`remarks-${requirementKey}`}
                                    placeholder={isTaggedEvent 
                                      ? "Add any remarks or notes about this requirement (e.g., provided 25 chairs instead of 50 requested)"
                                      : "No remarks from tagged department yet"
                                    }
                                    value={remarks}
                                    onChange={isTaggedEvent ? (e) => 
                                      handleRequirementRemarksChange(selectedEvent.id, req.name, e.target.value) : undefined
                                    }
                                    readOnly={!isTaggedEvent}
                                    className={cn(
                                      "min-h-[60px] md:min-h-[80px] resize-none text-sm md:text-base",
                                      isDarkMode 
                                        ? "bg-slate-800 border-slate-700 text-white placeholder-slate-400" 
                                        : "bg-white border-slate-300 text-slate-900 placeholder-slate-500",
                                      !isTaggedEvent && "opacity-60 cursor-not-allowed"
                                    )}
                                  />
                                </div>
                              </div>
                            </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                    {(!selectedEvent.requirements || selectedEvent.requirements.length === 0) && (
                      <div className="flex flex-col items-center justify-center py-8">
                        <div className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center mb-4",
                          isDarkMode ? "bg-slate-800" : "bg-slate-100"
                        )}>
                          <FileText className={cn(
                            "w-6 h-6",
                            isDarkMode ? "text-slate-400" : "text-slate-400"
                          )} />
                        </div>
                        <h3 className={cn(
                          "text-sm font-medium mb-2",
                          isDarkMode ? "text-slate-300" : "text-slate-700"
                        )}>No Requirements</h3>
                        <p className={cn(
                          "text-xs text-center max-w-[200px]",
                          isDarkMode ? "text-slate-400" : "text-slate-500"
                        )}>
                          This event doesn't have any specific requirements.
                        </p>
                      </div>
                    )}
                    
                    {selectedEvent.requirements && selectedEvent.requirements.length > 0 && 
                     getFilteredRequirements(selectedEvent.requirements).length === 0 && (
                      <div className="flex flex-col items-center justify-center py-8 col-span-full">
                        <div className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center mb-4",
                          isDarkMode ? "bg-slate-800" : "bg-slate-100"
                        )}>
                          <FileText className={cn(
                            "w-6 h-6",
                            isDarkMode ? "text-slate-400" : "text-slate-400"
                          )} />
                        </div>
                        <h3 className={cn(
                          "text-sm font-medium mb-2",
                          isDarkMode ? "text-slate-300" : "text-slate-700"
                        )}>No Requirements Match Filter</h3>
                        <p className={cn(
                          "text-xs text-center max-w-[200px]",
                          isDarkMode ? "text-slate-400" : "text-slate-500"
                        )}>
                          No requirements match the current filter. Try selecting a different filter.
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Submit Accomplishment Button - only for tagged events */}
                  {selectedEvent.requirements && selectedEvent.requirements.length > 0 && selectedEvent.tagType === 'received' && (
                    <div className="flex justify-center sm:justify-end pt-4 md:pt-6 border-t border-slate-200 dark:border-slate-700">
                      <Button
                        onClick={handleSubmitAccomplishment}
                        disabled={isSubmitting}
                        className={cn(
                          "gap-2 px-4 md:px-6 py-2 md:py-2.5 font-semibold shadow-lg transition-all duration-200 text-sm md:text-base w-full sm:w-auto",
                          isDarkMode
                            ? "bg-black hover:bg-gray-800 text-white border border-gray-700"
                            : "bg-black hover:bg-gray-800 text-white border border-gray-700"
                        )}
                      >
                        {isSubmitting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4" />
                            {submittedEvents[selectedEvent.id] ? 'Update Accomplishment' : 'Submit Accomplishment'}
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
          </div>
        </motion.div>
      )}

      {/* Attachments Modal */}
      <Dialog open={showAttachmentsModal} onOpenChange={setShowAttachmentsModal}>
        <DialogContent className={cn(
          "max-w-2xl max-h-[80vh] overflow-hidden",
          isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
        )}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Paperclip className="h-5 w-5 text-green-500" />
              Event Attachments
            </DialogTitle>
          </DialogHeader>
          
          <div className="overflow-y-auto max-h-[60vh] space-y-3">
            {selectedEvent?.attachments?.map((attachment, index) => (
              <div 
                key={index}
                className={cn(
                  "flex items-center justify-between p-4 rounded-lg border",
                  isDarkMode 
                    ? "bg-slate-700/50 border-slate-600" 
                    : "bg-slate-50 border-slate-200"
                )}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={cn(
                    "p-2 rounded-lg flex-shrink-0",
                    isDarkMode ? "bg-blue-500/20" : "bg-blue-100"
                  )}>
                    <File className={cn(
                      "h-5 w-5",
                      isDarkMode ? "text-blue-400" : "text-blue-600"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-medium truncate",
                      isDarkMode ? "text-white" : "text-slate-900"
                    )}
                    title={attachment.name} // Show full name on hover
                    >
                      {attachment.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className={cn(
                        "text-xs",
                        isDarkMode ? "text-slate-400" : "text-slate-500"
                      )}>
                        {attachment.size ? `${(attachment.size / 1024 / 1024).toFixed(2)} MB` : 'Unknown size'}
                      </p>
                      {attachment.type && (
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full",
                          isDarkMode ? "bg-slate-600 text-slate-300" : "bg-slate-200 text-slate-600"
                        )}>
                          {(() => {
                            // Map MIME types to clean file extensions
                            const mimeTypeMap = {
                              'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
                              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
                              'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
                              'application/msword': 'DOC',
                              'application/vnd.ms-excel': 'XLS',
                              'application/vnd.ms-powerpoint': 'PPT',
                              'application/pdf': 'PDF',
                              'text/plain': 'TXT',
                              'image/jpeg': 'JPG',
                              'image/png': 'PNG',
                              'image/gif': 'GIF',
                              'application/zip': 'ZIP',
                              'application/x-rar-compressed': 'RAR'
                            };
                            
                            // Try to get clean extension from MIME type map
                            if (mimeTypeMap[attachment.type]) {
                              return mimeTypeMap[attachment.type];
                            }
                            
                            // Fallback: try to extract from filename
                            if (attachment.name) {
                              const fileExtension = attachment.name.split('.').pop();
                              if (fileExtension && fileExtension !== attachment.name) {
                                return fileExtension.toUpperCase();
                              }
                            }
                            
                            // Last fallback: use MIME type
                            return attachment.type.split('/').pop().toUpperCase();
                          })()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className={cn(
                      "gap-1 px-3",
                      isDarkMode 
                        ? "border-slate-600 hover:bg-slate-700" 
                        : "border-slate-300 hover:bg-slate-50"
                    )}
                    onClick={() => {
                      if (attachment.url) {
                        window.open(attachment.url, '_blank');
                      }
                    }}
                  >
                    <Eye className="h-3 w-3" />
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className={cn(
                      "gap-1 px-3",
                      isDarkMode 
                        ? "border-slate-600 hover:bg-slate-700" 
                        : "border-slate-300 hover:bg-slate-50"
                    )}
                    onClick={async () => {
                      if (attachment.url) {
                        try {
                          // Fetch the file as a blob to force download
                          const response = await fetch(attachment.url);
                          const blob = await response.blob();
                          
                          // Create a blob URL
                          const blobUrl = window.URL.createObjectURL(blob);
                          
                          // Create a temporary anchor element to trigger download
                          const link = document.createElement('a');
                          link.href = blobUrl;
                          link.download = attachment.name || 'download';
                          document.body.appendChild(link);
                          link.click();
                          
                          // Clean up
                          document.body.removeChild(link);
                          window.URL.revokeObjectURL(blobUrl);
                        } catch (error) {
                          console.error('Download failed:', error);
                          // Fallback to opening in new tab if download fails
                          window.open(attachment.url, '_blank');
                        }
                      }
                    }}
                  >
                    <Download className="h-3 w-3" />
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-700">
            <p className={cn(
              "text-sm",
              isDarkMode ? "text-slate-400" : "text-slate-600"
            )}>
              {selectedEvent?.attachments?.length || 0} file{(selectedEvent?.attachments?.length || 0) !== 1 ? 's' : ''} total
            </p>
            <Button
              variant="outline"
              onClick={() => setShowAttachmentsModal(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </motion.div>
    </AnimatePresence>
  );
};

export default TaggedDepartments;
