const mongoose = require('mongoose');

const friendListSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    friends: [
      {
        _id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        username: { type: String },
        realname: { type: String },
        profilePic: { type: String },
        addedAt: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model('FriendList', friendListSchema);
