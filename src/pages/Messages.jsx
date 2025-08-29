import { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Search, Send, Users, Paperclip, Image } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { collection, query, where, getDocs, addDoc, onSnapshot, orderBy, serverTimestamp, limit } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";

const getInitials = (department) => {
  if (!department) return "U"; // Default to "U" for User if no department
  return department.split(" ").map(word => word[0]).join("").toUpperCase();
};

const Messages = () => {
  const { isDarkMode } = useTheme();
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Handle user selection and clear unread messages
  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setUnreadMessages(prev => ({
      ...prev,
      [user.email]: false
    }));
  };
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);

  // Get current user from localStorage
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("userData"));
    if (userData) {
      setCurrentUser(userData);
    }
  }, []);

  // State for tracking last messages
  const [lastMessages, setLastMessages] = useState({});
  const [unreadMessages, setUnreadMessages] = useState({});

  // Fetch all users and their last messages
  useEffect(() => {
    const fetchUsers = async () => {
      if (!currentUser) return;

      try {
        setLoading(true);
        const usersRef = collection(db, "users");
        const usersSnapshot = await getDocs(usersRef);
        const usersData = usersSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(user => 
            user.email !== currentUser.email && // Exclude current user
            user.role !== "Admin" // Exclude admin users
          );
        setUsers(usersData);

        // Subscribe to last messages for all chats in a single listener
        const messagesRef = collection(db, "messages");
        const q = query(
          messagesRef,
          where("participants", "array-contains", currentUser.email),
          orderBy("timestamp", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
          const lastMessagesMap = {};
          const unreadMap = {};
          
          snapshot.docs.forEach(doc => {
            const message = doc.data();
            const otherUser = message.participants.find(p => p !== currentUser.email);
            
            // Only update if this is a more recent message for this chat
            if (!lastMessagesMap[otherUser] || 
                message.timestamp?.toMillis() > lastMessagesMap[otherUser].timestamp?.toMillis()) {
              lastMessagesMap[otherUser] = message;
              
              // Mark as unread if the message is to current user
              if (message.to === currentUser.email) {
                unreadMap[otherUser] = true;
              }
            }
          });

          setLastMessages(lastMessagesMap);
          setUnreadMessages(unreadMap);
        });

        // Clean up listener when component unmounts or user changes
        return () => unsubscribe();
      } catch (error) {
        console.error("Error fetching users:", error);
        toast.error("Error fetching users");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [currentUser]);

  // Load messages
  useEffect(() => {
    if (!currentUser || !selectedUser) return;

    // Create a unique chat ID that will be the same regardless of who started the chat
    const chatId = [currentUser.email, selectedUser.email].sort().join("_");
    const messagesRef = collection(db, "messages"); // Single collection for all messages
    const q = query(
      messagesRef,
      where("chatId", "==", chatId),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(messagesData);
    });

    return () => unsubscribe();
  }, [currentUser, selectedUser]);

  // Send message
  const sendMessage = async () => {
    if (!message.trim() || !currentUser || !selectedUser) return;

    try {
      // Use the same messages collection for all chats
      const messagesRef = collection(db, "messages");
      const chatId = [currentUser.email, selectedUser.email].sort().join("_");
      
      await addDoc(messagesRef, {
        chatId, // This field helps us filter conversations between specific users
        from: currentUser.email,
        to: selectedUser.email,
        content: message.trim(),
        timestamp: serverTimestamp(),
        // Add additional metadata that might be useful for queries
        participants: [currentUser.email, selectedUser.email].sort(),
        fromDepartment: currentUser.department,
        toDepartment: selectedUser.department,
      });
      
      setMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Error sending message");
    }
  };

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

  return (
    <div className={cn(
      "flex h-screen w-full",
      isDarkMode ? "bg-slate-900" : "bg-white"
    )}>
        {/* Left Panel - Users List */}
        <div className={cn(
          "w-[320px] flex flex-col border-r",
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
          <ScrollArea className="flex-1">
            <div className="p-2">
              {loading ? (
                <div className={cn(
                  "text-center py-4",
                  isDarkMode ? "text-gray-400" : "text-gray-500"
                )}>Loading users...</div>
              ) : sortedAndFilteredUsers.length > 0 ? (
                <div className="space-y-1">
                  {sortedAndFilteredUsers.map((user) => (
                    <motion.div
                      key={user.id}
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
                        <p className={cn(
                          "text-sm truncate mt-1.5",
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        )}>{user.email}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className={cn(
                  "text-center py-4",
                  isDarkMode ? "text-gray-400" : "text-gray-500"
                )}>No users found</div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right Panel - Chat Area */}
        <div className="flex flex-col h-full flex-1">
          {selectedUser ? (
            <>
              {/* Chat Header */}
              <div className={cn(
                "flex items-center py-2 px-4 border-b",
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
                    )}>{selectedUser.name || selectedUser.email}</h3>
                    <p className={cn(
                      "text-sm",
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    )}>Active now</p>
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  <AnimatePresence>
                    {messages.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={cn(
                          "flex items-end gap-2",
                          msg.from === currentUser.email ? "justify-end" : "justify-start"
                        )}
                      >
                        {msg.from !== currentUser.email && (
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-[10px] font-medium">
                              {selectedUser.department || "User"}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div className={cn(
                          "max-w-[70%] rounded-2xl px-4 py-2",
                          msg.from === currentUser.email
                            ? (isDarkMode 
                                ? "bg-blue-600 text-white" 
                                : "bg-blue-500 text-white")
                            : (isDarkMode
                                ? "bg-slate-800 text-gray-100"
                                : "bg-gray-100 text-gray-900")
                        )}>
                          <p className="text-sm leading-relaxed">{msg.content}</p>
                          <p className={cn(
                            "text-[10px] mt-1",
                            msg.from === currentUser.email
                              ? (isDarkMode ? "text-blue-200/70" : "text-blue-50/90")
                              : (isDarkMode ? "text-gray-400" : "text-gray-500")
                          )}>
                            {msg.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        {msg.from === currentUser.email && (
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-[10px] font-medium">
                              {currentUser.department || "User"}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className={cn(
                "py-2 px-4 border-t",
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
                          sendMessage();
                        }
                      }}
                    />
                  </div>
                  <Button 
                    onClick={sendMessage}
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
            </>
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
  );
};

export default Messages;