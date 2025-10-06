const NotificationRepository = require('../repositories/notififcationRepository');
const redis = require('../utils/cache');

class NotificationService {

  // Get notifications with cache
  static async getNotification(userId, limit = 10, cursor = null) {
    // const cacheKey = `user:${userId}:notifications`;

    // Try fetching from Redis
    // let notifications = await redis.get(cacheKey);
    // if (notifications) return notifications;
    
    // Fetch from DB
    console.log("Fetching notifications from DB for user:", userId);
   const notifications = await NotificationRepository.findByUser(userId, limit, cursor);
    
    // Save in Redis for 1 hour
    // await redis.set(cacheKey, notifications, 3600);

    return notifications;
  }

  // Mark notification as read and invalidate cache
  static async markAsRead(notificationId, userId) {
    const notif = await NotificationRepository.markAsRead(notificationId, userId);

    // Invalidate cache
    await redis.del(`user:${userId}:notifications`);
    return notif;
  }

  // Create notification and invalidate cache
  static async createNotification(data) {
    const notif = await NotificationRepository.create(data);

    // Invalidate cache for recipient
    await redis.del(`user:${data.receiver}:notifications`);
    return notif;
  }

  // Delete notifications (e.g., friend requests declined)
  static async deleteNotifications(filter) {
    const result = await NotificationRepository.delete(filter);
    if (filter.receiver) {
      await redis.del(`user:${filter.receiver}:notifications`);
    }
    return result;
  }
    static async getUnreadCount(userId) {
    const cacheKey = `user:${userId}:unread_count`;
    let count = await redis.get(cacheKey);

    if (count !== null) return parseInt(count);

    count = await NotificationRepository.countUnreadByUser(userId);

    await redis.set(cacheKey, count, 300);

    return count;
  }
}

module.exports = NotificationService;
