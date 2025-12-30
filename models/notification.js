const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    type: {
        type: String,
        enum: ['like', 'reply', 'comment', 'friend_request', 'friend_accept', 'comment_like', 'reply_like'],
        required: true
    },
    postid: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
    },
    read: {
        type: Boolean,
        default: false
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
    }
}, { timestamps: true });


notificationSchema.index(
  { sender: 1, receiver: 1, type: 1, "metadata.commentId": 1 },
  { unique: true }
);

module.exports = mongoose.model('Notification', notificationSchema);