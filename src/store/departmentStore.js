import { create } from 'zustand';
import { 
  getAllDepartments, 
  getVisibleDepartments,
  toggleDepartmentVisibility,
  addDepartment,
  updateDepartment,
  deleteDepartment
} from '@/lib/firebase/departments';

const useDepartmentStore = create((set, get) => ({
  // State
  departments: [], // All departments
  visibleDepartments: [], // Only visible departments (for user-facing pages)
  loading: false,
  error: null,
  lastFetched: null, // Timestamp of last fetch
  lastVisibleFetch: null, // Timestamp of last visible departments fetch
  
  // Cache configuration
  cacheTime: 5 * 60 * 1000, // 5 minutes in milliseconds
  
  // Actions
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  // Check if all departments cache is valid
  isCacheValid: () => {
    const state = get();
    if (!state.lastFetched) return false;
    
    const now = Date.now();
    const cacheAge = now - state.lastFetched;
    const isValid = cacheAge < state.cacheTime;
    
    
    return isValid;
  },

  // Check if visible departments cache is valid
  isVisibleCacheValid: () => {
    const state = get();
    if (!state.lastVisibleFetch) return false;
    
    const now = Date.now();
    const cacheAge = now - state.lastVisibleFetch;
    const isValid = cacheAge < state.cacheTime;
    
    
    return isValid;
  },

  // Fetch all departments (for admin use)
  fetchAllDepartments: async (forceFetch = false) => {
    const state = get();
    
    // Return cached data if valid and not forcing fetch
    if (!forceFetch && state.departments.length > 0 && state.isCacheValid()) {
      return { success: true, departments: state.departments };
    }

    try {
      set({ loading: true, error: null });
      
      const result = await getAllDepartments();
      
      if (result.success) {
        set({ 
          departments: result.departments,
          lastFetched: Date.now()
        });
        
        return { success: true, departments: result.departments };
      } else {
        const error = 'Failed to fetch departments';
        set({ error });
        return { success: false, error };
      }
    } catch (error) {
      const errorMsg = 'An error occurred while fetching departments';
      set({ error: errorMsg });
      return { success: false, error: errorMsg };
    } finally {
      set({ loading: false });
    }
  },

  // Fetch visible departments (for user-facing pages)
  fetchVisibleDepartments: async (forceFetch = false) => {
    const state = get();
    
    // Return cached data if valid and not forcing fetch
    if (!forceFetch && state.visibleDepartments.length > 0 && state.isVisibleCacheValid()) {
      return { success: true, departments: state.visibleDepartments };
    }

    try {
      set({ loading: true, error: null });
      
      const result = await getVisibleDepartments();
      
      if (result.success) {
        set({ 
          visibleDepartments: result.departments,
          lastVisibleFetch: Date.now()
        });
        
        return { success: true, departments: result.departments };
      } else {
        const error = 'Failed to fetch visible departments';
        set({ error });
        return { success: false, error };
      }
    } catch (error) {
      const errorMsg = 'An error occurred while fetching visible departments';
      set({ error: errorMsg });
      return { success: false, error: errorMsg };
    } finally {
      set({ loading: false });
    }
  },

  // Toggle department visibility
  toggleVisibility: async (departmentId, isHidden) => {
    try {
      set({ loading: true, error: null });
      
      const result = await toggleDepartmentVisibility(departmentId, isHidden);
      
      if (result.success) {
        // Update both caches
        const state = get();
        
        // Update all departments cache
        const updatedDepartments = state.departments.map(dept => 
          dept.id === departmentId ? { ...dept, isHidden } : dept
        );
        
        // Update visible departments cache (remove/add based on visibility)
        let updatedVisibleDepartments;
        if (isHidden) {
          // Remove from visible departments
          updatedVisibleDepartments = state.visibleDepartments.filter(dept => dept.id !== departmentId);
        } else {
          // Add to visible departments if not already there
          const departmentToAdd = updatedDepartments.find(dept => dept.id === departmentId);
          if (departmentToAdd && !state.visibleDepartments.find(dept => dept.id === departmentId)) {
            updatedVisibleDepartments = [...state.visibleDepartments, departmentToAdd];
          } else {
            updatedVisibleDepartments = state.visibleDepartments;
          }
        }
        
        set({ 
          departments: updatedDepartments,
          visibleDepartments: updatedVisibleDepartments,
          lastFetched: Date.now(),
          lastVisibleFetch: Date.now()
        });
        
        return { success: true };
      } else {
        const error = 'Failed to toggle department visibility';
        set({ error });
        return { success: false, error };
      }
    } catch (error) {
      const errorMsg = 'An error occurred while toggling department visibility';
      set({ error: errorMsg });
      return { success: false, error: errorMsg };
    } finally {
      set({ loading: false });
    }
  },

  // Add department
  addDepartment: async (departmentData) => {
    try {
      set({ loading: true, error: null });
      
      const result = await addDepartment(departmentData);
      
      if (result.success) {
        // Invalidate cache to force refresh
        set({ 
          lastFetched: null,
          lastVisibleFetch: null
        });
        
        return { success: true, id: result.id };
      } else {
        const error = 'Failed to add department';
        set({ error });
        return { success: false, error };
      }
    } catch (error) {
      const errorMsg = 'An error occurred while adding department';
      set({ error: errorMsg });
      return { success: false, error: errorMsg };
    } finally {
      set({ loading: false });
    }
  },

  // Update department
  updateDepartment: async (departmentId, departmentData) => {
    try {
      set({ loading: true, error: null });
      
      const result = await updateDepartment(departmentId, departmentData);
      
      if (result.success) {
        // Update both caches
        const state = get();
        
        const updatedDepartments = state.departments.map(dept => 
          dept.id === departmentId ? { ...dept, ...departmentData } : dept
        );
        
        const updatedVisibleDepartments = state.visibleDepartments.map(dept => 
          dept.id === departmentId ? { ...dept, ...departmentData } : dept
        );
        
        set({ 
          departments: updatedDepartments,
          visibleDepartments: updatedVisibleDepartments,
          lastFetched: Date.now(),
          lastVisibleFetch: Date.now()
        });
        
        return { success: true };
      } else {
        const error = 'Failed to update department';
        set({ error });
        return { success: false, error };
      }
    } catch (error) {
      const errorMsg = 'An error occurred while updating department';
      set({ error: errorMsg });
      return { success: false, error: errorMsg };
    } finally {
      set({ loading: false });
    }
  },

  // Delete department
  deleteDepartment: async (departmentId) => {
    try {
      set({ loading: true, error: null });
      
      const result = await deleteDepartment(departmentId);
      
      if (result.success) {
        // Remove from both caches
        const state = get();
        
        const updatedDepartments = state.departments.filter(dept => dept.id !== departmentId);
        const updatedVisibleDepartments = state.visibleDepartments.filter(dept => dept.id !== departmentId);
        
        set({ 
          departments: updatedDepartments,
          visibleDepartments: updatedVisibleDepartments,
          lastFetched: Date.now(),
          lastVisibleFetch: Date.now()
        });
        
        return { success: true };
      } else {
        const error = 'Failed to delete department';
        set({ error });
        return { success: false, error };
      }
    } catch (error) {
      const errorMsg = 'An error occurred while deleting department';
      set({ error: errorMsg });
      return { success: false, error: errorMsg };
    } finally {
      set({ loading: false });
    }
  },

  // Clear store
  clearStore: () => {
    set({ 
      departments: [],
      visibleDepartments: [],
      loading: false, 
      error: null, 
      lastFetched: null,
      lastVisibleFetch: null
    });
  }
}));

export default useDepartmentStore;
