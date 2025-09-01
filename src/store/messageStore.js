import { create } from 'zustand';
import { 
  getTaggedDepartments,
  getUsersFromDepartments,
  subscribeToLastMessages as firebaseSubscribeToLastMessages,
  loadChatMessages,
  subscribeToChatMessages as firebaseSubscribeToChatMessages,
  sendNewMessage
} from '@/lib/firebase/messages';

const useMessageStore = create((set, get) => ({
  // State
  messages: {}, // Keyed by chatId
  users: [],
  lastMessages: {}, // Keyed by user email
  unreadMessages: {},
  currentUser: null,
  taggedDepartments: [],
  usersWhoTaggedMe: [],
  usersWhoMessagedMe: [],
  
  // Cache state
  lastUsersFetch: null,
  lastDepartmentsFetch: null,
  lastMessagesFetch: {}, // Keyed by chatId
  
  // Cache configuration
  usersCacheTime: 10 * 60 * 1000, // 10 minutes
  departmentsCacheTime: 30 * 60 * 1000, // 30 minutes
  messagesCacheTime: 2 * 60 * 1000, // 2 minutes
  
  // Loading states
  loading: {
    users: false,
    departments: false,
    messages: false
  },
  
  // Error state
  error: null,

  // Actions
  setCurrentUser: (user) => set({ currentUser: user }),
  setError: (error) => set({ error }),
  setLoading: (key, value) => set(state => ({
    loading: { ...state.loading, [key]: value }
  })),

  // Check if users cache is valid
  isUsersCacheValid: () => {
    const state = get();
    if (!state.lastUsersFetch) return false;
    return Date.now() - state.lastUsersFetch < state.usersCacheTime;
  },

  // Check if departments cache is valid
  isDepartmentsCacheValid: () => {
    const state = get();
    if (!state.lastDepartmentsFetch) return false;
    return Date.now() - state.lastDepartmentsFetch < state.departmentsCacheTime;
  },

  // Check if messages cache is valid for a specific chat
  isMessagesCacheValid: (chatId) => {
    const state = get();
    if (!state.lastMessagesFetch[chatId]) return false;
    return Date.now() - state.lastMessagesFetch[chatId] < state.messagesCacheTime;
  },

    // Fetch tagged departments (cached)
  fetchTaggedDepartments: async (userEmail, forceFetch = false) => {
    const state = get();
    
    // Return cached data if valid and not forcing fetch
    if (!forceFetch && state.taggedDepartments.length > 0 && state.isDepartmentsCacheValid()) {
      return { success: true, departments: state.taggedDepartments };
    }

    try {
      set(state => ({ loading: { ...state.loading, departments: true } }));
      set({ error: null });

      const result = await getTaggedDepartments(userEmail);

      if (result.success) {
        set({ 
          taggedDepartments: result.departments,
          usersWhoTaggedMe: result.usersWhoTaggedMe || [],
          lastDepartmentsFetch: Date.now()
        });
        return result;
      } else {
        set({ error: result.error });
        return result;
      }
    } catch (error) {
      console.error('Error fetching tagged departments:', error);
      const errorMsg = 'Error fetching departments';
      set({ error: errorMsg });
      return { success: false, error: errorMsg };
    } finally {
      set(state => ({ loading: { ...state.loading, departments: false } }));
    }
  },

  // Fetch users from tagged departments (cached)
  fetchUsers: async (forceFetch = false) => {
    const state = get();
    
    // Return cached data if valid and not forcing fetch
    if (!forceFetch && state.users.length > 0 && state.isUsersCacheValid()) {
      return { success: true, users: state.users };
    }

    try {
      set(state => ({ loading: { ...state.loading, users: true } }));
      set({ error: null });

      const result = await getUsersFromDepartments(
        state.taggedDepartments, 
        state.currentUser?.email, 
        state.currentUser?.uid,
        state.usersWhoTaggedMe || [],
        state.usersWhoMessagedMe || []
      );

      if (result.success) {
        set({ 
          users: result.users,
          lastUsersFetch: Date.now()
        });
        return result;
      } else {
        set({ error: result.error });
        return result;
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      const errorMsg = 'Error fetching users';
      set({ error: errorMsg });
      return { success: false, error: errorMsg };
    } finally {
      set(state => ({ loading: { ...state.loading, users: false } }));
    }
  },

  // Subscribe to last messages for all chats (single listener)
  subscribeToLastMessages: (userEmail) => {
    const state = get();
    if (!userEmail) return null;

    return firebaseSubscribeToLastMessages(userEmail, (snapshot) => {
      const lastMessagesMap = {};
      const unreadMap = {};
      
      snapshot.docs.forEach(doc => {
        const message = doc.data();
        const otherUser = message.participants.find(p => p !== userEmail);
        
        if (!lastMessagesMap[otherUser] || 
            message.timestamp?.toMillis() > lastMessagesMap[otherUser].timestamp?.toMillis()) {
          lastMessagesMap[otherUser] = message;
          
          if (message.to === userEmail) {
            unreadMap[otherUser] = true;
          }
        }
      });

      set({ lastMessages: lastMessagesMap, unreadMessages: unreadMap });
    });
  },

  // Load messages for a specific chat (cached)
  loadMessages: async (chatId, forceFetch = false) => {
    const state = get();
    
    // Return cached data if valid and not forcing fetch
    if (!forceFetch && state.messages[chatId] && state.isMessagesCacheValid(chatId)) {
      return { success: true, messages: state.messages[chatId] };
    }

    try {
      set(state => ({ loading: { ...state.loading, messages: true } }));
      set({ error: null });

      const result = await loadChatMessages(chatId);
      
      if (result.success) {
        set(state => ({
          messages: { ...state.messages, [chatId]: result.messages },
          lastMessagesFetch: { ...state.lastMessagesFetch, [chatId]: Date.now() }
        }));
        return result;
      } else {
        set({ error: result.error });
        return result;
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      const errorMsg = 'Error loading messages';
      set({ error: errorMsg });
      return { success: false, error: errorMsg };
    } finally {
      set(state => ({ loading: { ...state.loading, messages: false } }));
    }
  },

  // Subscribe to messages for real-time updates
  subscribeToMessages: (chatId) => {
    const state = get();
    if (!chatId) return null;

    return firebaseSubscribeToChatMessages(chatId, (snapshot) => {
      const messagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Merge with existing messages, avoiding duplicates and preserving order
      set(state => {
        const existingMessages = state.messages[chatId] || [];
        
        // Create a map of existing messages by ID for quick lookup
        const existingMessagesMap = new Map(existingMessages.map(msg => [msg.id, msg]));
        
        // Update existing messages and add new ones
        messagesData.forEach(firebaseMsg => {
          if (existingMessagesMap.has(firebaseMsg.id)) {
            // Update existing message with Firebase data (preserves local state)
            const existingMsg = existingMessagesMap.get(firebaseMsg.id);
            existingMessagesMap.set(firebaseMsg.id, { ...existingMsg, ...firebaseMsg });
          } else {
            // Add new message from Firebase (but don't override pending messages)
            // Check if we already have a pending message with similar content
            const hasPendingSimilar = existingMessages.some(msg => 
              msg.isPending && 
              msg.content === firebaseMsg.content && 
              msg.from === firebaseMsg.from &&
              Math.abs((msg.timestamp?.getTime?.() || 0) - (firebaseMsg.timestamp?.toMillis?.() || 0)) < 5000 // Within 5 seconds
            );
            
            if (!hasPendingSimilar) {
              existingMessagesMap.set(firebaseMsg.id, firebaseMsg);
            }
          }
        });
        
        // Convert back to array and maintain order based on timestamp
        // We'll only sort if there are new messages that aren't at the end
        const mergedMessages = Array.from(existingMessagesMap.values());
        const lastMessage = mergedMessages[mergedMessages.length - 1];
        const needsSort = mergedMessages.some(msg => {
          const msgTime = msg.timestamp?.toMillis?.() || msg.timestamp?.getTime?.() || msg.timestamp || 0;
          const lastTime = lastMessage.timestamp?.toMillis?.() || lastMessage.timestamp?.getTime?.() || lastMessage.timestamp || 0;
          return msgTime > lastTime;
        });
        
        if (needsSort) {
          mergedMessages.sort((a, b) => {
            const timeA = a.timestamp?.toMillis?.() || a.timestamp?.getTime?.() || a.timestamp || 0;
            const timeB = b.timestamp?.toMillis?.() || b.timestamp?.getTime?.() || b.timestamp || 0;
            return timeA - timeB;
          });
        }

        return {
          messages: { ...state.messages, [chatId]: mergedMessages },
          lastMessagesFetch: { ...state.lastMessagesFetch, [chatId]: Date.now() }
        };
      });
    });
  },

  // Send message
  sendMessage: async (messageData) => {
    try {
      // Create a temporary message with a unique ID for immediate display
      const now = new Date();
      const tempMessage = {
        id: `temp_${Date.now()}_${Math.random()}`,
        ...messageData,
        timestamp: now,
        serverTimestamp: now.getTime(), // Add server timestamp to ensure correct ordering
        isPending: true // Flag to identify this as a temporary message
      };

      const chatId = messageData.chatId;
      
      // Immediately add the temporary message to local state
      set(state => {
        const existingMessages = state.messages[chatId] || [];
        // Add the temporary message to the end since it's the newest
        const updatedMessages = [...existingMessages];
        
        // Remove any existing pending messages for the same content
        // to avoid duplicates during retries
        const filteredMessages = updatedMessages.filter(msg => 
          !(msg.isPending && msg.content === tempMessage.content)
        );
        
        return {
          messages: {
            ...state.messages,
            [chatId]: [...filteredMessages, tempMessage]
          }
        };
      });

      // Now send to Firebase
      const result = await sendNewMessage(messageData);
      
      if (result.success) {
        // Replace temporary message with the real one from Firebase
        set(state => {
          const existingMessages = state.messages[chatId] || [];
          
          // Remove the temporary message and add the real one
          const messagesWithoutTemp = existingMessages.filter(msg => !msg.isPending);
          const realMessage = {
            id: result.messageId,
            ...messageData,
            timestamp: new Date(), // Keep client timestamp for consistency
            isPending: false
          };
          
          const updatedMessages = [...messagesWithoutTemp, realMessage].sort((a, b) => {
            const timeA = a.timestamp?.toMillis?.() || a.timestamp?.getTime?.() || a.timestamp || 0;
            const timeB = b.timestamp?.toMillis?.() || b.timestamp?.getTime?.() || b.timestamp || 0;
            return timeA - timeB;
          });
          
          return {
            messages: {
              ...state.messages,
              [chatId]: updatedMessages
            }
          };
        });
      } else {
        // If sending failed, remove the temporary message
        set(state => {
          const existingMessages = state.messages[chatId] || [];
          const messagesWithoutTemp = existingMessages.filter(msg => !msg.isPending);
          
          return {
            messages: {
              ...state.messages,
              [chatId]: messagesWithoutTemp
            }
          };
        });
      }

      return result;
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Remove temporary message on error
      const chatId = messageData.chatId;
      set(state => {
        const existingMessages = state.messages[chatId] || [];
        const messagesWithoutTemp = existingMessages.filter(msg => !msg.isPending);
        
        return {
          messages: {
            ...state.messages,
            [chatId]: messagesWithoutTemp
          }
        };
      });
      
      const errorMsg = 'Error sending message';
      set({ error: errorMsg });
      return { success: false, error: errorMsg };
    }
  },

  // Mark messages as read
  markAsRead: (userEmail) => {
    set(state => ({
      unreadMessages: {
        ...state.unreadMessages,
        [userEmail]: false
      }
    }));
  },

  // Clear specific chat messages
  clearChatMessages: (chatId) => {
    set(state => {
      const newMessages = { ...state.messages };
      delete newMessages[chatId];
      return { messages: newMessages };
    });
  },

  // Clear all store data
  clearStore: () => {
    set({
      messages: {},
      users: [],
      lastMessages: {},
      unreadMessages: {},
      currentUser: null,
      taggedDepartments: [],
      lastUsersFetch: null,
      lastDepartmentsFetch: null,
      lastMessagesFetch: {},
      loading: { users: false, departments: false, messages: false },
      error: null
    });
  }
}));

export default useMessageStore;
