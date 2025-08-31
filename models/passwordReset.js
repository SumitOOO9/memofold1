const mongoose = require("mongoose");

const PasswordResetSchema = new mongoose.Schema({
 email: {
    type: String,
    required: true,
    lowercase: true
  },
  code: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    default: Date.now,
    expires: 600 // 10 minutes in seconds
  }
}, { timestamps: true })


module.exports = mongoose.model("PasswordReset", PasswordResetSchema);
