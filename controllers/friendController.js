const FriendService = require("../service/friendService");

exports.toggleFriendRequest = async (req, res) => {
  try {
    console.log("Toggle Friend Request Called", req.params.reciverUserId, req.user.id);
    const result = await FriendService.toggleFriendRequest(req.user.id, req.params.reciverUserId, req.io);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.respondToRequest = async (req, res) => {
  try {
    const { action } = req.body; // "accept" or "decline"
    console.log("Respond to Friend Request Called", req.params.reciverUserId, req.user.id, action, req.body);
    const result = await FriendService.respondToFriendRequest(req.user.id, req.params.reciverUserId, action, req.io);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
