// Service Worker installation
self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  // Skip waiting to activate immediately
  event.waitUntil(self.skipWaiting());
});

// Service Worker activation
self.addEventListener('activate', event => {
  console.log('Service Worker activated');
  // Take control of all pages immediately
  event.waitUntil(clients.claim());
});

// Handle push notifications
self.addEventListener('push', event => {
  try {
    console.log('Push event received:', event.data.text());
    const data = JSON.parse(event.data.text());
    console.log('Parsed notification data:', data);

    const options = {
      body: data.body,
      icon: data.icon || '/images/bataanlogo.png',
      badge: data.badge || '/images/bataanlogo.png',
      vibrate: [100, 50, 100],
      tag: data.tag || 'default',
      renotify: true,
      requireInteraction: true,
      silent: false,
      timestamp: data.timestamp ? new Date(data.timestamp).getTime() : Date.now(),
      data: {
        ...data.data,
        url: data.data?.url || (self.registration.scope.includes('localhost') 
          ? 'http://localhost:5173'
          : 'https://pgo-eventscheduler.vercel.app'),
        event: data.data?.event || null
      },
      actions: [
        {
          action: 'view',
          title: 'View Details'
        },
        {
          action: 'close',
          title: 'Close'
        }
      ]
    };

    console.log('Showing notification with options:', options);
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  } catch (error) {
    console.error('Error showing notification:', error);
    // Show a basic notification if JSON parsing fails
    event.waitUntil(
      self.registration.showNotification('New Notification', {
        body: event.data.text(),
        icon: '/images/bataanlogo.png',
        requireInteraction: true
      })
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  console.log('Notification clicked:', event);
  event.notification.close();

  if (event.action === 'view' || !event.action) {
    // Get the notification data
    const data = event.notification.data;
    const baseUrl = data?.url || '/';
    const eventData = data?.event;
    
    // If we have event data, construct URL to show event details
    const url = eventData ? `${baseUrl}/dashboard?event=${eventData.id}` : baseUrl;

    // Focus existing window or open new one
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(windowClients => {
          // Check if there is already a window/tab open with the target URL
          for (var i = 0; i < windowClients.length; i++) {
            var client = windowClients[i];
            if (client.url === url && 'focus' in client) {
              return client.focus();
            }
          }
          // If no window/tab is open, open a new one
          if (clients.openWindow) {
            return clients.openWindow(url);
          }
        })
    );
  }
});

// Handle notification close
self.addEventListener('notificationclose', event => {
  console.log('Notification closed', event.notification);
});