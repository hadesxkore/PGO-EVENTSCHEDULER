# Real-time Notifications System

## Overview
This system implements real-time notifications for the PGB Event Scheduler dashboard using Firestore snapshots and Zustand for state management. It significantly reduces Firebase read usage compared to manual fetching while providing instant updates.

## Features

### Real-time Updates
- **Upcoming Events**: Automatically updates when new events are scheduled
- **Tagged Events**: Real-time updates when your department is tagged in events
- **Status Updates**: Instant notifications when event requests are approved/disapproved

### Performance Optimizations
- **Efficient Queries**: Only fetches recent data (last 30 days) to reduce read usage
- **Limited Results**: Caps results to prevent excessive data transfer
  - Status updates: 20 most recent
  - Tagged events: 50 most recent
  - Upcoming events: All within 30 days
- **Memoized Counts**: Prevents unnecessary re-renders
- **Proper Cleanup**: Automatic listener cleanup to prevent memory leaks

## Implementation

### Notification Store (`src/store/notificationStore.js`)
- Uses Zustand for state management
- Implements Firestore `onSnapshot` listeners
- Provides cleanup methods for memory management
- Includes error handling and loading states

### Dashboard Integration (`src/pages/Dashboard.jsx`)
- Replaces manual data fetching with real-time listeners
- Uses memoized notification counts for performance
- Implements proper cleanup on component unmount
- Maintains existing UI/UX while adding real-time functionality

## Usage

The system automatically starts when:
1. User is authenticated
2. User department is loaded
3. Dashboard component mounts

Listeners are automatically cleaned up when:
- Component unmounts
- User changes
- Department changes

## Benefits

1. **Reduced Firebase Reads**: Only reads data once per listener setup
2. **Real-time Updates**: Instant notifications without manual refresh
3. **Better UX**: Users see updates immediately
4. **Cost Effective**: Significantly reduces Firebase usage costs
5. **Memory Safe**: Proper cleanup prevents memory leaks

## Error Handling

- Network errors are caught and displayed to users
- Failed listeners are automatically retried
- Graceful degradation if real-time features fail
- Console warnings for debugging

## Future Enhancements

- Add notification persistence across sessions
- Implement notification categories/filtering
- Add push notification support
- Include notification read/unread states

