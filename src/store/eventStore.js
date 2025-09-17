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
  
  // Preferred Dates State
  preferredDates: {
    location: '',
    startDate: null,
    endDate: null,
    startTime: "10:30",
    endTime: "11:30",
    showModal: false,
    bookedDates: [] // Array to store dates that are already booked
  },

  // Get booked dates for a specific location
  getBookedDates: async (location) => {
    try {
      const result = await getAllEventRequests();
      if (result.success) {
        // Normalize the location for comparison
        const normalizedSearchLocation = location.trim().toLowerCase();
        
        // Filter events for the specific location and get their date ranges
        const bookedDates = result.requests
          .filter(event => {
            const eventLocation = (event.location || '').trim().toLowerCase();
            return eventLocation === normalizedSearchLocation && 
                   event.status !== 'disapproved' &&
                   event.startDate && 
                   event.endDate;
          })
          .map(event => {
            
            return {
              start: event.startDate,  // Keep as Firestore Timestamp
              end: event.endDate,      // Keep as Firestore Timestamp
              department: event.department
            };
          });
        
        
        // Only update state if we found booked dates
        if (bookedDates.length > 0) {
          set(state => ({
            preferredDates: {
              ...state.preferredDates,
              bookedDates
            }
          }));
        }
        
        return bookedDates;
      }
      return [];
    } catch (error) {
      console.error('Error fetching booked dates:', error);
      return [];
    }
  },
  
  // Dashboard state
  dashboardData: {
    totalEvents: 0,
    upcomingEvents: 0,
    departmentEvents: 0,
    totalHours: 0,
    nextEventIn: null,
    thisWeekEvents: 0,
    thisWeekHours: 0,
    upcomingEventsList: [],
    allUserEvents: [],
    taggedEventsList: []
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
          // Handle date conversion with validation
          let startDate, endDate;
          
          try {
            // Handle startDate
            if (event.startDate?.seconds) {
              startDate = new Date(event.startDate.seconds * 1000);
            } else if (event.date?.seconds) { // Fallback to old format
              startDate = new Date(event.date.seconds * 1000);
            } else if (event.startDate instanceof Date) {
              startDate = new Date(event.startDate);
            } else if (typeof event.startDate === 'string') {
              startDate = new Date(event.startDate);
            } else {
              console.warn('Invalid start date format for event:', event);
              return null;
            }

            // Handle endDate
            if (event.endDate?.seconds) {
              endDate = new Date(event.endDate.seconds * 1000);
            } else if (event.endDate instanceof Date) {
              endDate = new Date(event.endDate);
            } else if (typeof event.endDate === 'string') {
              endDate = new Date(event.endDate);
            } else {
              // If no end date, default to 1 hour after start
              endDate = new Date(startDate.getTime() + (60 * 60 * 1000));
            }

            // Validate dates
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
              console.warn('Invalid date conversion for event:', event);
              return null;
            }
          } catch (error) {
            console.error('Error processing event dates:', error, event);
            return null;
          }

          // For calendar display, set end time same as start time
          // This makes events appear at their start time without duration
          return {
            id: event.id,
            title: event.title,
            start: startDate,
            end: startDate, // Use startDate instead of endDate for calendar display
            // Store actual end date for modal display
            actualEndDate: endDate,
            status: event.status,
            requestor: event.requestor,
            department: event.department,
            location: event.location,
            locations: event.locations, // Include multiple locations data
            isMultipleLocations: event.isMultipleLocations,
            participants: event.participants,
            provisions: event.provisions,
            requirements: event.requirements,
            departmentRequirements: event.departmentRequirements,
            attachments: event.attachments,
            classifications: event.classifications,
            userId: event.userId,
            userEmail: event.userEmail,
            vip: event.vip,
            vvip: event.vvip,
            recentActivity: event.recentActivity || [], // Include recent activity data
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
          const dateA = a.startDate?.seconds ? new Date(a.startDate.seconds * 1000) : (a.date?.seconds ? new Date(a.date.seconds * 1000) : new Date(0));
          const dateB = b.startDate?.seconds ? new Date(b.startDate.seconds * 1000) : (b.date?.seconds ? new Date(b.date.seconds * 1000) : new Date(0));
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

  // Update event with recent activity
  updateEvent: async (eventId, updatedData) => {
    try {
      set({ loading: true, error: null });
      
      // Update both events and allEvents arrays
      const state = get();
      const updatedEvents = state.events.map(event => 
        event.id === eventId ? { ...event, ...updatedData } : event
      );
      const updatedAllEvents = state.allEvents.map(event => 
        event.id === eventId ? { ...event, ...updatedData } : event
      );
      
      set({ 
        events: updatedEvents,
        allEvents: updatedAllEvents,
        lastFetched: Date.now(),
        lastAllEventsFetch: Date.now()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error updating event in store:', error);
      set({ error: 'Failed to update event' });
      return { success: false, error: 'Failed to update event' };
    } finally {
      set({ loading: false });
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

  // Preferred Dates Actions
  setPreferredDates: (dates) => {
    set((state) => ({
      preferredDates: {
        ...state.preferredDates,
        ...dates
      }
    }));
  },

  togglePreferredDatesModal: (show) => {
    set((state) => ({
      preferredDates: {
        ...state.preferredDates,
        showModal: show
      }
    }));
  },

  // Clear store
  clearStore: () => {
    set({ 
      events: [], 
      loading: false, 
      error: null, 
      lastFetched: null,
      preferredDates: {
        location: '',
        startDate: null,
        endDate: null,
        showModal: false
      }
    });
  }
}));

export default useEventStore;
