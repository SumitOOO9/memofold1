const { generateStreamToken, upsertStreamUser } = require("../lib/stream");

const getStreamToken = async (req, res) => {
  try {
    if (!req.user || !req.user.id) return res.status(401).json({ message: "Unauthorized: User ID not found" });

    const userId = req.user.id.toString();

    // Ensure the logged-in user exists
    await upsertStreamUser({
      id: userId,
      name: req.user.name || req.user.username || `User-${userId}`,
      image: req.user.profilePic || null,
    });

    const token = generateStreamToken(userId);
    res.status(200).json({ token, userId });
  } catch (err) {
    console.error("❌ getStreamToken error:", err.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = { getStreamToken };
