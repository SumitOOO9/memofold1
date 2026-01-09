const FriendRepository = require('../repositories/friendRepository');
const redis = require('../utils/cache'); 
const NotificatrionRepository = require('../repositories/notififcationRepository');
const UserRepository = require('../repositories/UserRepository');
const FriendList = require('../models/friendList');
class FriendService {
static async getFriends(userId, limit = 10, cursor = null, search = null) {
  const friendListDoc =
      await FriendRepository.getFriendListByUserId(userId);

    let friendsArr = Array.isArray(friendListDoc?.friends)
      ? [...friendListDoc.friends]
      : [];

    const totalBefore = friendsArr.length;

    // 2. Sort (same logic)
    friendsArr.sort((a, b) =>
      b._id.toString().localeCompare(a._id.toString())
    );

    // 3. Cursor filter (same logic)
    if (cursor) {
      friendsArr = friendsArr.filter(
        f => f._id.toString() < cursor
      );
    }

    // 4. Fetch all user data ONCE (needed for search)
    const allIds = friendsArr.map(f => f._id);

    const allUsers = allIds.length
      ? await UserRepository.findByIds(allIds)
      : [];

    const userMap = new Map();
    allUsers.forEach(u =>
      userMap.set(u._id.toString(), u)
    );

    // 5. Attach temp user data
    friendsArr = friendsArr.map(f => ({
      ...f,
      _userData: userMap.get(f._id.toString())
    }));

    // 6. SEARCH FILTER (NEW)
    if (search) {
      const q = search.toLowerCase();

      friendsArr = friendsArr.filter(f => {
        const u = f._userData;
        return (
          u?.username?.toLowerCase().startsWith(q) ||
          u?.realname?.toLowerCase().startsWith(q)
        );
      });
    }

    const total = friendsArr.length;

    // 7. Pagination (same)
    const paginated = friendsArr.slice(0, limit);

    const nextCursor =
      paginated.length === limit
        ? paginated[paginated.length - 1]._id.toString()
        : null;

    // 8. Final response format (same)
    const friendsList = paginated.map(f => {
      const u = f._userData;

      return {
        id: f._id.toString(),
        username: u?.username || '',
        realname: u?.realname || '',
        profilePic: u?.profilePic || '',
        addedAt: f.addedAt
      };
    });

    return {
      friendsList,
      nextCursor,
      total
    };
}


 static async toggleFriendRequest(senderUserId, receiverUserId, io) {
  if (!senderUserId || !receiverUserId) throw new Error("Sender or receiver ID missing");
  if (senderUserId.toString() === receiverUserId.toString())
    throw new Error("You cannot send a friend request to yourself");

  const receiver = await  UserRepository.findById(receiverUserId);
  const sender = await  UserRepository.findById(senderUserId, "username realname profilePic");
  if (!receiver || !sender) throw new Error("User not found");

  if (!receiver.friendrequests) receiver.friendrequests = [];

  receiver.friendrequests = receiver.friendrequests.filter(
    req => !(req.from?.toString() === senderUserId.toString() && req.status === "declined")
  );

  const existingRequest = receiver.friendrequests.find(
    req => req.from?.toString() === senderUserId.toString() && req.status === "pending"
  );

  if (existingRequest) {
    receiver.friendrequests = receiver.friendrequests.filter(
      req => req.from?.toString() !== senderUserId.toString()
    );
    sender.sentrequests = sender.sentrequests.filter(
      req => req.to?.toString() !== receiverUserId.toString()
    )
    await FriendRepository.saveUser(receiver);
    await FriendRepository.saveUser(sender);
    await FriendRepository.deleteFriendNotifications(senderUserId, receiverUserId);
    await NotificatrionRepository.delete({
      sender: senderUserId,
      receiver: receiverUserId,
      type: "friend_request"
    });

    io.to(receiverUserId.toString()).emit("notificationRemoved", {
      sender: senderUserId,
      type: "friend_request"
    });
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
    // Update FriendList for both users
    console.log("Adding friends to FriendList collections", sender._id, receiver._id);
    await FriendRepository.addFriend(receiver._id, sender._id);
  await FriendRepository.addFriend(sender._id, receiver._id);

    // Do not modify `User.friends` anymore; `FriendList` is authoritative

        receiver.friendrequests.splice(requestIndex, 1);
        if (sentIndex !== -1) sender.sentrequests.splice(sentIndex, 1);
        

    await redis.del(`user:${receiverUserId}:friends`);
    await redis.del(`user:${senderUserId}:friends`);


    // await FriendRepository.saveUser(receiver);
    // await FriendRepository.saveUser(sender);

NotificatrionRepository.delete({  
  sender: senderUserId,
  receiver: receiverUserId,
  type: "friend_request"
}).catch(err => console.error("Notification deletion error:", err));


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

  await FriendRepository.removeFriend(userId, friendId);
  await FriendRepository.removeFriend(friendId, userId);

  // `User.friends` is no longer maintained

await NotificatrionRepository.delete({
  $or: [
    { sender: userId, receiver: friendId },
    { sender: friendId, receiver: userId }
  ]
});

  // Emit real-time update (optional)
  if (io) {
    io.to(userId.toString()).emit("friendRemoved", { friendId });
    io.to(friendId.toString()).emit("friendRemoved", { friendId: userId });
  }

  return { success: true, message: "Friend removed successfully" };
}

static async isFriend(userId, otherUserId) {
  try{
    const friend = await FriendRepository.getfriendBYFriendId(userId, otherUserId);
    if(!friend.friends || friend.friends.length ===0){
      return false;
    }
    return true;
  } catch(err){
    console.error("Error checking friendship status:", err);
    return false;
  }
}


}

module.exports = FriendService;