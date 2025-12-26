const webpush = require("web-push");
const PushSubscription = require("../models/PushSubscription");

webpush.setVapidDetails(
  "mailto:support@yourapp.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

class PushService {
  static async sendToUser(userId, payload) {
    const subs = await PushSubscription.find({ userId });
   // console(`Found ${subs.length} subscriptions for user:`, userId);
    // Send notification to each subscription
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          sub.subscription,
          JSON.stringify(payload)
        );
       // console("Notification sent to user:", userId);  
      } catch (err) {
        // Subscription expired → remove it
        if (err.statusCode === 410 || err.statusCode === 404) {
          await PushSubscription.deleteOne({ _id: sub._id });
        }
      }
    }
  }
}

module.exports = PushService;
