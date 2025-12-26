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
  videoUrl:{
    type: String,
    default: ''
  },
  media: {
  url: String,
  publicId: String,
  type: { type: String, enum: ["image", "video"] }
},
  likes: [{ 
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // username: { type: String, required: true }
  }],
  comments: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Comment' 
  }],
    commentCount: { type: Number, default: 0 },
  likeCount: { type: Number, default: 0 },
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

// postSchema.virtual('commentCount').get(function() {
//   return this.comments ? this.comments.length : 0;
// });

// postSchema.virtual('likeCount').get(function() {
//   return this.likes ? this.likes.length : 0;
// });

postSchema.index({ content: 'text' });
postSchema.index({ createdAt: -1, userId: 1 });
postSchema.index({ createdAt: -1, _id: -1 });
postSchema.index({ username: 1, createdAt: -1 });


module.exports = mongoose.model('Post', postSchema);