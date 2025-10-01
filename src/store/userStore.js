import { create } from 'zustand';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase/firebase';

const useUserStore = create((set, get) => ({
  // State
  currentUser: null, // Firebase auth user
  userData: null, // Firestore user document data
  loading: false,
  error: null,
  lastFetched: null, // Timestamp of last fetch
  
  // Cache configuration
  cacheTime: 10 * 60 * 1000, // 10 minutes in milliseconds (user data changes less frequently)
  
  // Actions
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setCurrentUser: (user) => set({ currentUser: user }),

  // Check if user data cache is valid
  isCacheValid: () => {
    const state = get();
    if (!state.lastFetched || !state.userData) return false;
    
    const now = Date.now();
    const cacheAge = now - state.lastFetched;
    const isValid = cacheAge < state.cacheTime;
    
    
    return isValid;
  },

  // Fetch current user data (auth + Firestore)
  fetchCurrentUser: async (forceFetch = false) => {
    const state = get();
    
    // Return cached data if valid and not forcing fetch
    if (!forceFetch && state.userData && state.isCacheValid()) {
      return { 
        success: true, 
        user: state.currentUser, 
        userData: state.userData 
      };
    }

    try {
      set({ loading: true, error: null });
      
      // Get current Firebase auth user
      const currentUser = auth.currentUser;
      if (!currentUser) {
        const error = 'User not authenticated';
        set({ error, currentUser: null, userData: null });
        return { success: false, error };
      }

      // Get user document from Firestore
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (!userDocSnap.exists()) {
        const error = 'User data not found in Firestore';
        set({ error, currentUser, userData: null });
        return { success: false, error };
      }

      const userData = userDocSnap.data();
      
      set({ 
        currentUser,
        userData,
        lastFetched: Date.now(),
        error: null
      });
      
      return { 
        success: true, 
        user: currentUser, 
        userData 
      };
    } catch (error) {
      const errorMsg = 'An error occurred while fetching user data';
      console.error('Error fetching user data:', error);
      set({ error: errorMsg });
      return { success: false, error: errorMsg };
    } finally {
      set({ loading: false });
    }
  },

  // Get user department (cached)
  getUserDepartment: async () => {
    const state = get();
    
    // Try to get from cache first
    if (state.userData?.department && state.isCacheValid()) {
      return { success: true, department: state.userData.department };
    }

    // Fetch fresh data if not cached
    const result = await state.fetchCurrentUser();
    if (result.success && result.userData?.department) {
      return { success: true, department: result.userData.department };
    }

    return { success: false, error: 'Could not get user department' };
  },

  // Update user data in cache (when user profile is updated)
  updateUserData: (newUserData) => {
    const state = get();
    set({ 
      userData: { ...state.userData, ...newUserData },
      lastFetched: Date.now() // Reset cache timestamp
    });
  },

  // Clear user data (on logout)
  clearUserData: () => {
    set({ 
      currentUser: null,
      userData: null,
      loading: false, 
      error: null, 
      lastFetched: null
    });
  },

  // Initialize user data (call on app startup)
  initializeUser: async () => {
    return new Promise((resolve) => {
      const unsubscribe = auth.onAuthStateChanged(async (user) => {
        if (user) {
          const result = await get().fetchCurrentUser();
          resolve(result);
        } else {
          get().clearUserData();
          resolve({ success: false, error: 'User not authenticated' });
        }
        unsubscribe(); // Only listen once for initialization
      });
    });
  }
}));

export default useUserStore;
