import { useEffect, useRef, useCallback } from 'react';
import useMessageStore from '@/store/messageStore';

// Custom hook to manage message subscriptions
export const useMessageSubscriptions = () => {
  const {
    currentUser,
    subscribeToLastMessages,
    subscribeToMessages,
    loadMessages
  } = useMessageStore();
  
  const subscriptions = useRef(new Map());

  // Subscribe to last messages for all chats
  useEffect(() => {
    if (!currentUser?.email) return;

    const unsubscribe = subscribeToLastMessages(currentUser.email);
    if (unsubscribe) {
      subscriptions.current.set('lastMessages', unsubscribe);
    }

    return () => {
      const unsub = subscriptions.current.get('lastMessages');
      if (unsub) {
        unsub();
        subscriptions.current.delete('lastMessages');
      }
    };
  }, [currentUser?.email, subscribeToLastMessages]);

  // Subscribe to specific chat messages
  const subscribeToChat = useCallback((chatId) => {
    if (!chatId) return null;

    // Load messages from cache first, then subscribe
    loadMessages(chatId).then(() => {
      const unsubscribe = subscribeToMessages(chatId);
      if (unsubscribe) {
        subscriptions.current.set(`chat_${chatId}`, unsubscribe);
      }
    });

    return () => {
      const unsub = subscriptions.current.get(`chat_${chatId}`);
      if (unsub) {
        unsub();
        subscriptions.current.delete(`chat_${chatId}`);
      }
    };
  }, [loadMessages, subscribeToMessages]);

  // Cleanup all subscriptions
  const cleanup = useCallback(() => {
    subscriptions.current.forEach(unsubscribe => {
      if (unsubscribe) unsubscribe();
    });
    subscriptions.current.clear();
  }, []);

  return {
    subscribeToChat,
    cleanup
  };
};
