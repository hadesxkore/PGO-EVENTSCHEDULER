import { useState, useEffect, useRef } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Search, Send, Users, Paperclip, Image } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from "@/lib/firebase/firebase";
import useMessageStore from "@/store/messageStore";
import { useLocation } from "react-router-dom";

const getInitials = (department) => {
  if (!department) return "U"; // Default to "U" for User if no department
  return department.split(" ").map(word => word[0]).join("").toUpperCase();
};

const Messages = () => {
  const { isDarkMode } = useTheme();
  const location = useLocation();
     const [searchTerm, setSearchTerm] = useState("");
   const [selectedUser, setSelectedUser] = useState(location.state?.selectedUser || null);
   const [message, setMessage] = useState("");
   const [expandedGroups, setExpandedGroups] = useState(new Set());

  
  // Get store state and actions
  const {
    users,
    messages,
    lastMessages,
    unreadMessages,
    currentUser,
    taggedDepartments,
    usersWhoTaggedMe,
    loading,
    error,
    setCurrentUser,
    fetchTaggedDepartments,
    fetchUsers,
    sendMessage,
    markAsRead,
    loadMessages,
    subscribeToMessages,
    subscribeToEvents,
    isUsersCacheValid,
    isDepartmentsCacheValid,
    isMessagesCacheValid
  } = useMessageStore();

  // Track current chat subscription
  const currentChatSubscription = useRef(null);

     // Handle user selection and clear unread messages
   const handleUserSelect = (user) => {
     setSelectedUser(user);
     markAsRead(user.email);
   };
   
   // Handle group expansion toggle
   const toggleGroupExpansion = (eventId) => {
     setExpandedGroups(prev => {
       const newSet = new Set(prev);
       if (newSet.has(eventId)) {
         newSet.delete(eventId);
       } else {
         newSet.add(eventId);
       }
       return newSet;
     });
   };
   
   // Handle department selection from event group
   const handleDepartmentSelect = (department, eventTitle) => {
     // Find the actual user for this department
     const departmentUser = users.find(u => u.department === department.name);
     
     // Create a user object with the actual user's data
     const selectedDepartmentUser = {
       id: `dept_${department.name}_${eventTitle}`,
       email: departmentUser?.email || `department@${department.name.toLowerCase()}`,
       department: department.name,
       name: departmentUser?.name || department.name,
       isDepartmentMessage: false, // Set to false to show actual email
       eventTitle: eventTitle,
       eventId: department.eventId
     };
     
     setSelectedUser(selectedDepartmentUser);
   };

     // Get current user from localStorage and store it in Zustand
   useEffect(() => {
     try {
       // Get basic user data from localStorage
       const userDataStr = localStorage.getItem("userData");
       if (!userDataStr) {
         console.error("No user data in localStorage");
         toast.error("Please log in to view messages");
         return;
       }

       const parsed = JSON.parse(userDataStr);
       if (!parsed?.email) {
         console.error("Invalid user data format");
         toast.error("Error loading user data");
         return;
       }

       // Use the user data directly from localStorage
       const userData = {
         ...parsed,
         email: parsed.email,
         department: parsed.department,
         role: parsed.role,
         uid: parsed.uid || parsed.id // Use existing uid/id if available
       };

       setCurrentUser(userData);
     } catch (error) {
       console.error("Error fetching user data:", error);
       toast.error("Error loading user data");
     }
   }, [setCurrentUser]);
   
   // Fetch current user's events to get taggingEvents data
   useEffect(() => {
     const fetchCurrentUserEvents = async () => {
       if (!currentUser?.email || currentUser.taggingEvents) return; // Skip if we already have tagging events
       
       try {
         // Get events where current user is the creator
         const eventsRef = collection(db, "eventRequests");
         const userEventsQuery = query(eventsRef, where("userEmail", "==", currentUser.email));
         const userEventsSnapshot = await getDocs(userEventsQuery);
         
         const taggingEvents = [];
         userEventsSnapshot.docs.forEach(doc => {
           const event = doc.data();
           if (event.departmentRequirements && event.departmentRequirements.length > 0) {
             event.departmentRequirements.forEach(dept => {
               if (dept.departmentName) {
                 taggingEvents.push({
                   eventId: doc.id,
                   eventTitle: event.title || event.eventTitle,
                   taggedDepartment: dept.departmentName,
                   timestamp: event.timestamp || event.createdAt
                 });
               }
             });
           }
         });
         
         // Only update if we found new events
         if (taggingEvents.length > 0) {
           setCurrentUser({
             ...currentUser,
             taggingEvents
           });
         }

       } catch (error) {
         console.error('Error fetching current user events:', error);
       }
     };
     
     fetchCurrentUserEvents();
   }, [currentUser?.email]); // Only depend on email to prevent loops

     // Fetch tagged departments and users in one effect to prevent loops
   useEffect(() => {
     const fetchData = async () => {
       if (!currentUser?.email) return;

       // Only fetch departments if cache is invalid
       if (!isDepartmentsCacheValid()) {
         await fetchTaggedDepartments(currentUser.email);
       }

       // Only fetch users if cache is invalid and we have departments
       if (!isUsersCacheValid() && (taggedDepartments.length > 0 || usersWhoTaggedMe.length > 0)) {
         await fetchUsers();
       }
     };

     fetchData();
   }, [currentUser?.email, isDepartmentsCacheValid, isUsersCacheValid]);

  // Create a ref map for user list items
  const userRefs = useRef({});

  // Handle department-based messaging from MyEvents
  useEffect(() => {
    if (location.state?.selectedUser && users.length > 0) {

      
      // Function to find and select user
      const findAndSelectUser = () => {
        // Find the target user
        const targetUser = users.find(user => {
          // If it's a department message, match by department
          if (location.state.selectedUser.isDepartmentMessage) {
            const match = user.department === location.state.selectedUser.department;

            return match;
          }
          // Otherwise match by email or id
          const match = user.email === location.state.selectedUser.email || user.id === location.state.selectedUser.id;

          return match;
        });
        
        if (targetUser) {
          // Get the ref for this user's list item
          const userRef = userRefs.current[targetUser.id];
          
          if (userRef) {
            // Scroll the user into view
            userRef.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Simulate click on the user item
            userRef.click();
            // Add a temporary highlight effect
            userRef.style.transition = 'background-color 0.3s ease';
            userRef.style.backgroundColor = isDarkMode ? 'rgba(30, 41, 59, 0.5)' : 'rgba(59, 130, 246, 0.1)';
            setTimeout(() => {
              userRef.style.backgroundColor = '';
            }, 1000);
          } else {

            setSelectedUser(targetUser);
            markAsRead(targetUser.email);
          }
        } else {

          // Try to find by partial department match
          const partialMatch = users.find(user => 
            user.department && 
            location.state.selectedUser.department && 
            (user.department.toLowerCase().includes(location.state.selectedUser.department.toLowerCase()) ||
             location.state.selectedUser.department.toLowerCase().includes(user.department.toLowerCase()))
          );
          
          if (partialMatch) {

            setSelectedUser(partialMatch);
            markAsRead(partialMatch.email);
          }
        }
      };
      
      // Try immediately
      findAndSelectUser();
      
      // Also try after a delay to ensure DOM is ready
      const timer = setTimeout(findAndSelectUser, 200);
      
      return () => clearTimeout(timer);
    }
  }, [location.state?.selectedUser, users, isDarkMode, markAsRead]);

     // Subscribe to chat messages when user selects a chat
   useEffect(() => {
     if (!currentUser || !selectedUser) {
       // Clean up previous subscription if no user is selected
       if (currentChatSubscription.current) {
         currentChatSubscription.current();
         currentChatSubscription.current = null;
       }
       return;
     }

     const chatId = [currentUser.email, selectedUser.email].sort().join("_");
     
     // Clean up previous subscription
     if (currentChatSubscription.current) {
       currentChatSubscription.current();
     }
     
     // Load cached messages first
     if (!isMessagesCacheValid(chatId)) {
       loadMessages(chatId);
     }
     
     // Subscribe to new chat
     currentChatSubscription.current = subscribeToMessages(chatId);
     
     return () => {
       if (currentChatSubscription.current) {
         currentChatSubscription.current();
         currentChatSubscription.current = null;
       }
     };
   }, [currentUser, selectedUser, subscribeToMessages, loadMessages, isMessagesCacheValid]);

  // Cleanup subscriptions on unmount
  useEffect(() => {
    return () => {
      if (currentChatSubscription.current) {
        currentChatSubscription.current();
        currentChatSubscription.current = null;
      }
    };
  }, []);

  // Send message using Zustand store
  const handleSendMessage = async () => {
    if (!message.trim() || !currentUser || !selectedUser) return;

    const chatId = [currentUser.email, selectedUser.email].sort().join("_");
    const messageContent = message.trim();
    
    // Clear input immediately for better UX
    setMessage("");
    
    const messageData = {
      chatId,
      from: currentUser.email,
      to: selectedUser.email,
      content: messageContent,
      participants: [currentUser.email, selectedUser.email].sort(),
      fromDepartment: currentUser.department,
      toDepartment: selectedUser.department,
    };
    
    const result = await sendMessage(messageData);
    if (!result.success) {
      // Only show error if sending failed
      toast.error("Error sending message");
      // Restore the message in the input if sending failed
      setMessage(messageContent);
    }
  };

  // Get current chat messages
  const getCurrentChatMessages = () => {
    if (!currentUser || !selectedUser) return [];
    const chatId = [currentUser.email, selectedUser.email].sort().join("_");
    const chatMessages = messages[chatId] || [];
    
    // Ensure unique messages by ID and sort by timestamp
    const uniqueMessages = chatMessages.reduce((acc, message) => {
      if (!acc.some(existing => existing.id === message.id)) {
        acc.push(message);
      }
      return acc;
    }, []);
    
    // Sort by timestamp (oldest first, newest last)
    return uniqueMessages.sort((a, b) => {
      // For pending messages, always put them at the end
      if (a.isPending && !b.isPending) return 1;
      if (!a.isPending && b.isPending) return -1;
      if (a.isPending && b.isPending) {
        // If both are pending, use their creation timestamps
        return (a.serverTimestamp || 0) - (b.serverTimestamp || 0);
      }
      
      // For non-pending messages, use normal timestamp comparison
      const timeA = a.timestamp?.toMillis?.() || a.timestamp?.getTime?.() || a.timestamp || 0;
      const timeB = b.timestamp?.toMillis?.() || b.timestamp?.getTime?.() || b.timestamp || 0;
      return timeA - timeB;
    });
  };

  // Auto-scroll handling
  const messagesEndRef = useRef(null);
  const scrollAreaRef = useRef(null);
  
  // Function to force scroll to the very bottom
  const forceScrollToBottom = () => {
    if (scrollAreaRef.current) {
      // Use a small delay to ensure DOM is updated
      setTimeout(() => {
        scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
      }, 0);
    }
  };

  // Track if we should auto-scroll
  const shouldAutoScroll = useRef(true);
  const lastMessageRef = useRef(null);

  // Function to check if we're near the bottom
  const isNearBottom = () => {
    if (!scrollAreaRef.current) return true;
    const { scrollHeight, scrollTop, clientHeight } = scrollAreaRef.current;
    return scrollHeight - scrollTop - clientHeight < 100;
  };

  // Update auto-scroll flag when user scrolls
  useEffect(() => {
    const handleScroll = () => {
      shouldAutoScroll.current = isNearBottom();
    };

    const scrollArea = scrollAreaRef.current;
    if (scrollArea) {
      scrollArea.addEventListener('scroll', handleScroll);
      return () => scrollArea.removeEventListener('scroll', handleScroll);
    }
  }, []);

           // Scroll on new messages only if we're near the bottom
    useEffect(() => {
      if (messages && shouldAutoScroll.current) {
        forceScrollToBottom();
      }
    }, [messages]);

           // Scroll when selecting a new user
    useEffect(() => {
      if (selectedUser) {
        shouldAutoScroll.current = true;
        forceScrollToBottom();
      }
    }, [selectedUser]);



  // Handle scroll to bottom after sending message
  useEffect(() => {
    const handleSendScroll = () => {
      forceScrollToBottom();
    };

    // Add event listener for message send
    window.addEventListener('message-sent', handleSendScroll);
    return () => window.removeEventListener('message-sent', handleSendScroll);
  }, []);

     // Group users by events and departments for better organization
   const groupUsersByEvents = (users) => {
     const eventGroups = new Map();
     const individualUsers = [];
     
     // Only show event groups if the current user is the tagger
     if (currentUser) {
       users.forEach(user => {
         if (user.eventGroups && user.eventGroups.length > 0) {
           user.eventGroups.forEach(group => {
             // Only add event group if current user is the tagger
             if (group.taggerEmail === currentUser.email) {
               const eventKey = `event_${group.eventId}`;
               if (!eventGroups.has(eventKey)) {
                 eventGroups.set(eventKey, {
                   ...group,
                   type: 'event_group'
                 });
               }
             }
           });
         }
       });
     }
     
     // For tagged departments, show only the tagger as an individual user
     users.forEach(user => {
       if (currentUser) {
         // If current user is a tagged department
         if (user.taggingEvents && user.taggingEvents.some(event => event.taggedDepartment === currentUser.department)) {
           // Only show the tagger
           individualUsers.push(user);
         }
         // If current user is the tagger
         else if (user.eventGroups && user.eventGroups.some(group => group.taggerEmail === currentUser.email)) {
           // Only add users that aren't in event groups (since they'll be shown in the group)
           if (!Array.from(eventGroups.values()).some(group => group.departments.includes(user.department))) {
             individualUsers.push(user);
           }
         }
         // If it's the current user, always add them
         else if (user.email === currentUser.email) {
           individualUsers.push(user);
         }
       } else {
         individualUsers.push(user);
       }
     });
     
     return {
       // Only return event groups if current user is a tagger
       eventGroups: currentUser && Array.from(eventGroups.values()).some(group => group.taggerEmail === currentUser.email) 
         ? Array.from(eventGroups.values()) 
         : [],
       individualUsers
     };
   };
   
       // Get grouped users
    const { eventGroups, individualUsers } = groupUsersByEvents(users);
    
    // Debug logging removed to prevent re-renders
   
   // Sort and filter users based on last message and search
   const sortedAndFilteredUsers = individualUsers
     .filter(user => 
       user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
       (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
       (user.department && user.department.toLowerCase().includes(searchTerm.toLowerCase()))
     )
     .sort((a, b) => {
       const lastMessageA = lastMessages[a.email];
       const lastMessageB = lastMessages[b.email];
       
       if (!lastMessageA && !lastMessageB) return 0;
       if (!lastMessageA) return 1;
       if (!lastMessageB) return -1;
       
       return lastMessageB.timestamp?.toMillis() - lastMessageA.timestamp?.toMillis();
     });
   
   // Sort event groups by timestamp
   const sortedEventGroups = eventGroups
     .filter(group => 
       group.eventTitle.toLowerCase().includes(searchTerm.toLowerCase())
     )
     .sort((a, b) => {
       const timeA = a.timestamp?.toMillis?.() || a.timestamp?.getTime?.() || a.timestamp || 0;
       const timeB = b.timestamp?.toMillis?.() || b.timestamp?.getTime?.() || b.timestamp || 0;
       return timeB - timeA;
     });

     // Show error toast if there's an error
   useEffect(() => {
     if (error) {
       toast.error(error);
     }
   }, [error]);

   // Auto-focus and center the main chat area when component mounts
   useEffect(() => {
     // Disable body scroll when Messages component mounts
     document.body.style.overflow = 'hidden';
     document.body.style.height = '100vh';
     
     // Function to focus and center the main chat area
     const focusAndCenterChatArea = () => {
       const mainChatArea = document.querySelector('[data-chat-area]');
       if (mainChatArea) {
         mainChatArea.focus();
         // Scroll the main chat area into view and center it
         mainChatArea.scrollIntoView({ 
           behavior: 'smooth', 
           block: 'center',
           inline: 'center'
         });
         // Completely disable auto-scroll to keep the view centered
         shouldAutoScroll.current = false;
         return true; // Successfully focused
       }
       return false; // Element not found
     };
     
     // Try immediately
     let focused = focusAndCenterChatArea();
     
     // If not focused, try with increasing delays to ensure DOM is ready
     if (!focused) {
       const delays = [100, 200, 500, 1000]; // Multiple attempts with different delays
       delays.forEach((delay, index) => {
         setTimeout(() => {
           if (!focused) {
             focused = focusAndCenterChatArea();
           }
         }, delay);
       });
     }

     // Cleanup: re-enable body scroll when component unmounts
     return () => {
       document.body.style.overflow = '';
       document.body.style.height = '';
     };
   }, [location.state]); // Re-run when navigation state changes

         return (
     <TooltipProvider>
               <div className="p-2">
        <div className={cn(
          "flex h-[calc(100vh-1rem)] w-full max-w-none overflow-hidden rounded-lg shadow-lg border",
          isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200"
        )}>
        {/* Left Panel - Users List */}
        <div className={cn(
          "w-[350px] flex flex-col h-full shadow-lg",
          isDarkMode ? "bg-slate-900/95" : "bg-white"
        )}>
          {/* Header with integrated search */}
          <div className={cn(
            "p-4 flex flex-col gap-4 backdrop-blur-sm sticky top-0 z-10",
            isDarkMode ? "bg-slate-900/90 border-b border-slate-800" : "bg-white/90 border-b border-gray-100"
          )}>
            <div className="flex items-center justify-between">
              <h2 className={cn(
                "text-xl font-semibold tracking-tight",
                isDarkMode ? "text-white" : "text-gray-900"
              )}>Messages</h2>
              <Badge variant="outline" className={cn(
                "px-2 py-0.5 text-xs font-medium",
                isDarkMode ? "bg-slate-800 text-slate-200" : "bg-gray-100 text-gray-600"
              )}>
                {users.length} contacts
              </Badge>
            </div>
            <div className="relative">
              <Search className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50",
                isDarkMode ? "text-slate-400" : "text-gray-500"
              )} />
              <Input
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={cn(
                  "pl-10 bg-transparent rounded-full border",
                  isDarkMode 
                    ? "border-slate-800 bg-slate-800/50 placeholder:text-slate-400 focus-visible:ring-slate-700" 
                    : "border-gray-200 bg-gray-50/50 placeholder:text-gray-400 focus-visible:ring-gray-200"
                )}
              />
            </div>
          </div>

                     {/* Users List */}
           <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
             <div className="px-2 py-3">
              {loading.users ? (
                <div className="flex items-center justify-center py-8">
                  <div className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full",
                    isDarkMode ? "bg-slate-800 text-slate-300" : "bg-gray-100 text-gray-600"
                  )}>
                    <div className="w-2 h-2 bg-current rounded-full animate-pulse" />
                    <span className="text-sm font-medium">Loading contacts...</span>
                  </div>
                </div>
              ) : (sortedAndFilteredUsers.length > 0 || sortedEventGroups.length > 0) ? (
                <div className="space-y-4">
                   {/* Render Event Groups First */}
                   {sortedEventGroups.map((group) => (
                     <motion.div
                       key={group.eventId}
                       initial={{ opacity: 0, y: 10 }}
                       animate={{ opacity: 1, y: 0 }}
                       transition={{ duration: 0.2 }}
                       className={cn(
                         "rounded-xl overflow-hidden",
                         isDarkMode ? "bg-slate-800/50" : "bg-gray-50"
                       )}
                     >
                       {/* Event Group Header */}
                       <div 
                         onClick={() => toggleGroupExpansion(group.eventId)}
                         className={cn(
                           "flex items-center gap-3 p-3 cursor-pointer transition-all",
                           isDarkMode 
                             ? "hover:bg-slate-800 active:bg-slate-800/80" 
                             : "hover:bg-gray-100/80 active:bg-gray-100"
                         )}
                       >
                         <div className="relative">
                           <Avatar>
                             <AvatarFallback className={cn(
                               "font-medium",
                               isDarkMode 
                                 ? "bg-blue-500/20 text-blue-200" 
                                 : "bg-blue-100 text-blue-700"
                             )}>
                               E
                             </AvatarFallback>
                           </Avatar>
                           <span className={cn(
                             "absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium border-2",
                             isDarkMode 
                               ? "bg-slate-800 text-slate-200 border-slate-900" 
                               : "bg-white text-gray-600 border-gray-50"
                           )}>
                             {group.departments.length}
                           </span>
                         </div>
                         <div className="flex-1 min-w-0">
                           <div className="flex items-center gap-2">
                             <Badge variant="outline" className={cn(
                               "px-2 py-0.5 text-xs font-medium",
                               isDarkMode 
                                 ? "bg-blue-500/10 text-blue-200 border-blue-500/20" 
                                 : "bg-blue-50 text-blue-700 border-blue-100"
                             )}>
                               Event Group
                             </Badge>
                           </div>
                           <p className={cn(
                             "text-sm font-medium truncate mt-1",
                             isDarkMode ? "text-slate-200" : "text-gray-900"
                           )}>
                             {group.eventTitle.length > 40 
                               ? group.eventTitle.substring(0, 40) + '...' 
                               : group.eventTitle
                             }
                           </p>
                           <p className={cn(
                             "text-xs truncate mt-0.5 flex items-center gap-1.5",
                             isDarkMode ? "text-slate-400" : "text-gray-500"
                           )}>
                             <span className="flex-shrink-0">Tagged by:</span>
                             <Badge variant="outline" className={cn(
                               "px-1.5 py-0 text-[10px] font-medium",
                               isDarkMode 
                                 ? "bg-slate-700/50 text-slate-300 border-slate-600" 
                                 : "bg-gray-100 text-gray-600 border-gray-200"
                             )}>
                               {group.taggerDepartment}
                             </Badge>
                           </p>
                         </div>
                         <div className={cn(
                           "w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200",
                           isDarkMode 
                             ? "text-slate-400 bg-slate-800" 
                             : "text-gray-500 bg-gray-100",
                           expandedGroups.has(group.eventId) && (
                             isDarkMode 
                               ? "bg-slate-700 rotate-180" 
                               : "bg-gray-200 rotate-180"
                           )
                         )}>
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                           </svg>
                         </div>
                       </div>
                       
                       {/* Expanded Departments List */}
                       {expandedGroups.has(group.eventId) && (
                         <motion.div
                           initial={{ opacity: 0, height: 0 }}
                           animate={{ opacity: 1, height: "auto" }}
                           exit={{ opacity: 0, height: 0 }}
                           transition={{ duration: 0.2 }}
                           className={cn(
                             "divide-y",
                             isDarkMode ? "divide-slate-700/50" : "divide-gray-100"
                           )}
                         >
                           {group.departments.map((departmentName) => {
                             // Find the user with this department
                             const departmentUser = users.find(u => u.department === departmentName);
                             return (
                               <motion.div
                                 key={`${group.eventId}_${departmentName}`}
                                 onClick={() => handleDepartmentSelect({ name: departmentName }, group.eventTitle)}
                                 className={cn(
                                   "flex items-center gap-3 p-3 cursor-pointer transition-all relative",
                                   selectedUser?.id === `dept_${departmentName}_${group.eventTitle}`
                                     ? (isDarkMode ? "bg-slate-700/50" : "bg-blue-50")
                                     : (isDarkMode ? "hover:bg-slate-700/30" : "hover:bg-blue-50/50")
                                 )}
                                 initial={{ opacity: 0, x: -10 }}
                                 animate={{ opacity: 1, x: 0 }}
                                 transition={{ duration: 0.2 }}
                               >
                                 <div className="relative ml-6">
                                   <Avatar className="w-8 h-8">
                                     <AvatarFallback className={cn(
                                       "text-[10px] font-medium",
                                       isDarkMode 
                                         ? "bg-slate-700 text-slate-200" 
                                         : "bg-white text-gray-700 border border-gray-100"
                                     )}>
                                       {getInitials(departmentName)}
                                     </AvatarFallback>
                                   </Avatar>
                                   {selectedUser?.id === `dept_${departmentName}_${group.eventTitle}` && (
                                     <span className={cn(
                                       "absolute -right-1 -bottom-1 w-3 h-3 rounded-full border-2",
                                       isDarkMode 
                                         ? "bg-blue-500 border-slate-900" 
                                         : "bg-blue-500 border-white"
                                     )} />
                                   )}
                                 </div>
                                 <div className="flex-1 min-w-0">
                                   <div className="flex items-center gap-2">
                                     <Badge variant="outline" className={cn(
                                       "px-1.5 py-0 text-[10px] font-medium",
                                       isDarkMode 
                                         ? "bg-slate-700/50 text-slate-300 border-slate-600" 
                                         : "bg-gray-100 text-gray-600 border-gray-200"
                                     )}>
                                       {departmentName}
                                     </Badge>
                                   </div>
                                   {departmentUser && (
                                     <p className={cn(
                                       "text-xs truncate mt-1.5",
                                       isDarkMode ? "text-slate-400" : "text-gray-500"
                                     )}>
                                       {departmentUser.email}
                                     </p>
                                   )}
                                 </div>
                               </motion.div>
                             );
                           })}
                         </motion.div>
                       )}
                     </motion.div>
                   ))}
                   
                   {/* Render Individual Users */}
                   {sortedAndFilteredUsers.map((user) => {

                     return (
                     <motion.div
                       key={user.id}
                       ref={el => userRefs.current[user.id] = el}
                       onClick={() => handleUserSelect(user)}
                       className={cn(
                         "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all relative group",
                         selectedUser?.id === user.id
                           ? (isDarkMode ? "bg-slate-800" : "bg-blue-50")
                           : (isDarkMode ? "hover:bg-slate-800/50" : "hover:bg-gray-50")
                       )}
                       initial={{ opacity: 0, y: 10 }}
                       animate={{ opacity: 1, y: 0 }}
                       transition={{ duration: 0.2 }}
                     >
                       <div className="relative">
                         <Avatar>
                           <AvatarFallback className={cn(
                             "font-medium",
                             selectedUser?.id === user.id
                               ? (isDarkMode ? "bg-blue-500/20 text-blue-200" : "bg-blue-100 text-blue-700")
                               : (isDarkMode ? "bg-slate-700 text-slate-300" : "bg-gray-100 text-gray-700")
                           )}>
                             {getInitials(user.department)}
                           </AvatarFallback>
                         </Avatar>
                         <span className={cn(
                           "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 transition-colors",
                           isDarkMode ? "border-slate-900" : "border-white",
                           selectedUser?.id === user.id
                             ? "bg-blue-500"
                             : "bg-emerald-500"
                         )} />
                       </div>
                       <div className="flex-1 min-w-0">
                         <div className="flex items-center gap-2">
                           {user.department && (
                             <Badge variant="outline" className={cn(
                               "px-1.5 py-0 text-[10px] font-medium",
                               isDarkMode 
                                 ? "bg-slate-700/50 text-slate-300 border-slate-600" 
                                 : "bg-gray-100 text-gray-600 border-gray-200"
                             )}>
                               {user.department}
                             </Badge>
                           )}
                           {unreadMessages[user.email] && (
                             <Badge className={cn(
                               "px-1.5 py-0.5 text-[10px] font-medium",
                               isDarkMode 
                                 ? "bg-blue-500/20 text-blue-200 border border-blue-500/20" 
                                 : "bg-blue-50 text-blue-700 border border-blue-100"
                             )}>
                               New
                             </Badge>
                           )}
                         </div>
                         <div className="flex flex-col gap-1 mt-1">
                           <p className={cn(
                             "text-sm font-medium truncate",
                             isDarkMode ? "text-slate-200" : "text-gray-700"
                           )}>{user.email}</p>

                           {/* Show event title */}
                           {((user.taggedEvents && user.taggedEvents.length > 0) || user.taggingEvents && user.taggingEvents.length > 0) && (
                             <div className="flex items-center gap-1.5">
                               <Badge variant="outline" className={cn(
                                 "px-1.5 py-0 text-[10px] font-medium",
                                 isDarkMode 
                                   ? "bg-slate-700/50 text-slate-300 border-slate-600" 
                                   : "bg-gray-100 text-gray-600 border-gray-200"
                               )}>
                                 {(user.taggedEvents?.[0]?.eventTitle || user.taggingEvents?.[0]?.eventTitle).length > 30 
                                   ? (user.taggedEvents?.[0]?.eventTitle || user.taggingEvents?.[0]?.eventTitle).substring(0, 30) + '...' 
                                   : (user.taggedEvents?.[0]?.eventTitle || user.taggingEvents?.[0]?.eventTitle)
                                 }
                               </Badge>
                             </div>
                           )}
                           {/* Fallback to eventTitle or title if no events available */}
                           {(!user.taggedEvents || user.taggedEvents.length === 0) && (!user.taggingEvents || user.taggingEvents.length === 0) && (user.eventTitle || user.title) && (
                             <div className="flex items-center gap-1.5">
                               <Badge variant="outline" className={cn(
                                 "px-1.5 py-0 text-[10px] font-medium",
                                 isDarkMode 
                                   ? "bg-slate-700/50 text-slate-300 border-slate-600" 
                                   : "bg-gray-100 text-gray-600 border-gray-200"
                               )}>
                                 {(user.eventTitle || user.title).length > 30 
                                   ? (user.eventTitle || user.title).substring(0, 30) + '...' 
                                   : (user.eventTitle || user.title)
                                 }
                               </Badge>
                             </div>
                           )}
                         </div>
                       </div>
                     </motion.div>
                   )})}
                 </div>
              ) : (
                                 <div className="flex flex-col items-center justify-center py-8 px-4">
                   <div className={cn(
                     "w-12 h-12 rounded-full flex items-center justify-center mb-4",
                     isDarkMode ? "bg-slate-800" : "bg-gray-100"
                   )}>
                     <Users className={cn(
                       "w-6 h-6",
                       isDarkMode ? "text-slate-400" : "text-gray-400"
                     )} />
                   </div>
                   <h3 className={cn(
                     "text-sm font-medium mb-2",
                     isDarkMode ? "text-slate-300" : "text-gray-700"
                   )}>
                     {taggedDepartments.length === 0 
                       ? "No Tagged Departments"
                       : "No Matching Results"}
                   </h3>
                   <p className={cn(
                     "text-xs text-center max-w-[200px]",
                     isDarkMode ? "text-slate-400" : "text-gray-500"
                   )}>
                     {taggedDepartments.length === 0 
                       ? "Tag departments in your events to start messaging them."
                       : "Try adjusting your search or check back later."}
                   </p>
                 </div>
              )}
            </div>
          </div>
        </div>

                 {/* Right Panel - Chat Area */}
         <div className="flex flex-col h-full flex-1" data-chat-area tabIndex={-1}>
          {selectedUser ? (
            <div className="flex flex-col h-full">
              {/* Chat Header */}
              <div className={cn(
                "flex items-center py-2 px-4 border-b sticky top-0 z-10",
                isDarkMode ? "border-slate-800 bg-slate-900/95" : "border-gray-200 bg-white"
              )}>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar>
                      <AvatarFallback className={cn(
                        "bg-blue-100 text-blue-700 dark:bg-blue-700/20 dark:text-blue-300 text-[10px] font-medium"
                      )}>
                        {selectedUser.department || "User"}
                      </AvatarFallback>
                    </Avatar>
                    <span className={cn(
                      "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2",
                      isDarkMode ? "border-slate-900" : "border-white",
                      "bg-green-500"
                    )} />
                  </div>
                  <div>
                                         <h3 className={cn(
                       "font-semibold",
                       isDarkMode ? "text-white" : "text-gray-900"
                     )}>
                       {selectedUser.email}
                     </h3>
                     <p className={cn(
                       "text-sm",
                       isDarkMode ? "text-gray-400" : "text-gray-500"
                     )}>
                       {selectedUser.department}
                     </p>
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div 
                className={cn(
                  "flex-1 overflow-y-auto",
                  "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                )} 
                ref={scrollAreaRef}
              >
                <div className="p-4 space-y-4">
                                      <AnimatePresence>
                      {getCurrentChatMessages().map((msg) => (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className={cn(
                            "flex items-end gap-2",
                            msg.from === currentUser?.email ? "justify-end" : "justify-start"
                          )}
                        >
                          {msg.from !== currentUser?.email && (
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="text-[10px] font-medium">
                                {selectedUser.department || "User"}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div 
                                className={cn(
                                  "max-w-[70%] rounded-2xl px-4 py-2 relative group",
                                  msg.from === currentUser?.email
                                    ? (isDarkMode 
                                        ? "bg-blue-600 text-white" 
                                        : "bg-blue-500 text-white")
                                    : (isDarkMode
                                        ? "bg-slate-800 text-gray-100"
                                        : "bg-gray-100 text-gray-900")
                                )}
                              >
                                <p className="text-sm leading-relaxed">{msg.content}</p>
                                {msg.isPending && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <div className="w-2 h-2 bg-current opacity-60 rounded-full animate-pulse"></div>
                                    <span className="text-[10px] opacity-60">Sending...</span>
                                  </div>
                                )}
                              </div>
                            </TooltipTrigger>
                                                         <TooltipContent 
                               side="bottom" 
                               align="center"
                               className="bg-black/80 text-white border-0"
                             >
                              {msg.timestamp?.toDate?.() 
                                ? format(msg.timestamp.toDate(), "MMM d, yyyy 'at' h:mm a")
                                : format(new Date(msg.timestamp), "MMM d, yyyy 'at' h:mm a")
                              }
                            </TooltipContent>
                          </Tooltip>
                          {msg.from === currentUser?.email && (
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="text-[10px] font-medium">
                                {currentUser?.department || "User"}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {/* Invisible element to scroll to bottom */}
                    <div ref={messagesEndRef} />
                  </div>
                </div>

              {/* Message Input */}
              <div className={cn(
                "py-2 px-4 border-t sticky bottom-0 z-10",
                isDarkMode ? "border-slate-800 bg-slate-900/95" : "border-gray-200 bg-white"
              )}>
                <div className="flex items-end gap-2">
                  <div className="flex-1 flex items-end gap-2 bg-transparent">
                    <Button variant="ghost" size="icon" className="shrink-0">
                      <Paperclip className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="shrink-0">
                      <Image className="h-5 w-5" />
                    </Button>
                    <Textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type a message..."
                      className={cn(
                        "resize-none min-h-[40px] max-h-[120px] bg-transparent",
                        isDarkMode ? "border-slate-800" : "border-gray-200"
                      )}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                  </div>
                  <Button 
                    onClick={handleSendMessage}
                    size="icon"
                    className={cn(
                      "rounded-full h-9 w-9",
                      message.trim() ? "bg-blue-500 hover:bg-blue-600" : "bg-gray-200 hover:bg-gray-300"
                    )}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Users className={cn(
                  "h-12 w-12 mx-auto mb-4",
                  isDarkMode ? "text-gray-600" : "text-gray-400"
                )} />
                <h3 className={cn(
                  "text-lg font-medium mb-2",
                  isDarkMode ? "text-gray-300" : "text-gray-600"
                )}>Select a conversation</h3>
                <p className={cn(
                  "text-sm",
                  isDarkMode ? "text-gray-500" : "text-gray-400"
                )}>
                  Choose a user from the list to start messaging
                </p>
              </div>
            </div>
          )}
                 </div>
       </div>
     </div>
     </TooltipProvider>
   );
 };
 
 export default Messages;