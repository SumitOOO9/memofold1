const { StreamChat } = require("stream-chat");
require("dotenv").config();

const apiKey = process.env.STREAM_API_KEY;
const apiSecret = process.env.STREAM_API_SECRET;

if (!apiKey || !apiSecret) {
  console.error("❌ Stream API key or Secret is missing");
}

// Server-side client (admin permissions)
const streamClient = StreamChat.getInstance(apiKey, apiSecret);

// ✅ Upsert (create) user in Stream only if not exists
const upsertStreamUser = async (userData) => {
  try {
    // Check if user already exists
    const existing = await streamClient.queryUsers({ id: userData.id });
    if (existing.users.length === 0) {
      await streamClient.upsertUsers([userData]);
      console.log(`✅ Stream user created: ${userData.id}`);
    } else {
      console.log(`ℹ Stream user already exists: ${userData.id}`);
    }
    return userData;
  } catch (error) {
    console.error("❌ Error upserting Stream user:", error.message);
  }
};

// ✅ Generate Stream token for a specific userId
const generateStreamToken = (userId) => {
  try {
    return streamClient.createToken(userId.toString());
  } catch (error) {
    console.error("❌ Error generating Stream token:", error.message);
  }
};

module.exports = { upsertStreamUser, generateStreamToken, streamClient };
