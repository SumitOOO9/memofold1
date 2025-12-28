const FriendRepository = require('../repositories/friendRepository');
const redis = require('../utils/cache'); 
const NotificatrionRepository = require('../repositories/notififcationRepository');
const UserRepository = require('../repositories/UserRepository');
const FriendList = require('../models/friendList');
class FriendService {
static async getFriends(userId, limit = 10, cursor = null) {
  // const cacheKey = `user:${userId}:friends:${limit}:${cursor || 'first'}`;

  const friendListDoc = await FriendRepository.getFriendListByUserId(userId);

  let friendsArr = Array.isArray(friendListDoc?.friends)
    ? [...friendListDoc.friends]
    : [];
    const total = friendsArr.length;

  console.log(`Total friends before pagination:`, total);

friendsArr.sort((a, b) =>
  b._id.toString().localeCompare(a._id.toString())
);


  console.log(`Total friends after sorting:`, friendsArr.length);

if (cursor) {
  friendsArr = friendsArr.filter(
    f => f._id.toString() < cursor
  );
}



  const paginated = friendsArr.slice(0, limit);
  const nextCursor =
  paginated.length === limit
    ? paginated[paginated.length - 1]._id.toString()
    : null;



  const friendIds = paginated.map(f => f._id);
  console.log(`Fetching user details for friend IDs:`, friendIds);

  const users = friendIds.length
    ? await UserRepository.findByIds(friendIds)
    : [];

  const userMap = new Map();
  users.forEach(u => userMap.set(u._id.toString(), u));

  const friendsList = paginated.map(f => {
    const uid = f._id.toString();
    const u = userMap.get(uid);

    return {
      id: uid,
      username: u?.username || '',
      realname: u?.realname || '',
      profilePic: u?.profilePic || '',
      addedAt: f.addedAt
    };
  });

  // await redis.set(
  //   cacheKey,
  //   JSON.stringify({
  //     friendsList,
  //     nextCursor,
  //     total: friendsArr.length
  //   }),
  //   'EX',
  //   6000
  // );

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
    await FriendList.findOneAndUpdate(
      { user: receiver._id },
      { $addToSet: { friends: { friendId: sender._id, addedAt: new Date() } } },
      { upsert: true }
    );

    await FriendList.findOneAndUpdate(
      { user: sender._id },
      { $addToSet: { friends: { friendId: receiver._id, addedAt: new Date() } } },
      { upsert: true }
    );

    // Do not modify `User.friends` anymore; `FriendList` is authoritative

        receiver.friendrequests.splice(requestIndex, 1);
        if (sentIndex !== -1) sender.sentrequests.splice(sentIndex, 1);
        

    await redis.del(`user:${receiverUserId}:friends`);
    await redis.del(`user:${senderUserId}:friends`);


    await FriendRepository.saveUser(receiver);
    await FriendRepository.saveUser(sender);

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

  const user = await  UserRepository.findById(userId);
  const friend = await  UserRepository.findById(friendId);

  if (!user || !friend) throw new Error("User not found");

  // Remove friend from FriendList collection
  await FriendList.findOneAndUpdate({ user: userId }, { $pull: { friends: { friendId: friendId } } });
  await FriendList.findOneAndUpdate({ user: friendId }, { $pull: { friends: { friendId: userId } } });

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
