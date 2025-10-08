const { ensureStreamUsersExist } = require("../lib/stream");

const ensureUsersExist = async (req, res) => {
  try {
    const { users } = req.body;
    if (!users || !users.length) return res.status(400).json({ message: "No users provided" });

    await ensureStreamUsersExist(users);

    res.status(200).json({ message: "Users ensured in Stream" });
  } catch (err) {
    console.error("❌ Error ensuring users exist:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { ensureUsersExist };
