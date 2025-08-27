import webpush from 'web-push';

// VAPID keys
const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_KEY || 'BOpjx_PHy27axBmWt1MrslSk8opTltGDSP-o9vi8w1q987213BRKcFErNAv4cy4HETXePK5VKNM9xqdpkacSzBc';
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || '2PFJx4cixf_SgHHt3-3wQLQhFbqLcUerC-zyIbRPsJQ';

webpush.setVapidDetails(
  'mailto:eventscheduler@example.com',
  publicVapidKey,
  privateVapidKey
);

export default async function handler(req, res) {
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
    const { subscription, message } = req.body;

    // Log the received data
    console.log('Received subscription:', subscription);
    console.log('Received message:', message);

    if (!subscription || !message) {
      return res.status(400).json({ error: 'Missing subscription or message' });
    }

    // Validate subscription
    if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return res.status(400).json({ error: 'Invalid subscription data' });
    }

    // Send notification
    await webpush.sendNotification(subscription, message);
    console.log('Notification sent successfully');

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ error: 'Failed to send notification', details: error.message });
  }
}
