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

// Static method to safely update or create profile
profileSchema.statics.updateOrCreate = async function(userId, description) {
  return this.findOneAndUpdate(
    { user: userId },
    { description },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true
    }
  );
};

// Create the model
const Profile = mongoose.model('Profile', profileSchema);

module.exports = Profile;