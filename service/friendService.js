const User = require('../models/user');
const Notification = require('../models/notification');

class FriendService {
  static async toggleFriendRequest(senderUserId, receiverUserId, io) {
    console.log("Service Layer - Toggle Friend Request", senderUserId, receiverUserId);
    if (!senderUserId || !receiverUserId) {
      throw new Error("Sender or receiver ID missing");
    }

    if (senderUserId.toString() === receiverUserId.toString()) {
      throw new Error("You cannot send friend request to yourself");
    }

    const receiver = await User.findById(receiverUserId);
    if (!receiver) {
      throw new Error("User not found");
    }

    // Ensure friendrequests exists
    if (!receiver.friendrequests) {
      receiver.friendrequests = [];
    }

    const existingRequest = receiver.friendrequests.find(
      req => req.from?.toString() === senderUserId.toString() && req.status === "pending"
    );

    if (existingRequest) {
      // Cancel request
      receiver.friendrequests = receiver.friendrequests.filter(
        req => req.from?.toString() !== senderUserId.toString()
      );
      await receiver.save();

      await Notification.deleteMany({
        sender: senderUserId,
        receiver: receiverUserId,
        type: "friend_request",
      });

      return { success: true, message: "Friend request cancelled" };
    }

    // Send new request
    receiver.friendrequests.push({ from: senderUserId, status: "pending" });
    await receiver.save();

    const notification = new Notification({
      receiver: receiverUserId,
      sender: senderUserId,
      type: "friend_request",
    });
    await notification.save();

    io.to(receiverUserId.toString()).emit("newNotification", {
      message: "You have a new friend request",
      notification,
    });

    return { success: true, message: "Friend request sent" };
  }

  static async respondToFriendRequest(receiverUserId, senderUserId, action, io) {
    const receiver = await User.findById(receiverUserId);
    if (!receiver) {
      throw new Error("User not found");
    }

    if (!receiver.friendrequests) {
      receiver.friendrequests = [];
    }

    const request = receiver.friendrequests.find(
      req => req.from?.toString() === senderUserId.toString() && req.status === "pending"
    );
    if (!request) {
      throw new Error("No pending friend request from this user");
    }

    if (action === "accept") {
      request.status = "accepted";

      receiver.friends.addToSet(senderUserId);
      const sender = await User.findById(senderUserId);
      sender.friends.addToSet(receiverUserId);

      await receiver.save();
      await sender.save();

      const notification = new Notification({
        receiver: senderUserId,
        sender: receiverUserId,
        type: "friend_accept",
      });
      await notification.save();

      io.to(senderUserId.toString()).emit("newNotification", {
        message: "Your friend request was accepted",
        notification,
      });

      return { success: true, message: "Friend request accepted" };
    }

    if (action === "decline") {
      request.status = "declined";
      await receiver.save();

      await Notification.deleteMany({
        sender: senderUserId,
        receiver: receiverUserId,
        type: "friend_request",
      });

      return { success: true, message: "Friend request declined" };
    }

    throw new Error("Invalid action");
  }
}

module.exports = FriendService;
