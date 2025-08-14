const mongoose = require("mongoose");

const profileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required'],
    unique: true,
    immutable: true,
    validate: {
      validator: async function(userId) {
        if (!mongoose.Types.ObjectId.isValid(userId)) return false;
        const user = await mongoose.model('User').findById(userId);
        return user !== null;
      },
      message: 'User does not exist'
    }
  },
  description: {
    type: String,
    default: "",
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  }
}, { 
  timestamps: true,
  optimisticConcurrency: true 
});

profileSchema.index({ user: 1 }, { unique: true });

profileSchema.pre('save', async function(next) {
  if (this.isNew) {
    const userExists = await mongoose.model('User').exists({ _id: this.user });
    if (!userExists) {
      throw new Error('Referenced user does not exist');
    }
  }
  next();
});

module.exports = mongoose.models.Profile || mongoose.model("Profile", profileSchema);