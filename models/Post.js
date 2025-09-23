const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true 
  },
  username: { 
    type: String, 
    required: true, 
    trim: true, 
    index: true 
  },
  content: { 
    type: String, 
    // required: true, 
    trim: true,
    maxLength: 2000 
  },
  image: { 
    type: String, 
    default: '' 
  },
  likes: [{ 
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // username: { type: String, required: true }
  }],
  comments: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Comment' 
  }],
  createdAt: { 
    type: Date, 
    default: Date.now, 
    index: true 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

postSchema.virtual('commentCount').get(function() {
  return this.comments ? this.comments.length : 0;
});

postSchema.virtual('likeCount').get(function() {
  return this.likes ? this.likes.length : 0;
});

postSchema.index({ content: 'text' });
postSchema.index({ createdAt: -1, userId: 1 });

module.exports = mongoose.model('Post', postSchema);