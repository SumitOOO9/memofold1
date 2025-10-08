// controllers/getStreamToken.js
const { generateStreamToken, upsertStreamUser } = require("../lib/stream");

async function getStreamToken(req, res) {
  try {
    // 🛡️ Ensure user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized: User ID not found" });
    }

    const userId = req.user.id.toString();

    // 🧑 Upsert user in Stream
    await upsertStreamUser({
      id: userId,
      name: req.user.name || req.user.username || `User-${userId}`,
      image: req.user.profilePic || null,
    });

    // 🔑 Generate token for the same user ID
    const token = generateStreamToken(userId);

    res.status(200).json({ token, userId });
  } catch (error) {
    console.error("❌ Error in getStreamToken controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

module.exports = { getStreamToken };
