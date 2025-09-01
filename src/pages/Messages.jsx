import { useState, useEffect, useRef } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Search, Send, Users, Paperclip, Image } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/lib/firebase/firebase";
import useMessageStore from "@/store/messageStore";
import { useMessageSubscriptions } from "@/hooks/useMessageSubscriptions";
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
    markAsRead
  } = useMessageStore();

  // Use custom hook for subscriptions
  const { subscribeToChat, cleanup } = useMessageSubscriptions();
  
  // Track current chat subscription
  const currentChatSubscription = useRef(null);

  // Handle user selection and clear unread messages
  const handleUserSelect = (user) => {
    setSelectedUser(user);
    markAsRead(user.email);
  };

  // Get current user from localStorage and Firestore
  useEffect(() => {
    const fetchUserData = async () => {
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
    };

    fetchUserData();
  }, [setCurrentUser]);

  // Fetch tagged departments when current user changes
  useEffect(() => {
    if (currentUser?.email) {
      fetchTaggedDepartments(currentUser.email);
    }
  }, [currentUser?.email, fetchTaggedDepartments]);

  // Fetch users when tagged departments change or when usersWhoTaggedMe changes
  useEffect(() => {
    if (taggedDepartments.length > 0 || usersWhoTaggedMe.length > 0) {
      fetchUsers();
    }
  }, [taggedDepartments, usersWhoTaggedMe, fetchUsers]);

  // Create a ref map for user list items
  const userRefs = useRef({});

  // Handle department-based messaging from MyEvents
  useEffect(() => {
    if (location.state?.selectedUser && users.length > 0) {
      console.log('Location state:', location.state.selectedUser);
      console.log('Available users:', users);
      
      // Function to find and select user
      const findAndSelectUser = () => {
        // Find the target user
        const targetUser = users.find(user => {
          // If it's a department message, match by department
          if (location.state.selectedUser.isDepartmentMessage) {
            const match = user.department === location.state.selectedUser.department;
            console.log(`Checking user "${user.department}" (type: ${typeof user.department}) against "${location.state.selectedUser.department}" (type: ${typeof location.state.selectedUser.department}): ${match}`);
            console.log(`User department length: ${user.department?.length}, State department length: ${location.state.selectedUser.department?.length}`);
            return match;
          }
          // Otherwise match by email or id
          const match = user.email === location.state.selectedUser.email || user.id === location.state.selectedUser.id;
          console.log(`Checking user ${user.email}/${user.id} against ${location.state.selectedUser.email}/${location.state.selectedUser.id}: ${match}`);
          return match;
        });
        
        console.log('Target user found:', targetUser);
        
        if (targetUser) {
          // Get the ref for this user's list item
          const userRef = userRefs.current[targetUser.id];
          console.log('User ref found:', userRef);
          
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
            console.log('User ref not found, setting selected user directly');
            setSelectedUser(targetUser);
            markAsRead(targetUser.email);
          }
        } else {
          console.log('No target user found in users array');
          // Try to find by partial department match
          const partialMatch = users.find(user => 
            user.department && 
            location.state.selectedUser.department && 
            (user.department.toLowerCase().includes(location.state.selectedUser.department.toLowerCase()) ||
             location.state.selectedUser.department.toLowerCase().includes(user.department.toLowerCase()))
          );
          
          if (partialMatch) {
            console.log('Found partial match:', partialMatch);
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
    
    // Subscribe to new chat
    currentChatSubscription.current = subscribeToChat(chatId);
    
    return () => {
      if (currentChatSubscription.current) {
        currentChatSubscription.current();
        currentChatSubscription.current = null;
      }
    };
  }, [currentUser, selectedUser, subscribeToChat]);

  // Cleanup subscriptions on unmount
  useEffect(() => {
    return () => {
      if (currentChatSubscription.current) {
        currentChatSubscription.current();
        currentChatSubscription.current = null;
      }
      cleanup();
    };
  }, [cleanup]);

  // Send message
  const handleSendMessage = async () => {
    if (!message.trim() || !currentUser || !selectedUser) return;

    try {
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
      
      // Dispatch event for immediate scroll
      window.dispatchEvent(new Event('message-sent'));
      
      const result = await sendMessage(messageData);
      if (!result.success) {
        // Only show error if sending failed
        toast.error("Error sending message");
        // Restore the message in the input if sending failed
        setMessage(messageContent);
      } else {
        // Force scroll after successful send
        setTimeout(() => {
          window.dispatchEvent(new Event('message-sent'));
        }, 100);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Error sending message");
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

  // Scroll on new messages
  useEffect(() => {
    if (messages) {
      forceScrollToBottom();
    }
  }, [messages]);

  // Scroll when selecting a new user
  useEffect(() => {
    if (selectedUser) {
      forceScrollToBottom();
    }
  }, [selectedUser]);

  // Set up automatic scroll on content changes
  useEffect(() => {
    if (!scrollAreaRef.current) return;

    // Create mutation observer to watch for content changes
    const observer = new MutationObserver(() => {
      forceScrollToBottom();
    });

    // Observe both attribute and content changes
    observer.observe(scrollAreaRef.current, {
      childList: true,
      subtree: true,
      characterData: true
    });

    return () => observer.disconnect();
  }, []);

  // Handle scroll to bottom after sending message
  useEffect(() => {
    const handleSendScroll = () => {
      forceScrollToBottom();
    };

    // Add event listener for message send
    window.addEventListener('message-sent', handleSendScroll);
    return () => window.removeEventListener('message-sent', handleSendScroll);
  }, []);

  // Sort and filter users based on last message and search
  const sortedAndFilteredUsers = users
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

  // Show error toast if there's an error
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  return (
    <div className="p-2">
      <div className={cn(
        "flex h-[calc(100vh-1rem)] w-full max-w-none overflow-hidden rounded-lg shadow-lg border",
        isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200"
      )}>
        {/* Left Panel - Users List */}
        <div className={cn(
          "w-[350px] flex flex-col border-r h-full",
          isDarkMode ? "border-slate-800 bg-slate-900/95" : "border-gray-200 bg-white"
        )}>
          {/* Header */}
          <div className={cn(
            "py-3 px-4 flex items-center border-b",
            isDarkMode ? "border-slate-800" : "border-gray-200"
          )}>
            <h2 className={cn(
              "text-lg font-semibold",
              isDarkMode ? "text-white" : "text-gray-900"
            )}>Messages</h2>
          </div>
          {/* Search Bar */}
          <div className="p-4">
            <div className="relative">
              <Search className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4",
                isDarkMode ? "text-gray-400" : "text-gray-500"
              )} />
              <Input
                placeholder="Search in messages"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={cn(
                  "pl-10 bg-transparent",
                  isDarkMode ? "border-slate-800" : "border-gray-200"
                )}
              />
            </div>
          </div>

                     {/* Users List */}
           <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
             <div className="p-2">
              {loading.users ? (
                <div className={cn(
                  "text-center py-4",
                  isDarkMode ? "text-gray-400" : "text-gray-500"
                )}>Loading users...</div>
              ) : sortedAndFilteredUsers.length > 0 ? (
                <div className="space-y-1">
                  {sortedAndFilteredUsers.map((user) => {
                    // Debug: Log user data to see what's available
                    console.log('User data:', user);
                    return (
                    <motion.div
                      key={user.id}
                      ref={el => userRefs.current[user.id] = el}
                      onClick={() => handleUserSelect(user)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all relative",
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
                            selectedUser?.id === user.id
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-700/20 dark:text-blue-300"
                              : "bg-gray-100 text-gray-700 dark:bg-gray-700/20 dark:text-gray-300"
                          )}>
                            {getInitials(user.department)}
                          </AvatarFallback>
                        </Avatar>
                        <span className={cn(
                          "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2",
                          isDarkMode ? "border-slate-900" : "border-white",
                          "bg-green-500"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          {user.department && (
                            <Badge variant="outline" className="text-xs">
                              {user.department}
                            </Badge>
                          )}
                          {unreadMessages[user.email] && (
                            <Badge variant="default" className="bg-blue-500 hover:bg-blue-500 ml-2">
                              New
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-col gap-0.5 mt-1.5">
                          <p className={cn(
                            "text-sm truncate",
                            isDarkMode ? "text-gray-400" : "text-gray-500"
                          )}>{user.email}</p>

                          {/* Show event title */}
                          {((user.taggedEvents && user.taggedEvents.length > 0) || user.taggingEvents && user.taggingEvents.length > 0) && (
                            <p className={cn(
                              "text-xs truncate mt-0.5",
                              isDarkMode ? "text-gray-500" : "text-gray-400"
                            )}>
                              {/* Show event title from either tagged or tagging events */}
                              {(user.taggedEvents?.[0]?.eventTitle || user.taggingEvents?.[0]?.eventTitle) && (
                                <>
                                  <span className="font-medium">Event:</span> {
                                    (user.taggedEvents?.[0]?.eventTitle || user.taggingEvents?.[0]?.eventTitle).length > 30 
                                      ? (user.taggedEvents?.[0]?.eventTitle || user.taggingEvents?.[0]?.eventTitle).substring(0, 30) + '...' 
                                      : (user.taggedEvents?.[0]?.eventTitle || user.taggingEvents?.[0]?.eventTitle)
                                  }
                                </>
                              )}
                            </p>
                          )}
                          {/* Fallback to eventTitle or title if no events available */}
                          {(!user.taggedEvents || user.taggedEvents.length === 0) && (!user.taggingEvents || user.taggingEvents.length === 0) && (user.eventTitle || user.title) && (
                            <p className={cn(
                              "text-xs truncate mt-0.5",
                              isDarkMode ? "text-gray-500" : "text-gray-400"
                            )}>
                              <span className="font-medium">Event:</span> {
                                (user.eventTitle || user.title).length > 30 
                                  ? (user.eventTitle || user.title).substring(0, 30) + '...' 
                                  : (user.eventTitle || user.title)
                              }
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )})}
                </div>
              ) : (
                <div className={cn(
                  "text-center py-4 px-4",
                  isDarkMode ? "text-gray-400" : "text-gray-500"
                )}>
                  {taggedDepartments.length === 0 
                    ? "No tagged departments found. Tag departments in your events to message them."
                    : "No users found from your tagged departments."}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Chat Area */}
        <div className="flex flex-col h-full flex-1">
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
                      {selectedUser.isDepartmentMessage ? selectedUser.department : (selectedUser.email || selectedUser.name)}
                    </h3>
                    <p className={cn(
                      "text-sm",
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    )}>
                      {selectedUser.isDepartmentMessage ? "Department Contact" : "Active now"}
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
                          <div className={cn(
                            "max-w-[70%] rounded-2xl px-4 py-2 relative",
                            msg.from === currentUser?.email
                              ? (isDarkMode 
                                  ? "bg-blue-600 text-white" 
                                  : "bg-blue-500 text-white")
                              : (isDarkMode
                                  ? "bg-slate-800 text-gray-100"
                                  : "bg-gray-100 text-gray-900")
                          )}>
                            <p className="text-sm leading-relaxed">{msg.content}</p>
                            <div className="flex items-center justify-between mt-1">
                              <p className={cn(
                                "text-[10px]",
                                msg.from === currentUser?.email
                                  ? (isDarkMode ? "text-blue-200/70" : "text-blue-50/90")
                                  : (isDarkMode ? "text-gray-400" : "text-gray-500")
                              )}>
                                {msg.timestamp?.toDate?.() 
                                  ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                  : new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                }
                              </p>
                              {msg.isPending && (
                                <div className="flex items-center gap-1">
                                  <div className="w-2 h-2 bg-current opacity-60 rounded-full animate-pulse"></div>
                                  <span className="text-[10px] opacity-60">Sending...</span>
                                </div>
                              )}
                            </div>
                          </div>
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
  );
};

export default Messages;