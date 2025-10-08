const { StreamChat } = require("stream-chat");
require("dotenv").config();

const apiKey = process.env.STREAM_API_KEY;
const apiSecret = process.env.STREAM_API_SECRET;

if (!apiKey || !apiSecret) console.error("❌ Stream API key or Secret missing");

const streamClient = StreamChat.getInstance(apiKey, apiSecret);

// Upsert (create/update) a single user
const upsertStreamUser = async (userData) => {
  try {
    await streamClient.upsertUsers([userData]);
    console.log(`✅ Stream user ensured: ${userData.id}`);
    return userData;
  } catch (err) {
    console.error("❌ Error upserting Stream user:", err.message);
    throw err;
  }
};

// Generate token for a user
const generateStreamToken = (userId) => {
  try {
    return streamClient.createToken(userId.toString());
  } catch (err) {
    console.error("❌ Error generating Stream token:", err.message);
    throw err;
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
    throw err;
  }
};

module.exports = { upsertStreamUser, generateStreamToken, ensureStreamUsersExist };
