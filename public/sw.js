// Service Worker for Push Notifications
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting(); // Activate worker immediately
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(clients.claim()); // Take control immediately
});

self.addEventListener('push', async (event) => {
  console.log('Push event received');

  try {
    // Parse the notification data
    const data = JSON.parse(event.data.text());
    console.log('Notification data:', data);

    // Show the notification
    await self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      vibrate: [200, 100, 200],
      tag: data.data?.event?.id || new Date().getTime(),
      renotify: true,
      requireInteraction: true,
      silent: false,
      actions: [
        {
          action: 'view',
          title: 'View Details'
        },
        {
          action: 'close',
          title: 'Close'
        }
      ],
      data: data.data
    });

    console.log('Notification shown successfully');
  } catch (error) {
    console.error('Error in push event:', error);
    
    // Show fallback notification if something goes wrong
    await self.registration.showNotification('New Event Notification', {
      body: event.data ? event.data.text() : 'You have a new event notification',
      icon: '/images/bataanlogo.png',
      requireInteraction: true,
      silent: false
    });
  }
});

self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);

  // Close the notification
  event.notification.close();

  // Handle action buttons
  if (event.action === 'view') {
    // Open or focus the app window
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // If a window is already open, focus it
          for (const client of clientList) {
            if (client.url === '/' && 'focus' in client) {
              return client.focus();
            }
          }
          // If no window is open, open a new one
          if (clients.openWindow) {
            return clients.openWindow('/');
          }
        })
    );
  }
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
});