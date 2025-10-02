import { create } from 'zustand';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  getDocs, 
  where,
  Timestamp,
  writeBatch,
  doc,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase/firebase';

const useUserLogsStore = create((set, get) => ({
  // State
  logs: [],
  loading: false,
  error: null,
  lastFetched: null,
  pendingLogs: [], // Logs waiting to be written to Firestore
  recentLogHashes: new Set(), // Track recent log hashes to prevent duplicates
  isFlushingLogs: false, // Prevent concurrent flush operations
  
  // Cache configuration - AGGRESSIVE CACHING TO REDUCE FIRESTORE READS
  cacheTime: 30 * 60 * 1000, // 30 minutes cache for logs (INCREASED to reduce reads)
  batchSize: 1, // Write logs immediately (batch size of 1 for instant flushing)
  maxPendingLogs: 50, // Max logs to keep in memory before forcing write
  maxLogsToFetch: 100, // Fetch more logs to reduce subsequent reads
  logRetentionDays: 30, // Keep logs for 30 days only
  smartCacheEnabled: true, // Enable smart caching features
  
  // Local storage keys
  PENDING_LOGS_KEY: 'userLogs_pending',
  LOGS_CACHE_KEY: 'userLogs_cache',
  
  // Actions
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  
  // Remove duplicates from current logs
  removeDuplicates: () => {
    const state = get();
    const uniqueLogs = [];
    const seen = new Set();
    
    state.logs.forEach(log => {
      const key = `${log.userEmail}_${log.action}_${Math.floor(new Date(log.timestamp).getTime() / 60000)}`; // 1-minute window
      if (!seen.has(key)) {
        seen.add(key);
        uniqueLogs.push(log);
      }
    });
    
    console.log(`Removed ${state.logs.length - uniqueLogs.length} duplicate logs`);
    set({ logs: uniqueLogs });
  },
  
  // Check if cache is valid
  isCacheValid: () => {
    const state = get();
    if (!state.lastFetched) return false;
    
    const now = Date.now();
    const cacheAge = now - state.lastFetched;
    return cacheAge < state.cacheTime;
  },
  
  // Load pending logs from localStorage on app start
  loadPendingLogs: () => {
    try {
      const stored = localStorage.getItem(get().PENDING_LOGS_KEY);
      if (stored) {
        const pendingLogs = JSON.parse(stored);
        set({ pendingLogs });
        console.log(`Loaded ${pendingLogs.length} pending logs from localStorage`);
      }
    } catch (error) {
      console.error('Error loading pending logs:', error);
    }
  },
  
  // Save pending logs to localStorage
  savePendingLogs: () => {
    try {
      const { pendingLogs } = get();
      localStorage.setItem(get().PENDING_LOGS_KEY, JSON.stringify(pendingLogs));
    } catch (error) {
      console.error('Error saving pending logs:', error);
    }
  },
  
  // Load cached logs from localStorage
  loadCachedLogs: () => {
    try {
      const stored = localStorage.getItem(get().LOGS_CACHE_KEY);
      if (stored) {
        const { logs, timestamp } = JSON.parse(stored);
        const now = Date.now();
        const cacheAge = now - timestamp;
        
        if (cacheAge < get().cacheTime) {
          set({ logs, lastFetched: timestamp });
          console.log(`Loaded ${logs.length} logs from cache`);
          console.log('Cached logs:', logs.map(log => ({ id: log.id, user: log.userName, action: log.action })));
          return true;
        } else {
          console.log('Cache expired, will fetch fresh data');
        }
      } else {
        console.log('No cached logs found');
      }
    } catch (error) {
      console.error('Error loading cached logs:', error);
    }
    return false;
  },
  
  // Save logs to localStorage cache
  saveCachedLogs: () => {
    try {
      const { logs } = get();
      const cacheData = {
        logs,
        timestamp: Date.now()
      };
      localStorage.setItem(get().LOGS_CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error saving cached logs:', error);
    }
  },
  
  // Add a log entry (stores locally first, writes to Firestore in batches)
  addLog: async (logData) => {
    const state = get();
    
    // For department accounts, check if there's a recent login from the same department
    if (logData.action === 'Login' && logData.department && logData.department !== 'Unknown Department') {
      const recentDepartmentLogin = state.logs.find(log => 
        log.department === logData.department && 
        log.action === 'Login' && 
        (Date.now() - new Date(log.timestamp).getTime()) < 24 * 60 * 60 * 1000 // Within 24 hours
      );
      
      if (recentDepartmentLogin) {
        console.log(`Updating existing login record for department: ${logData.department}`);
        
        const updatedLogData = {
          userName: logData.userName || recentDepartmentLogin.userName,
          userEmail: logData.userEmail || recentDepartmentLogin.userEmail,
          timestamp: new Date().toISOString(),
          createdAt: Date.now()
        };
        
        // Update the existing log entry in local state
        const updatedLogs = state.logs.map(log => 
          log.id === recentDepartmentLogin.id 
            ? { ...log, ...updatedLogData }
            : log
        );
        
        // Also update in pending logs if it exists there
        const updatedPendingLogs = state.pendingLogs.map(log => 
          log.department === logData.department && log.action === 'Login'
            ? { ...log, ...updatedLogData }
            : log
        );
        
        set({ 
          logs: updatedLogs,
          pendingLogs: updatedPendingLogs
        });
        
        // Update in Firestore if the log has a real Firestore ID (not temp ID)
        if (recentDepartmentLogin.id && !recentDepartmentLogin.id.startsWith('temp_')) {
          try {
            const logDocRef = doc(db, 'userLogs', recentDepartmentLogin.id);
            await updateDoc(logDocRef, {
              userName: updatedLogData.userName,
              userEmail: updatedLogData.userEmail,
              timestamp: Timestamp.fromDate(new Date(updatedLogData.timestamp))
            });
            console.log(`Updated Firestore record for department: ${logData.department}`);
          } catch (error) {
            console.error('Error updating Firestore log:', error);
            // If Firestore update fails, we still have the local update
          }
        }
        
        // Save to localStorage
        get().savePendingLogs();
        get().saveCachedLogs();
        
        console.log(`Updated existing login record for department: ${logData.department}`);
        return;
      }
    }
    
    // Create a unique hash for this log entry (shorter window to be less aggressive)
    const logHash = `${logData.userId || 'unknown'}_${logData.action || 'Unknown Action'}_${logData.userEmail || 'unknown@example.com'}_${Math.floor(Date.now() / 5000)}`; // 5-second window
    
    // Check if this exact log was already processed recently
    if (state.recentLogHashes.has(logHash)) {
      console.log('Duplicate log prevented (hash):', logData.action, 'for', logData.userName);
      return;
    }
    
    // Add hash to recent logs and clean old hashes (older than 30 seconds)
    const newHashes = new Set(state.recentLogHashes);
    newHashes.add(logHash);
    
    // Clean old hashes (keep only last 30 seconds worth)
    const currentWindow = Math.floor(Date.now() / 10000);
    Array.from(newHashes).forEach(hash => {
      const hashWindow = parseInt(hash.split('_').pop());
      if (currentWindow - hashWindow > 3) { // Remove hashes older than 30 seconds
        newHashes.delete(hash);
      }
    });
    
    set({ recentLogHashes: newHashes });
    
    const logEntry = {
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: logData.userId || 'unknown',
      userName: logData.userName || 'Unknown User',
      userEmail: logData.userEmail || 'unknown@example.com',
      department: logData.department || 'Unknown Department',
      action: logData.action || 'Unknown Action',
      status: logData.status || 'success',
      timestamp: new Date().toISOString(),
      createdAt: Date.now() // For local sorting
    };
    
    // Add to pending logs
    const newPendingLogs = [...state.pendingLogs, logEntry];
    
    // Add to current logs for immediate UI update (don't slice to preserve all logs)
    const newLogs = [logEntry, ...state.logs];
    
    set({ 
      pendingLogs: newPendingLogs,
      logs: newLogs
    });
    
    // Save to localStorage
    get().savePendingLogs();
    get().saveCachedLogs();
    
    console.log(`Added log: ${logData.action} for ${logData.userName}`);
    console.log(`Total logs in store: ${newLogs.length}, Pending logs: ${newPendingLogs.length}`);
    
    // Check if we need to flush to Firestore (with batch size 1, this will always flush immediately)
    if (newPendingLogs.length >= state.batchSize) {
      await get().flushPendingLogs();
    }
  },
  
  // Write pending logs to Firestore in batches
  flushPendingLogs: async () => {
    const state = get();
    
    if (state.pendingLogs.length === 0 || state.isFlushingLogs) return;
    
    // Set flushing flag to prevent concurrent operations
    set({ isFlushingLogs: true });
    
    try {
      console.log(`Flushing ${state.pendingLogs.length} pending logs to Firestore...`);
      
      const batch = writeBatch(db);
      const logsCollection = collection(db, 'userLogs');
      
      // Process logs in chunks to avoid batch size limits (500 operations max)
      const chunkSize = 450; // Leave some room for safety
      const chunks = [];
      
      for (let i = 0; i < state.pendingLogs.length; i += chunkSize) {
        chunks.push(state.pendingLogs.slice(i, i + chunkSize));
      }
      
      for (const chunk of chunks) {
        const currentBatch = writeBatch(db);
        
        chunk.forEach(log => {
          const docRef = doc(logsCollection);
          const firestoreLog = {
            userId: log.userId || 'unknown',
            userName: log.userName || 'Unknown User',
            userEmail: log.userEmail || 'unknown@example.com',
            department: log.department || 'Unknown Department',
            action: log.action || 'Unknown Action',
            status: log.status || 'success',
            timestamp: Timestamp.fromDate(new Date(log.timestamp))
          };
          currentBatch.set(docRef, firestoreLog);
        });
        
        await currentBatch.commit();
      }
      
      // Clear pending logs after successful write
      set({ pendingLogs: [] });
      localStorage.removeItem(state.PENDING_LOGS_KEY);
      
      console.log(`Successfully flushed ${state.pendingLogs.length} logs to Firestore`);
      
    } catch (error) {
      console.error('Error flushing logs to Firestore:', error);
      // Keep pending logs for retry
      set({ error: 'Failed to save logs to server' });
    } finally {
      // Always reset flushing flag
      set({ isFlushingLogs: false });
    }
  },
  
  // Fetch logs from Firestore (with AGGRESSIVE caching to reduce reads)
  fetchLogs: async (forceFetch = false) => {
    const state = get();
    
    // PRIORITY 1: Return cached data if valid (REDUCE FIRESTORE READS)
    if (!forceFetch && state.isCacheValid() && state.logs.length > 0) {
      console.log('🚀 USING ZUSTAND CACHE - No Firestore read needed!', `${state.logs.length} logs from cache`);
      return { success: true, logs: state.logs };
    }
    
    // PRIORITY 2: Try to load from localStorage cache first (REDUCE FIRESTORE READS)
    if (!forceFetch && get().loadCachedLogs()) {
      console.log('🚀 USING LOCALSTORAGE CACHE - No Firestore read needed!', `${get().logs.length} logs from localStorage`);
      return { success: true, logs: get().logs };
    }
    
    // PRIORITY 3: Only fetch from Firestore if absolutely necessary
    console.log('⚠️ FETCHING FROM FIRESTORE - Cache expired or force fetch requested');
    
    try {
      set({ loading: true, error: null });
      
      const logsCollection = collection(db, 'userLogs');
      const q = query(
        logsCollection,
        orderBy('timestamp', 'desc'),
        limit(state.maxLogsToFetch) // Limit to latest 50 logs to control reads
      );
      
      const querySnapshot = await getDocs(q);
      const logs = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        logs.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate?.()?.toISOString() || data.timestamp
        });
      });
      
      // Remove duplicates based on multiple criteria (ID, email, action, timestamp)
      const existingLogs = get().logs;
      const mergedLogs = [...logs];
      
      // Add existing logs that don't duplicate the fetched ones
      existingLogs.forEach(existingLog => {
        const isDuplicate = logs.some(fetchedLog => 
          // Check for exact match by ID
          fetchedLog.id === existingLog.id ||
          // Check for content match (same user, action, and similar timestamp)
          (fetchedLog.userEmail === existingLog.userEmail &&
           fetchedLog.action === existingLog.action &&
           Math.abs(new Date(fetchedLog.timestamp) - new Date(existingLog.timestamp)) < 60000) // Within 1 minute
        );
        
        if (!isDuplicate) {
          mergedLogs.push(existingLog);
        }
      });
      
      // Sort by timestamp (newest first)
      mergedLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      set({ 
        logs: mergedLogs,
        lastFetched: Date.now(),
        error: null
      });
      
      // Save to cache
      get().saveCachedLogs();
      
      console.log(`Fetched ${logs.length} new logs from Firestore`);
      console.log(`Total logs after merge: ${mergedLogs.length}`);
      console.log('All logs:', mergedLogs.map(log => ({ id: log.id, user: log.userName, action: log.action, timestamp: log.timestamp })));
      return { success: true, logs: mergedLogs };
      
    } catch (error) {
      const errorMsg = 'Failed to fetch logs';
      console.error('Error fetching logs:', error);
      set({ error: errorMsg });
      return { success: false, error: errorMsg };
    } finally {
      set({ loading: false });
    }
  },
  
  // Get logs with filters (works on cached data)
  getFilteredLogs: (filters = {}) => {
    const { logs } = get();
    let filteredLogs = [...logs];
    
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filteredLogs = filteredLogs.filter(log =>
        log.userName?.toLowerCase().includes(searchTerm) ||
        log.userEmail?.toLowerCase().includes(searchTerm) ||
        log.action?.toLowerCase().includes(searchTerm)
      );
    }
    
    if (filters.action && filters.action !== 'all') {
      filteredLogs = filteredLogs.filter(log =>
        log.action?.toLowerCase().includes(filters.action.toLowerCase())
      );
    }
    
    if (filters.status && filters.status !== 'all') {
      filteredLogs = filteredLogs.filter(log => log.status === filters.status);
    }
    
    if (filters.dateRange && filters.dateRange !== 'all') {
      const now = new Date();
      let startDate;
      
      switch (filters.dateRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          startDate = null;
      }
      
      if (startDate) {
        filteredLogs = filteredLogs.filter(log => {
          const logDate = new Date(log.timestamp);
          return logDate >= startDate;
        });
      }
    }
    
    return filteredLogs;
  },
  
  // Initialize store (call on app startup)
  initialize: async () => {
    console.log('Initializing UserLogsStore...');
    
    // Load pending logs from localStorage
    get().loadPendingLogs();
    
    // CRITICAL: Always flush pending logs first before doing anything else
    console.log('Flushing any pending logs from localStorage...');
    if (get().pendingLogs.length > 0) {
      console.log(`Found ${get().pendingLogs.length} pending logs, flushing to Firestore...`);
      await get().flushPendingLogs();
    }
    
    // Try to load cached logs
    const hasCachedLogs = get().loadCachedLogs();
    
    // Always fetch fresh data to ensure we have all logs from Firestore
    console.log('Fetching fresh data from Firestore to ensure completeness...');
    await get().fetchLogs(true);
    
    // Clean up any duplicates that might exist
    get().removeDuplicates();
    
    console.log('UserLogsStore initialization complete');
  },
  
  // Force sync with Firestore (useful for admin refresh)
  forceSync: async () => {
    console.log('Force syncing - clearing ALL cached data...');
    
    // Clear ALL localStorage data related to logs
    localStorage.removeItem(get().LOGS_CACHE_KEY);
    localStorage.removeItem(get().PENDING_LOGS_KEY);
    
    // Reset ALL state to empty
    set({ 
      logs: [], 
      lastFetched: null,
      pendingLogs: [],
      recentLogHashes: new Set(),
      isFlushingLogs: false,
      error: null
    });
    
    console.log('All cache and state cleared, fetching fresh data from Firestore...');
    
    // Fetch completely fresh data from Firestore
    const result = await get().fetchLogs(true);
    
    console.log('Fresh data fetched:', result);
    
    return result;
  },
  
  // Delete a specific log entry
  deleteLog: async (logId) => {
    try {
      set({ loading: true, error: null });
      
      // Delete from Firestore
      const logDocRef = doc(db, 'userLogs', logId);
      await deleteDoc(logDocRef);
      
      // Remove from local state
      const state = get();
      const updatedLogs = state.logs.filter(log => log.id !== logId);
      
      set({ logs: updatedLogs });
      
      // Update cache
      get().saveCachedLogs();
      
      console.log(`Successfully deleted log: ${logId}`);
      return { success: true };
      
    } catch (error) {
      console.error('Error deleting log:', error);
      const errorMsg = 'Failed to delete log entry';
      set({ error: errorMsg });
      return { success: false, error: errorMsg };
    } finally {
      set({ loading: false });
    }
  },

  // Add log to cache when written directly to Firestore (for real-time updates)
  addLogToCache: (logData) => {
    const state = get();
    
    // Create log entry with Firestore ID
    const logEntry = {
      id: logData.id || `direct_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: logData.userId || 'unknown',
      userName: logData.userName || 'Unknown User',
      userEmail: logData.userEmail || 'unknown@example.com',
      department: logData.department || 'Unknown Department',
      action: logData.action || 'Unknown Action',
      status: logData.status || 'success',
      timestamp: logData.timestamp || new Date().toISOString(),
      createdAt: Date.now()
    };
    
    // Add to beginning of logs array (newest first)
    const newLogs = [logEntry, ...state.logs];
    
    set({ logs: newLogs });
    
    // Update cache
    get().saveCachedLogs();
    
    console.log('🚀 ADDED LOG TO ZUSTAND CACHE - Real-time update without Firestore read!', logEntry.action, 'for', logEntry.userName);
  },

  // Clear all cached data completely (for debugging/admin use)
  clearAllCache: () => {
    console.log('CLEARING ALL CACHE DATA - This will remove all localStorage logs data');
    
    // Clear ALL localStorage data
    localStorage.removeItem(get().PENDING_LOGS_KEY);
    localStorage.removeItem(get().LOGS_CACHE_KEY);
    
    // Reset ALL state
    set({
      logs: [],
      loading: false,
      error: null,
      lastFetched: null,
      pendingLogs: [],
      recentLogHashes: new Set(),
      isFlushingLogs: false
    });
    
    console.log('All cache cleared! Next fetch will be completely fresh from Firestore.');
  },

  // Clear all data (on logout)
  clearData: () => {
    set({
      logs: [],
      loading: false,
      error: null,
      lastFetched: null,
      pendingLogs: [],
      recentLogHashes: new Set(),
      isFlushingLogs: false
    });
    
    // Clear localStorage
    localStorage.removeItem(get().PENDING_LOGS_KEY);
    localStorage.removeItem(get().LOGS_CACHE_KEY);
  }
}));

export default useUserLogsStore;
