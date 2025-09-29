import { create } from 'zustand';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc, 
  serverTimestamp,
  orderBy 
} from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';

const useAccomplishmentStore = create((set, get) => ({
  // State
  accomplishments: {}, // Keyed by eventId: { [eventId]: { accomplishments: [], lastFetched: timestamp } }
  completedCounts: {}, // Keyed by eventId: { [eventId]: count }
  loading: false,
  error: null,
  
  // Cache configuration
  cacheTime: 3 * 60 * 1000, // 3 minutes in milliseconds

  // Check if cache is valid for a specific event
  isCacheValid: (eventId) => {
    const state = get();
    const eventData = state.accomplishments[eventId];
    
    if (!eventData || !eventData.lastFetched) return false;
    
    const now = Date.now();
    const cacheAge = now - eventData.lastFetched;
    const isValid = cacheAge < state.cacheTime;
    
    return isValid;
  },

  // Fetch accomplishments for a specific event
  fetchAccomplishments: async (eventId, forceFetch = false) => {
    const state = get();
    
    // Return cached data if valid and not forcing fetch
    if (!forceFetch && state.isCacheValid(eventId)) {
      return { 
        success: true, 
        accomplishments: state.accomplishments[eventId].accomplishments 
      };
    }

    try {
      set({ loading: true, error: null });
      
      const accomplishmentsRef = collection(db, "accomplishments");
      const q = query(
        accomplishmentsRef,
        where("eventId", "==", eventId),
        orderBy("submittedAt", "desc")
      );
      
      const snapshot = await getDocs(q);
      
      const accomplishments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Update cache
      set(state => ({
        accomplishments: {
          ...state.accomplishments,
          [eventId]: {
            accomplishments,
            lastFetched: Date.now()
          }
        }
      }));

      return { success: true, accomplishments };
      
    } catch (error) {
      set({ error: error.message });
      return { success: false, error: error.message, accomplishments: [] };
    } finally {
      set({ loading: false });
    }
  },

  // Get completed accomplishments count for an event
  getCompletedCount: async (eventId, forceFetch = false) => {
    const state = get();
    
    // Check if we have cached count and it's still valid
    if (!forceFetch && state.completedCounts[eventId] !== undefined && state.isCacheValid(eventId)) {
      return state.completedCounts[eventId];
    }

    // Fetch accomplishments (will use cache if valid)
    const result = await get().fetchAccomplishments(eventId, forceFetch);
    
    if (result.success) {
      // Count completed requirements across all departments
      let completedCount = 0;
      result.accomplishments.forEach(acc => {
        if (acc.requirements && Array.isArray(acc.requirements)) {
          const completed = acc.requirements.filter(req => req.completed === true).length;
          completedCount += completed;
        }
      });

      // Update completed counts cache
      set(state => ({
        completedCounts: {
          ...state.completedCounts,
          [eventId]: completedCount
        }
      }));

      return completedCount;
    }
    
    return 0;
  },

  // Get completed counts for multiple events
  getMultipleCompletedCounts: async (eventIds, forceFetch = false) => {
    const counts = {};
    
    for (const eventId of eventIds) {
      counts[eventId] = await get().getCompletedCount(eventId, forceFetch);
    }
    
    return counts;
  },

  // Submit accomplishment data
  submitAccomplishment: async (eventId, departmentName, accomplishmentData) => {
    try {
      set({ loading: true, error: null });

      const accomplishmentDocRef = doc(db, "accomplishments", `${eventId}_${departmentName}`);
      
      const dataToSubmit = {
        ...accomplishmentData,
        eventId,
        departmentName,
        submittedAt: serverTimestamp(),
        lastUpdated: serverTimestamp()
      };

      await setDoc(accomplishmentDocRef, dataToSubmit, { merge: true });

      // Invalidate cache for this event to force refresh
      set(state => {
        const newAccomplishments = { ...state.accomplishments };
        if (newAccomplishments[eventId]) {
          delete newAccomplishments[eventId];
        }
        
        const newCompletedCounts = { ...state.completedCounts };
        delete newCompletedCounts[eventId];
        
        return {
          accomplishments: newAccomplishments,
          completedCounts: newCompletedCounts
        };
      });

      return { success: true };
      
    } catch (error) {
      set({ error: error.message });
      return { success: false, error: error.message };
    } finally {
      set({ loading: false });
    }
  },

  // Load accomplishment data for editing
  loadAccomplishmentData: async (eventId, departmentName = null) => {
    const result = await get().fetchAccomplishments(eventId);
    
    if (result.success) {
      if (departmentName) {
        // Load specific department's accomplishment (for tagged events)
        const departmentAccomplishment = result.accomplishments.find(
          acc => acc.departmentName === departmentName
        );
        
        return {
          success: true,
          data: departmentAccomplishment || null,
          allAccomplishments: result.accomplishments
        };
      } else {
        // Load all accomplishments (for created events)
        return {
          success: true,
          data: null,
          allAccomplishments: result.accomplishments
        };
      }
    }
    
    return { success: false, data: null, allAccomplishments: [] };
  },

  // Clear cache for specific event (useful after updates)
  clearEventCache: (eventId) => {
    set(state => {
      const newAccomplishments = { ...state.accomplishments };
      const newCompletedCounts = { ...state.completedCounts };
      
      delete newAccomplishments[eventId];
      delete newCompletedCounts[eventId];
      
      return {
        accomplishments: newAccomplishments,
        completedCounts: newCompletedCounts
      };
    });
  },

  // Clear all cache
  clearAllCache: () => {
    set({
      accomplishments: {},
      completedCounts: {},
      error: null
    });
  },

  // Get cache stats for debugging
  getCacheStats: () => {
    const state = get();
    const eventIds = Object.keys(state.accomplishments);
    const validCaches = eventIds.filter(eventId => state.isCacheValid(eventId));
    
    return {
      totalCachedEvents: eventIds.length,
      validCaches: validCaches.length,
      expiredCaches: eventIds.length - validCaches.length,
      cacheHitRate: eventIds.length > 0 ? (validCaches.length / eventIds.length * 100).toFixed(1) + '%' : '0%'
    };
  }
}));

export default useAccomplishmentStore;
