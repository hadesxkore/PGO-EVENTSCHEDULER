import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebase';

const publicVapidKey = 'BD3nX9SXZXrI4NDg7Crj95M8Da7hVvANI0Ux0V9164NTBYahxJK_3QQMppCaZCXrSLQyATDQcSTEauU-LuzKWFs';

export async function registerNotifications() {
  try {
    // Check if the browser supports service workers and push notifications
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Push notifications are not supported');
      return false;
    }

    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return false;
    }

    // Register service worker
    let registration;
    try {
      // First, try to get existing registration
      registration = await navigator.serviceWorker.getRegistration();
      
      if (!registration) {
        // If no registration exists, register new service worker
        registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });
        console.log('New Service Worker registered');
      } else {
        console.log('Using existing Service Worker');
      }

      // Wait for the service worker to be ready
      if (registration.installing) {
        console.log('Service Worker installing');
        await new Promise(resolve => {
          registration.installing.addEventListener('statechange', (e) => {
            if (e.target.state === 'activated') {
              console.log('Service Worker activated');
              resolve();
            }
          });
        });
      }

      // Force update the service worker
      await registration.update();
      console.log('Service Worker updated');

      // Unsubscribe from any existing subscriptions
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        await existingSubscription.unsubscribe();
      }

      // Create a new subscription
      const applicationServerKey = urlBase64ToUint8Array(publicVapidKey);
      console.log('Application Server Key:', applicationServerKey);
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      });

      // Get the raw key data
      const rawKey = subscription.getKey ? {
        p256dh: subscription.getKey('p256dh'),
        auth: subscription.getKey('auth')
      } : null;

      // Format the keys properly
      const keys = rawKey ? {
        p256dh: btoa(String.fromCharCode.apply(null, new Uint8Array(rawKey.p256dh))),
        auth: btoa(String.fromCharCode.apply(null, new Uint8Array(rawKey.auth)))
      } : null;

      // Create a properly formatted subscription object
      const formattedSubscription = {
        endpoint: subscription.endpoint,
        keys: keys,
        expirationTime: subscription.expirationTime
      };

      console.log('Formatted subscription:', formattedSubscription);
      return formattedSubscription;
    } catch (error) {
      console.error('Error registering for notifications:', error);
      return false;
    }
  } catch (error) {
    console.error('Error in registerNotifications:', error);
    return false;
  }
}

// Function to convert VAPID key to correct format
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Store subscription in Firestore
export async function saveSubscription(subscription, userId) {
  try {
    // Ensure subscription data is valid
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      throw new Error('Invalid subscription data');
    }

    // Convert subscription object to a Firestore-compatible format
    const subscriptionData = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh || null,
        auth: subscription.keys.auth || null
      },
      userId,
      createdAt: new Date()
    };

    // Log the data being saved
    console.log('Saving subscription data:', subscriptionData);

    // Save to your subscriptions collection in Firestore
    const subscriptionDoc = doc(db, 'push_subscriptions', userId);
    await setDoc(subscriptionDoc, subscriptionData);
    console.log('Subscription saved successfully');
    return true;
  } catch (error) {
    console.error('Error saving subscription:', error);
    console.error('Subscription object:', subscription);
    return false;
  }
}

// Send notification to specific users
export async function sendNotification(userIds, message) {
  try {
    // Get all subscriptions for the specified users
    const subscriptionsSnapshot = await getDocs(
      query(collection(db, 'push_subscriptions'), where('userId', 'in', userIds))
    );

    const notifications = [];
    subscriptionsSnapshot.forEach(doc => {
      const subscription = doc.data();
      notifications.push(
        fetch('/api/notify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subscription: {
              endpoint: subscription.endpoint,
              keys: subscription.keys
            },
            message
          })
        })
      );
    });

    await Promise.all(notifications);
    return true;
  } catch (error) {
    console.error('Error sending notifications:', error);
    return false;
  }
}
