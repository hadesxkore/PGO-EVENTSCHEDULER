import { describe, it, expect, beforeEach, vi } from 'vitest';
import useNotificationStore from '../notificationStore';

// Mock Firebase
vi.mock('@/lib/firebase/firebase', () => ({
  db: {}
}));

// Mock Firebase Firestore functions
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  onSnapshot: vi.fn(),
  Timestamp: {
    now: vi.fn(() => ({ seconds: Date.now() / 1000 })),
    fromDate: vi.fn((date) => ({ seconds: date.getTime() / 1000 }))
  },
  limit: vi.fn()
}));

describe('NotificationStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useNotificationStore.getState().reset();
  });

  it('should initialize with empty state', () => {
    const state = useNotificationStore.getState();
    
    expect(state.upcomingEvents).toEqual([]);
    expect(state.taggedEvents).toEqual([]);
    expect(state.statusUpdates).toEqual([]);
    expect(state.loading).toBe(false);
    expect(state.error).toBe(null);
    expect(state.listeners).toEqual({});
  });

  it('should get notification counts correctly', () => {
    const { getNotificationCounts } = useNotificationStore.getState();
    
    // Set some mock data
    useNotificationStore.setState({
      upcomingEvents: [{ id: '1', title: 'Event 1' }],
      taggedEvents: [{ id: '2', title: 'Event 2' }],
      statusUpdates: [{ id: '3', title: 'Event 3' }]
    });

    const counts = getNotificationCounts();
    
    expect(counts.upcoming).toBe(1);
    expect(counts.tagged).toBe(1);
    expect(counts.status).toBe(1);
    expect(counts.total).toBe(3);
  });

  it('should get all notifications correctly', () => {
    const { getAllNotifications } = useNotificationStore.getState();
    
    // Set some mock data
    useNotificationStore.setState({
      upcomingEvents: [{ id: '1', title: 'Event 1' }],
      taggedEvents: [{ id: '2', title: 'Event 2' }],
      statusUpdates: [{ id: '3', title: 'Event 3' }]
    });

    const notifications = getAllNotifications();
    
    expect(notifications.upcoming).toHaveLength(1);
    expect(notifications.tagged).toHaveLength(1);
    expect(notifications.status).toHaveLength(1);
  });

  it('should clear error correctly', () => {
    const { clearError } = useNotificationStore.getState();
    
    // Set error
    useNotificationStore.setState({ error: 'Test error' });
    expect(useNotificationStore.getState().error).toBe('Test error');
    
    // Clear error
    clearError();
    expect(useNotificationStore.getState().error).toBe(null);
  });

  it('should check if listeners are active', () => {
    const { hasActiveListeners } = useNotificationStore.getState();
    
    // Initially no listeners
    expect(hasActiveListeners()).toBe(false);
    
    // Add mock listeners
    useNotificationStore.setState({
      listeners: {
        upcoming: vi.fn(),
        status: vi.fn(),
        tagged: vi.fn()
      }
    });
    
    expect(hasActiveListeners()).toBe(true);
  });

  it('should reset store correctly', () => {
    const { reset } = useNotificationStore.getState();
    
    // Set some data
    useNotificationStore.setState({
      upcomingEvents: [{ id: '1' }],
      taggedEvents: [{ id: '2' }],
      statusUpdates: [{ id: '3' }],
      loading: true,
      error: 'Test error',
      listeners: { test: vi.fn() }
    });
    
    // Reset
    reset();
    
    const state = useNotificationStore.getState();
    expect(state.upcomingEvents).toEqual([]);
    expect(state.taggedEvents).toEqual([]);
    expect(state.statusUpdates).toEqual([]);
    expect(state.loading).toBe(false);
    expect(state.error).toBe(null);
    expect(state.listeners).toEqual({});
  });
});

