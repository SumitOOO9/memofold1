// lib/stream.js
const { StreamChat } = require("stream-chat");
require("dotenv").config();

const apiKey = process.env.STREAM_API_KEY;
const apiSecret = process.env.STREAM_API_SECRET;

if (!apiKey || !apiSecret) {
  console.error("❌ Stream API key or Secret is missing");
}

const streamClient = StreamChat.getInstance(apiKey, apiSecret);

/**
 * Upsert (create/update) user in Stream
 */
const upsertStreamUser = async (userData) => {
  try {
    await streamClient.upsertUsers([userData]);
    return userData;
  } catch (error) {
    console.error("❌ Error upserting Stream user:", error);
  }
};

/**
 * Generate Stream token for a specific userId
 */
const generateStreamToken = (userId) => {
  try {
    return streamClient.createToken(userId.toString());
  } catch (error) {
    console.error("❌ Error generating Stream token:", error);
  }
};

module.exports = { upsertStreamUser, generateStreamToken };
