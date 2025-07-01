const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    realname: { // ✅ Add this field
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
    }

  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);