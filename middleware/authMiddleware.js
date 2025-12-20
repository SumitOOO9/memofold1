// middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
const User = require("../models/user");

exports.authenticate = async (req, res, next) => {
  const authHeader = req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ msg: "No token, access denied" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("username realname profilePic email");

    if (!user) {
      return res.status(401).json({ msg: "Invalid user" });
    }

    req.user = {
      id: user._id.toString(),
      username: user.username,
      realname: user.realname,
      profilePic: user.profilePic,
      email: user.email,
    };

    // console.log("✅ Authenticated user:", req.user);
    next();
  } catch (err) {
    console.error("JWT verification failed:", err.message);
    res.status(401).json({ msg: "Invalid token" });
  }
};
