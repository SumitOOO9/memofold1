const mongoose = require("mongoose");

// Check if model already exists
if (mongoose.models.User) {
  module.exports = mongoose.models.User;
} else {
  const userSchema = new mongoose.Schema(
    {
      realname: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
      },
      username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
      },
      password: {
        type: String,
        required: true,
        minlength: 6,
      },
      profilePic: {
        type: String,
        default: "",
      },
      discription: {
        type: String,
        default: "",
        trim: true,
      },
    },
    { timestamps: true }
  );

  module.exports = mongoose.model("User", userSchema);
}