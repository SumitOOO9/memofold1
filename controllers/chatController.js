const { generateStreamToken, upsertStreamUser } = require("../lib/stream");

const getStreamToken = async (req, res) => {
  try {
    if (!req.user || !req.user.id)
      return res.status(401).json({ message: "Unauthorized: User ID not found" });

    const userId = req.user.id.toString();

    // Ensure logged-in user exists in Stream
    await upsertStreamUser({
      id: userId,
      name: req.user.realname || req.user.username || `User-${userId}`,
      image: req.user.profilePic || null,
      role: "user",
    });

    const token = generateStreamToken(userId);
    res.status(200).json({ token, userId });
  } catch (err) {
    console.error("❌ getStreamToken error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = { getStreamToken };
