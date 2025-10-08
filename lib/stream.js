const { StreamChat } = require("stream-chat");
require("dotenv").config();

const apiKey = process.env.STREAM_API_KEY;
const apiSecret = process.env.STREAM_API_SECRET;

if (!apiKey || !apiSecret) console.error("❌ Stream API key or Secret missing");

const streamClient = StreamChat.getInstance(apiKey, apiSecret);

// Upsert (create/update) user in Stream
const upsertStreamUser = async (userData) => {
  try {
    await streamClient.upsertUsers([userData]);
    console.log(`✅ Stream user ensured: ${userData.id}`);
    return userData;
  } catch (error) {
    console.error("❌ Error upserting Stream user:", error.message);
  }
};

// Generate token for a specific userId
const generateStreamToken = (userId) => {
  try {
    return streamClient.createToken(userId.toString());
  } catch (error) {
    console.error("❌ Error generating Stream token:", error.message);
  }
};

// Ensure multiple users exist
const ensureStreamUsersExist = async (users) => {
  try {
    for (const user of users) {
      await upsertStreamUser(user);
    }
  } catch (err) {
    console.error("❌ Error ensuring users exist:", err.message);
  }
};

module.exports = { upsertStreamUser, generateStreamToken, streamClient, ensureStreamUsersExist };
