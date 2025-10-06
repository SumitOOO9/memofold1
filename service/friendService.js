const FriendRepository = require('../repositories/friendRepository');
const redis = require('../utils/cache'); 
const NotificatrionRepository = require('../repositories/notififcationRepository');
const UserRepository = require('../repositories/UserRepository');
class FriendService {
static async getFriends(userId, limit = 10, cursor = null) {
  const cacheKey = `user:${userId}:friends:${limit}:${cursor || 'first'}`;
  let cached = await redis.get(cacheKey);
  if (cached) {
      return cached;
    }

  const user = await UserRepository.findById(userId);
  let friends = user.friends || [];
  console.log("friends", friends);
  friends.sort((a, b) => b._id.toString().localeCompare(a._id.toString()));

  if (cursor) {
    const cursorIndex = friends.findIndex(f => f._id.toString() === cursor);
    if (cursorIndex >= 0) {
      friends = friends.slice(cursorIndex + 1);
    }
  }
  console.log("paginated friends", friends);
  const paginated = friends.slice(0, limit);
  const nextCursor = paginated.length > 0 ? paginated[paginated.length - 1]._id : null;

  await redis.set(cacheKey, JSON.stringify({ friendsList: paginated, nextCursor, total: friends.length }), 'EX', 6000);

  return { friendsList: paginated, nextCursor, total: friends.length };
}

 static async toggleFriendRequest(senderUserId, receiverUserId, io) {
  if (!senderUserId || !receiverUserId) throw new Error("Sender or receiver ID missing");
  if (senderUserId.toString() === receiverUserId.toString())
    throw new Error("You cannot send a friend request to yourself");

  const receiver = await  UserRepository.findById(receiverUserId);
  const sender = await  UserRepository.findById(senderUserId, "username realname profilePic");
  if (!receiver || !sender) throw new Error("User not found");

  if (!receiver.friendrequests) receiver.friendrequests = [];

  // Remove any old declined requests from the same sender
  receiver.friendrequests = receiver.friendrequests.filter(
    req => !(req.from?.toString() === senderUserId.toString() && req.status === "declined")
  );

  const existingRequest = receiver.friendrequests.find(
    req => req.from?.toString() === senderUserId.toString() && req.status === "pending"
  );

  if (existingRequest) {
    // Cancel pending request
    receiver.friendrequests = receiver.friendrequests.filter(
      req => req.from?.toString() !== senderUserId.toString()
    );
    await FriendRepository.saveUser(receiver);
    await FriendRepository.deleteFriendNotifications(senderUserId, receiverUserId);

    return { success: true, message: "Friend request cancelled" };
  }

  // Add new friend request
  receiver.friendrequests.push({
    from: senderUserId,
    status: "pending",
    username: sender.username,
    realname: sender.realname,
    profilePic: sender.profilePic
  });

    sender.sentrequests.push({
    to: receiverUserId,
    username: receiver.username,
    realname: receiver.realname,
    profilePic: receiver.profilePic
  });

  await FriendRepository.saveUser(receiver);
  await FriendRepository.saveUser(sender);


  const notification = await NotificatrionRepository.create({
    sender: senderUserId,
    receiver: receiverUserId,
    type: "friend_request",
    metadata: {
      username: sender.username,
      realname: sender.realname,
      profilePic: sender.profilePic
    }
  });

  io.to(receiverUserId.toString()).emit("newNotification", {
    message: "You have a new friend request",
    notification
  });

  return { success: true, message: "Friend request sent" };
}


 static async respondToFriendRequest(receiverUserId, senderUserId, action, io) {
  const receiver = await  UserRepository.findById(receiverUserId);
  const sender = await  UserRepository.findById(senderUserId);
  if (!receiver || !sender) throw new Error("User not found");

  if (!receiver.friendrequests) receiver.friendrequests = [];

  const requestIndex = receiver.friendrequests.findIndex(
    req => req.from?.toString() === senderUserId.toString() && req.status === "pending"
  );
    const sentIndex = sender.sentrequests.findIndex(r => r.to?.toString() === receiverUserId.toString());

  if (requestIndex === -1) throw new Error("No pending friend request from this user");

  const request = receiver.friendrequests[requestIndex];

  if (action === "accept") {
    // Add each other as friends
    receiver.friends.addToSet({
      _id: sender._id,
      username: sender.username,
      profilePic: sender.profilePic,
      realname: sender.realname
    });
    sender.friends.addToSet({
      _id: receiver._id,
      username: receiver.username,
      profilePic: receiver.profilePic,
      realname: receiver.realname
    });

    // Remove the friend request from receiver
    receiver.friendrequests.splice(requestIndex, 1);
        if (sentIndex !== -1) sender.sentrequests.splice(sentIndex, 1);

    // set the redish so that new updated friend can be fetched
    await redis.del(`user:${receiverUserId}:friends`);
    await redis.del(`user:${senderUserId}:friends`);


    await FriendRepository.saveUser(receiver);
    await FriendRepository.saveUser(sender);

    const notification = await NotificatrionRepository.create({
      receiver: senderUserId,
      sender: receiverUserId,
      type: "friend_accept"
    });

    io.to(senderUserId.toString()).emit("newNotification", {
      message: "Your friend request was accepted",
      notification
    });

    return { success: true, message: "Friend request accepted" };
  }

  if (action === "decline") {
    receiver.friendrequests.splice(requestIndex, 1);
        if (sentIndex !== -1) sender.sentrequests.splice(sentIndex, 1);

    await FriendRepository.saveUser(receiver);

    await NotificatrionRepository.delete(senderUserId, receiverUserId);

    return { success: true, message: "Friend request declined" };
  }

  throw new Error("Invalid action");
}

static async removeFriend(userId, friendId, io) {
  if (!userId || !friendId) throw new Error("User ID or Friend ID missing");
  if (userId.toString() === friendId.toString())
    throw new Error("Cannot remove yourself");

  const user = await  UserRepository.findById(userId);
  const friend = await  UserRepository.findById(friendId);

  if (!user || !friend) throw new Error("User not found");

  // Remove friend from both sides
  user.friends = user.friends.filter(f => f._id.toString() !== friendId.toString());
  friend.friends = friend.friends.filter(f => f._id.toString() !== userId.toString());

  await FriendRepository.saveUser(user);
  await FriendRepository.saveUser(friend);

  // Optional: remove related notifications
  await NotificatrionRepository.delete(userId, friendId);

  // Emit real-time update (optional)
  if (io) {
    io.to(userId.toString()).emit("friendRemoved", { friendId });
    io.to(friendId.toString()).emit("friendRemoved", { friendId: userId });
  }

  return { success: true, message: "Friend removed successfully" };
}


}

module.exports = FriendService;
