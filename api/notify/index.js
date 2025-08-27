import webpush from 'web-push';

function initializeWebPush() {
  const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_KEY;
  const privateVapidKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicVapidKey || !privateVapidKey) {
    throw new Error('VAPID keys are not set in environment variables');
  }

  try {
    webpush.setVapidDetails(
      'mailto:pgoevenscheduler@gmail.com', // Update this with your email
      publicVapidKey,
      privateVapidKey
    );
    console.log('Web Push initialized successfully');
  } catch (error) {
    console.error('Error setting VAPID details:', error);
    throw new Error('Failed to initialize web push: ' + error.message);
  }
}

export default async function handler(req, res) {
  try {
    // Initialize web push for each request
    initializeWebPush();
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', 'https://pgo-eventscheduler.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Initialize web push for each request
    initializeWebPush();

    // Parse request body
    let subscription, message;
    try {
      ({ subscription, message } = req.body);
    } catch (error) {
      console.error('Error parsing request body:', error);
      return res.status(400).json({ error: 'Invalid request body format' });
    }

    // Log the received data
    console.log('Received request body:', { subscription, message });

    if (!subscription || !message) {
      console.error('Missing subscription or message in request body');
      return res.status(400).json({ error: 'Missing subscription or message' });
    }

    // Validate subscription
    if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      console.error('Invalid subscription data:', subscription);
      return res.status(400).json({ error: 'Invalid subscription data' });
    }

    // Prepare notification payload
    let notificationPayload;
    
    try {
      // If message is already a string, try to parse it as JSON
      if (typeof message === 'string') {
        try {
          notificationPayload = JSON.parse(message);
        } catch {
          // If parsing fails, create a basic notification structure
          notificationPayload = {
            title: 'New Notification',
            body: message
          };
        }
      } else {
        // If message is an object, use it directly
        notificationPayload = message;
      }

      // Ensure required fields exist
      notificationPayload = {
        title: notificationPayload.title || 'New Notification',
        body: notificationPayload.body || String(message),
        icon: notificationPayload.icon || '/images/bataanlogo.png',
        badge: notificationPayload.badge || '/images/bataanlogo.png',
        tag: notificationPayload.tag || 'default',
        data: {
          url: 'https://pgo-eventscheduler.vercel.app',
          ...notificationPayload.data
        }
      };

      console.log('Prepared notification payload:', notificationPayload);
    } catch (error) {
      console.error('Error preparing notification payload:', error);
      return res.status(400).json({ error: 'Invalid notification payload format' });
    }

    try {
      // Convert final payload to string
      const payloadString = JSON.stringify(notificationPayload);
      
      // Send notification
      await webpush.sendNotification(subscription, payloadString);
      console.log('Notification sent successfully');

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error sending notification:', error);
      // Check for specific error types
      if (error.statusCode === 410) {
        return res.status(410).json({ error: 'Subscription has expired or is no longer valid' });
      } else if (error.statusCode === 404) {
        return res.status(404).json({ error: 'Push subscription not found' });
      } else if (error.statusCode === 400) {
        return res.status(400).json({ error: 'Invalid push subscription' });
      }
      throw error; // Re-throw for general error handling
    }
  } catch (error) {
    console.error('Unhandled error:', error);
    return res.status(500).json({ 
      error: 'Failed to send notification', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
