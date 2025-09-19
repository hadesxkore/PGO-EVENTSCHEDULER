import { create } from 'zustand';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  Timestamp,
  limit
} from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';

const useNotificationStore = create((set, get) => ({
  // State
  upcomingEvents: [],
  taggedEvents: [],
  statusUpdates: [],
  loading: false,
  error: null,
  listeners: {}, // Store snapshot listeners for cleanup
  
  // Real-time listeners setup
  setupRealtimeListeners: (userId, userDepartment) => {
    const state = get();
    
    // Clean up existing listeners
    state.cleanupListeners();
    
    set({ loading: true, error: null });
    
    try {
      // 1. Upcoming Events Listener - Only get events from last 30 days to reduce reads
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const upcomingQuery = query(
        collection(db, "eventRequests"),
        where("userId", "==", userId),
        where("startDate", ">=", Timestamp.fromDate(thirtyDaysAgo)),
        where("startDate", ">=", Timestamp.now()),
        orderBy("startDate", "asc")
      );
      
      const upcomingUnsubscribe = onSnapshot(
        upcomingQuery,
        (snapshot) => {
          const upcomingEvents = snapshot.docs.map(doc => {
            const eventData = doc.data();
            let eventDate;
            
            // Handle different date formats
            if (eventData.startDate?.seconds) {
              eventDate = new Date(eventData.startDate.seconds * 1000);
            } else if (eventData.date?.seconds) {
              eventDate = new Date(eventData.date.seconds * 1000);
            } else {
              return null;
            }
            
            return {
              id: doc.id,
              title: eventData.title,
              date: eventDate,
              duration: eventData.duration,
              status: eventData.status,
              disapprovalReason: eventData.disapprovalReason,
              updatedAt: eventData.updatedAt
            };
          }).filter(event => event !== null);
          
          set({ upcomingEvents });
        },
        (error) => {
          set({ error: 'Failed to load upcoming events' });
        }
      );
      
      // 2. Status Updates Listener (approved/disapproved events) - Only recent updates
      const statusQuery = query(
        collection(db, "eventRequests"),
        where("userId", "==", userId),
        where("status", "in", ["approved", "disapproved"]),
        where("updatedAt", ">=", Timestamp.fromDate(thirtyDaysAgo)),
        orderBy("updatedAt", "desc"),
        limit(20) // Limit to 20 most recent status updates
      );
      
      const statusUnsubscribe = onSnapshot(
        statusQuery,
        (snapshot) => {
          const statusUpdates = snapshot.docs.map(doc => {
            const eventData = doc.data();
            let eventDate;
            
            // Handle different date formats
            if (eventData.startDate?.seconds) {
              eventDate = new Date(eventData.startDate.seconds * 1000);
            } else if (eventData.date?.seconds) {
              eventDate = new Date(eventData.date.seconds * 1000);
            } else {
              return null;
            }
            
            return {
              id: doc.id,
              title: eventData.title,
              date: eventDate,
              duration: eventData.duration,
              status: eventData.status,
              disapprovalReason: eventData.disapprovalReason,
              updatedAt: eventData.updatedAt
            };
          }).filter(event => event !== null);
          
          set({ statusUpdates });
        },
        (error) => {
          set({ error: 'Failed to load status updates' });
        }
      );
      
      // 3. Tagged Events Listener (events where user's department is tagged) - Only recent events
      const taggedQuery = query(
        collection(db, "eventRequests"),
        where("departmentRequirements", "!=", null),
        where("startDate", ">=", Timestamp.fromDate(thirtyDaysAgo)),
        orderBy("startDate", "desc"),
        limit(50) // Limit to 50 most recent tagged events
      );
      
      const taggedUnsubscribe = onSnapshot(
        taggedQuery,
        (snapshot) => {
          const taggedEvents = snapshot.docs
            .map(doc => {
              const eventData = doc.data();
              let eventDate;
              
              // Handle different date formats
              if (eventData.startDate?.seconds) {
                eventDate = new Date(eventData.startDate.seconds * 1000);
              } else if (eventData.date?.seconds) {
                eventDate = new Date(eventData.date.seconds * 1000);
              } else {
                return null;
              }
              
              // Check if event has department requirements and user's department is tagged
              if (eventData.departmentRequirements) {
                const isTagged = eventData.departmentRequirements.some(
                  dept => dept.departmentName === userDepartment
                );
                if (isTagged) {
                  return {
                    id: doc.id,
                    title: eventData.title,
                    date: eventDate,
                    department: eventData.department,
                    requirements: eventData.departmentRequirements.find(
                      dept => dept.departmentName === userDepartment
                    )?.requirements || []
                  };
                }
              }
              return null;
            })
            .filter(event => event !== null);
          
          set({ taggedEvents });
        },
        (error) => {
          set({ error: 'Failed to load tagged events' });
        }
      );
      
      // Store listeners for cleanup
      set({
        listeners: {
          upcoming: upcomingUnsubscribe,
          status: statusUnsubscribe,
          tagged: taggedUnsubscribe
        },
        loading: false
      });
      
    } catch (error) {
      set({ 
        error: 'Failed to setup real-time notifications',
        loading: false 
      });
    }
  },
  
  // Cleanup listeners
  cleanupListeners: () => {
    const state = get();
    Object.values(state.listeners).forEach(unsubscribe => {
      if (typeof unsubscribe === 'function') {
        try {
          unsubscribe();
        } catch (error) {
          // Silently handle cleanup errors
        }
      }
    });
    set({ listeners: {} });
  },
  
  // Get notification counts
  getNotificationCounts: () => {
    const state = get();
    return {
      upcoming: state.upcomingEvents.length,
      tagged: state.taggedEvents.length,
      status: state.statusUpdates.length,
      total: state.upcomingEvents.length + state.taggedEvents.length + state.statusUpdates.length
    };
  },
  
  // Get all notifications for display
  getAllNotifications: () => {
    const state = get();
    return {
      upcoming: state.upcomingEvents,
      tagged: state.taggedEvents,
      status: state.statusUpdates
    };
  },
  
  // Clear error
  clearError: () => set({ error: null }),
  
  // Refresh notifications manually
  refreshNotifications: async (userId, userDepartment) => {
    const state = get();
    state.cleanupListeners();
    state.setupRealtimeListeners(userId, userDepartment);
  },
  
  // Check if listeners are active
  hasActiveListeners: () => {
    const state = get();
    return Object.keys(state.listeners).length > 0;
  },
  
  // Reset store
  reset: () => {
    const state = get();
    state.cleanupListeners();
    set({
      upcomingEvents: [],
      taggedEvents: [],
      statusUpdates: [],
      loading: false,
      error: null,
      listeners: {}
    });
  }
}));

export default useNotificationStore;
