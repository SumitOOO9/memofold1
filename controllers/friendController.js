const FriendService = require("../service/friendService");

exports.toggleFriendRequest = async (req, res) => {
  try {
    const result = await FriendService.toggleFriendRequest(req.user.id, req.params.reciverUserId, req.io);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.respondToRequest = async (req, res) => {
  try {
    const { action } = req.body; 
    const result = await FriendService.respondToFriendRequest(req.user.id, req.params.reciverUserId, action, req.io);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.removeFriend = async (req, res) => {
  try {
    const userId = req.user.id;
    const friendId = req.params.friendId;
    const result = await FriendService.removeFriend(userId, friendId, req.io);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getFriendsList = async (req,res) =>{
  try{
     const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;
    const cursor = req.query.cursor || null;
    const search = req.query.search || null;

     const {friendsList, nextCursor, total} = await FriendService.getFriends(userId, limit, cursor, search);
     res.json({success:true, friends: friendsList, nextCursor, total})

  } catch(error){
    res.status(500).json({success:false, message: error.message})
  }
}

exports.isFriend = async (req, res) => {
  try{
    const userId = req.user.id;
    const otherUserId = req.params.otherUserId;
    const status = await FriendService.getRelationshipStatus(userId, otherUserId);
    res.status(200).json({success:true, ...status});
  } catch(err){
    res.status(500).json({success:false, message: err.message});
  }
}