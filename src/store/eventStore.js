import { create } from 'zustand';
import { 
  getUserEventRequests, 
  deleteEventRequest,
  createEventRequest,
  getAllEventRequests 
} from '@/lib/firebase/eventRequests';
import { getUserDashboardStats } from '@/lib/firebase/dashboard-user';

const useEventStore = create((set, get) => ({
  // State
  events: [], // User's events
  allEvents: [], // All events
  loading: false,
  error: null,
  lastFetched: null, // Timestamp of last fetch
  lastDashboardFetch: null, // Timestamp of last dashboard fetch
  lastAllEventsFetch: null, // Timestamp of last all events fetch
  
  // Dashboard state
  dashboardData: {
    totalEvents: 0,
    upcomingEvents: 0,
    departmentEvents: 0,
    totalHours: 0,
    nextEventIn: null,
    thisWeekEvents: 0,
    thisWeekHours: 0,
    upcomingEventsList: []
  },
  
  // Cache configuration
  cacheTime: 5 * 60 * 1000, // 5 minutes in milliseconds
  dashboardCacheTime: 2 * 60 * 1000, // 2 minutes in milliseconds

  // Actions
  setEvents: (events) => set({ events }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  // Check if all events cache is valid
  isAllEventsCacheValid: () => {
    const state = get();
    if (!state.lastAllEventsFetch) return false;
    
    const now = Date.now();
    const cacheAge = now - state.lastAllEventsFetch;
    const isValid = cacheAge < state.cacheTime;
    
    // Cache validation
    
    return isValid;
  },

  // Fetch all events
  fetchAllEvents: async (forceFetch = false) => {
    const state = get();
    
    // Return cached data if valid and not forcing fetch
    if (!forceFetch && state.allEvents.length > 0 && state.isAllEventsCacheValid()) {
      return { success: true, events: state.allEvents };
    }

    try {
      set({ loading: true, error: null });
      
      const result = await getAllEventRequests();
      
      if (result.success) {
        // Transform events for calendar
        const transformedEvents = result.requests.map(event => {
          const startDate = new Date(event.date.seconds * 1000);
          const endDate = new Date(startDate);
          endDate.setHours(startDate.getHours() + 1);

          return {
            id: event.id,
            title: event.title,
            start: startDate,
            end: endDate,
            status: event.status,
            requestor: event.requestor,
            department: event.department,
            location: event.location,
            participants: event.participants,
            provisions: event.provisions,
            requirements: event.requirements,
            attachments: event.attachments,
            userId: event.userId,
            userEmail: event.userEmail,
          };
        }).filter(event => event !== null);

        set({ 
          allEvents: transformedEvents,
          lastAllEventsFetch: Date.now()
        });
        
        // Data stored in cache
        return { success: true, events: transformedEvents };
      } else {
        const error = 'Failed to fetch all events';
        set({ error });
        return { success: false, error };
      }
    } catch (error) {
      console.error('Error fetching all events:', error);
      const errorMsg = 'An error occurred while fetching all events';
      set({ error: errorMsg });
      return { success: false, error: errorMsg };
    } finally {
      set({ loading: false });
    }
  },

  // Check if dashboard cache is valid
  isDashboardCacheValid: () => {
    const state = get();
    if (!state.lastDashboardFetch) return false;
    
    const now = Date.now();
    const cacheAge = now - state.lastDashboardFetch;
    const isValid = cacheAge < state.dashboardCacheTime;
    
    // Cache validation
    
    return isValid;
  },

  // Fetch dashboard data
  fetchDashboardData: async (userId, forceFetch = false) => {
    const state = get();
    
    // Return cached data if valid and not forcing fetch
    if (!forceFetch && state.isDashboardCacheValid()) {
      return { success: true, stats: state.dashboardData };
    }

    try {
      set({ loading: true, error: null });
      
      const result = await getUserDashboardStats(userId);
      
      if (result.success) {
        set({ 
          dashboardData: result.stats,
          lastDashboardFetch: Date.now()
        });
        // Data stored in cache
        return result;
      } else {
        const error = 'Failed to fetch dashboard data';
        set({ error });
        return { success: false, error };
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      const errorMsg = 'An error occurred while fetching dashboard data';
      set({ error: errorMsg });
      return { success: false, error: errorMsg };
    } finally {
      set({ loading: false });
    }
  },

  // Check if events cache is valid
  isCacheValid: () => {
    const state = get();
    if (!state.lastFetched) return false;
    
    const now = Date.now();
    const cacheAge = now - state.lastFetched;
    const isValid = cacheAge < state.cacheTime;
    

    
    return isValid;
  },

  // Fetch events
  fetchUserEvents: async (userId, forceFetch = false) => {
    const state = get();
    
    // Return cached data if valid and not forcing fetch
    if (!forceFetch && state.events.length > 0 && state.isCacheValid()) {

      return;
    }

    try {
      set({ loading: true, error: null });

      
      const result = await getUserEventRequests(userId);
      
      if (result.success) {
        // Sort events by date, most recent first
        const sortedEvents = result.requests.sort((a, b) => {
          const dateA = a.date?.seconds ? new Date(a.date.seconds * 1000) : new Date(0);
          const dateB = b.date?.seconds ? new Date(b.date.seconds * 1000) : new Date(0);
          return dateB - dateA;
        });
        
        set({ 
          events: sortedEvents,
          lastFetched: Date.now() // Update last fetch timestamp
        });
        

      } else {
        set({ error: 'Failed to fetch events' });
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      set({ error: 'An error occurred while fetching events' });
    } finally {
      set({ loading: false });
    }
  },

  // Delete event
  deleteEvent: async (eventId) => {
    try {
      const result = await deleteEventRequest(eventId);
      if (result.success) {
        // Remove event from both events and allEvents state
        const events = get().events.filter(event => event.id !== eventId);
        const allEvents = get().allEvents.filter(event => event.id !== eventId);
        
        // Get current user ID from any existing event
        const userId = events[0]?.userId;
        
        // Update all relevant states and timestamps
        set({ 
          events,
          allEvents,
          lastAllEventsFetch: Date.now(),
          lastFetched: Date.now(),
          lastDashboardFetch: null // Force dashboard refresh
        });

        // Refresh dashboard data if we have the userId
        if (userId) {
          const dashboardResult = await getUserDashboardStats(userId);
          if (dashboardResult.success) {
            set({
              dashboardData: dashboardResult.stats,
              lastDashboardFetch: Date.now()
            });
          }
        }

        return { success: true };
      } else {
        set({ error: 'Failed to delete event' });
        return { success: false, error: 'Failed to delete event' };
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      set({ error: 'An error occurred while deleting the event' });
      return { success: false, error: 'An error occurred while deleting the event' };
    }
  },

  // Submit new event request
  submitEventRequest: async (eventData) => {
    try {
      set({ loading: true, error: null });

      const result = await createEventRequest(eventData);
      
      if (result.success) {
        // Add the new event to the store
        const state = get();
        const newEvent = {
          id: result.eventId,
          ...eventData,
          status: 'pending'
        };
        
        // Update cache with new event
        const updatedEvents = [newEvent, ...state.events];
        set({ 
          events: updatedEvents,
          lastFetched: Date.now(),
          lastDashboardFetch: null // Force dashboard refresh
        });

        // Refresh dashboard data
        const dashboardResult = await getUserDashboardStats(eventData.userId);
        if (dashboardResult.success) {
          set({
            dashboardData: dashboardResult.stats,
            lastDashboardFetch: Date.now()
          });
        }

        return { success: true, eventId: result.eventId };
      } else {
        set({ error: 'Failed to submit event request' });
        return { success: false, error: 'Failed to submit event request' };
      }
    } catch (error) {
      console.error('Error submitting event:', error);
      set({ error: 'An error occurred while submitting the event request' });
      return { success: false, error: 'An error occurred while submitting the event request' };
    } finally {
      set({ loading: false });
    }
  },

  // Clear store
  clearStore: () => {
    set({ events: [], loading: false, error: null, lastFetched: null });
  }
}));

export default useEventStore;
