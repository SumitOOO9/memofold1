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
        enum: ['like', 'comment', 'friend_request', 'friend_accept'],
        required: true
    },
    postid: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
    },
    read: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);