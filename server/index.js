import express from 'express';
import cors from 'cors';
import webpush from 'web-push';

const app = express();

// Enable CORS
app.use(cors({
  origin: 'http://localhost:5173'
}));

// Parse JSON bodies
app.use(express.json());

// VAPID keys - you'll need to set these as environment variables in production
const publicVapidKey = 'BOpjx_PHy27axBmWt1MrslSk8opTltGDSP-o9vi8w1q987213BRKcFErNAv4cy4HETXePK5VKNM9xqdpkacSzBc';
const privateVapidKey = '2PFJx4cixf_SgHHt3-3wQLQhFbqLcUerC-zyIbRPsJQ';

webpush.setVapidDetails(
  'mailto:eventscheduler@example.com',
  publicVapidKey,
  privateVapidKey
);

// Notification endpoint
app.post('/notify', async (req, res) => {
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
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// Start server
app.listen(5000, () => {
  console.log('Server started on port 5000');
});
