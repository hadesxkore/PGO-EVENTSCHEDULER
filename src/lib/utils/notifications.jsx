import { doc, setDoc, collection } from 'firebase/firestore';
import { db } from '../firebase/firebase';

const publicVapidKey = 'BOpjx_PHy27axBmWt1MrslSk8opTltGDSP-o9vi8w1q987213BRKcFErNAv4cy4HETXePK5VKNM9xqdpkacSzBc';

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

export async function registerNotifications() {
  try {
    console.log('Registering service worker...');
    
    // Check if service worker is supported
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker not supported');
    }

    // Check if Push API is supported
    if (!('PushManager' in window)) {
      throw new Error('Push API not supported');
    }

    // Wait for service worker installation
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker registered');

    // Wait for the service worker to be ready
    await navigator.serviceWorker.ready;

    // Get existing subscription
    let subscription = await registration.pushManager.getSubscription();

    // If no subscription exists, create one
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
      });
      console.log('Created new push subscription:', subscription);
    } else {
      console.log('Using existing push subscription:', subscription);
    }

    return subscription;
  } catch (error) {
    console.error('Error registering for notifications:', error);
    throw error;
  }
}

export async function saveSubscription(subscription, userId) {
  try {
    if (!subscription || !subscription.endpoint) {
      throw new Error('Invalid subscription data');
    }

    // Extract keys from the subscription
    const { endpoint } = subscription;
    const p256dh = subscription.getKey ? btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('p256dh')))) : null;
    const auth = subscription.getKey ? btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('auth')))) : null;

    // Save to Firestore
    const subscriptionRef = doc(collection(db, 'push_subscriptions'), userId);
    await setDoc(subscriptionRef, {
      endpoint,
      keys: {
        p256dh,
        auth
      },
      userId,
      timestamp: new Date().toISOString()
    });

    console.log('Subscription saved successfully');
  } catch (error) {
    console.error('Error saving subscription:', error);
    throw error;
  }
}