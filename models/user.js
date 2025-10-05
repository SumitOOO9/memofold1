const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    realname: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    username: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },
    profilePic: {
      type: String,
      default: "",
    },
  friends: [
  {
    _id: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // reference to the User
    username: { type: String },
    realname: { type: String },
    profilePic: { type: String }
  }
],

    friendrequests: {
      type:[
        {
          from: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
                username: { type: String },     // snapshot
      realname: { type: String },     // snapshot
      profilePic: { type: String },
          status: {type: String, enum: ['pending', 'accepted', 'decline'], default: 'pending'},
          createdAt: {type: Date, default: Date.now}
        }
      ],
      default: []
    },
    sentrequests: [
  {
    to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
    username: String,
    realname: String,
    profilePic: String
  }
]

  },
  { timestamps: true }
);

userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({realname:1});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (password) {
    return bcrypt.compare(password, this.password)
}


module.exports = mongoose.model("User", userSchema);
