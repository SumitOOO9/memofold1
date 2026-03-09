const NotificationRepository = require('../repositories/notififcationRepository');
const PostRepository = require("../repositories/postRepository");
const redis = require('../utils/cache');
const PushService = require('./pushService');

class NotificationService {

  // Get notifications with cache
  static async getNotification(userId, limit = 10, cursor = null) {
    // const cacheKey = `user:${userId}:notifications`;

    // Try fetching from Redis
    // let notifications = await redis.get(cacheKey);
    // if (notifications) return notifications;
    
    // Fetch from DB
    // // console.log("Fetching notifications from DB for user:", userId);
   const notifications = await NotificationRepository.findByUser(userId, limit, cursor);
    
    // Save in Redis for 1 hour
    // await redis.set(cacheKey, notifications, 3600);

    return notifications;
  }

  // Mark notification as read and invalidate cache
  // static async markAsRead(notificationId, userId) {
  //   const notif = await NotificationRepository.markAsRead(notificationId, userId);

  //   // Invalidate cache
  //   await redis.del(`user:${userId}:notifications`);
  //   return notif;
  // }
    static async markAsRead(notificationIds, userId) {
    const result = await NotificationRepository.markAsRead(notificationIds, userId);
    await redis.del(`user:${userId}:notifications`);
    await redis.del(`user:${userId}:unread_count`);
    return result;
  }

  // Create notification and invalidate cache
  static async createNotification(data) {
    const notif = await NotificationRepository.create(data);
     await PushService.sendToUser(data.receiver, {
    title: data.title || "New Notification",
    body: data.message,
    url: "/notifications",
  });

  // // console.log("Notification created and push sent to user:", data.receiver);

    // Invalidate cache for recipient
    await redis.del(`user:${data.receiver}:notifications`);
    
    return notif;
  }

  // Delete notifications (e.g., friend requests declined)
  static async deleteNotifications(filter) {
    console.log("Deleting notifications with filter:", filter);
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

  static _getUtcDayBounds(date = new Date()) {
    const start = new Date(Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      0,
      0,
      0,
      0
    ));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return { start, end };
  }

  static _buildMemoryMessage(yearsAgo) {
    return `This post was shared ${yearsAgo} yr ago`;
  }

  static async sendMemoryAnniversaryNotificationsForToday(io = null) {
    const runDate = new Date();
    const { start, end } = this._getUtcDayBounds(runDate);
    const posts = await PostRepository.findAnniversaryPostsForDate(runDate);
    let createdCount = 0;

    for (const post of posts) {
      const yearsAgo = runDate.getUTCFullYear() - new Date(post.createdAt).getUTCFullYear();
      if (yearsAgo < 1) continue;

      const message = this._buildMemoryMessage(yearsAgo);

      const alreadySent = await NotificationRepository.existsMemoryNotificationToday(
        post.userId,
        post._id,
        yearsAgo,
        start,
        end
      );
      if (alreadySent) continue;

      const notification = await this.createNotification({
        receiver: post.userId,
        sender: post.userId,
        type: "memory",
        postid: post._id,
        title: `${yearsAgo} yr ago`,
        message,
        metadata: {
          // Keep this field for existing unique index compatibility.
          commentId: `memory:${post._id}:${yearsAgo}`,
          yearsAgo,
          post: {
            id: post._id,
            userId: post.userId,
            username: post.username,
            content: post.content || "",
            image: post.image || "",
            videoUrl: post.videoUrl || "",
            media: post.media || null,
            createdAt: post.createdAt
          }
        }
      });

      if (io) {
        io.to(post.userId.toString()).emit("newNotification", {
          message,
          notification: {
            _id: notification._id,
            type: notification.type,
            postid: notification.postid,
            metadata: notification.metadata,
            createdAt: notification.createdAt
          }
        });
      }

      createdCount += 1;
    }

    return createdCount;
  }

  static startMemoryAnniversaryScheduler(io = null) {
    if (this._memoryScheduler) return;

    const ONE_DAY_MS = 24 * 60 * 60 * 1000;

    this.sendMemoryAnniversaryNotificationsForToday(io).catch((error) => {
      console.error("Memory anniversary notification run failed:", error.message);
    });

    this._memoryScheduler = setInterval(() => {
      this.sendMemoryAnniversaryNotificationsForToday(io).catch((error) => {
        console.error("Memory anniversary notification run failed:", error.message);
      });
    }, ONE_DAY_MS);
  }
}

module.exports = NotificationService;
