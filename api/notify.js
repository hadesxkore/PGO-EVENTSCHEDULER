import webpush from 'web-push';

// VAPID keys - you'll need to set these as environment variables in Vercel
const publicVapidKey = process.env.PUBLIC_VAPID_KEY || 'BOpjx_PHy27axBmWt1MrslSk8opTltGDSP-o9vi8w1q987213BRKcFErNAv4cy4HETXePK5VKNM9xqdpkacSzBc';
const privateVapidKey = process.env.PRIVATE_VAPID_KEY || '2PFJx4cixf_SgHHt3-3wQLQhFbqLcUerC-zyIbRPsJQ';

webpush.setVapidDetails(
  'mailto:eventscheduler@example.com',
  publicVapidKey,
  privateVapidKey
);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { subscription, message } = req.body;

    if (!subscription || !message) {
      return res.status(400).json({ error: 'Missing subscription or message' });
    }

    // Validate subscription
    if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return res.status(400).json({ error: 'Invalid subscription data' });
    }

    const messageData = JSON.parse(message);

    await webpush.sendNotification(subscription, JSON.stringify(messageData));

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
}
