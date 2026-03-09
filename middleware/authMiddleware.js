const jwt = require("jsonwebtoken");
const User = require("../models/user");

exports.authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.sendStatus(401);

  const token = authHeader.split(" ")[1];
  try {
    const accessSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
    if (!accessSecret) return res.status(500).json({ msg: "JWT secret is not configured" });
    const decoded = jwt.verify(token, accessSecret);
    const user = await User.findById(decoded.id).select("username email realname");
    if (!user) return res.status(401).json({ msg: "Invalid user" });


   req.user = {
      id: user._id.toString(),
      username: user.username,
      realname: user.realname,
      profilePic: user.profilePic,
      email: user.email,
    };
    return next();
  } catch {
    return res.status(401).json({ msg: "Invalid token" });
  }
};
