const { StreamChat } = require("stream-chat");
require("dotenv").config();

const apiKey = process.env.STREAM_API_KEY;
const apiSecret = process.env.STREAM_API_SECRET;

if (!apiKey || !apiSecret) console.error("❌ Stream API key or Secret missing");

const streamClient = StreamChat.getInstance(apiKey, apiSecret, { timeout: 10000 });

// Upsert (create/update) a single user
const upsertStreamUser = async (userData) => {
  try {
    if (!userData.id) throw new Error("User ID is required for Stream upsert");
    await streamClient.upsertUsers([userData]);
    // console.log(`✅ Stream user ensured: ${userData.id}`);
    return userData;
  } catch (err) {
    console.error("❌ Error upserting Stream user:", err.message);
    throw err;
  }
};

// Generate token for a user
const generateStreamToken = (userId) => {
  try {
    if (!userId) throw new Error("User ID is required to generate Stream token");
    return streamClient.createToken(userId.toString());
  } catch (err) {
    console.error("❌ Error generating Stream token:", err.message);
    throw err;
  }
};

// Ensure multiple users exist

const ensureStreamUsersExist = async (users) => {
  try {
    if (!Array.isArray(users) || !users.length) throw new Error("No users provided");
    await upsertStreamUsersBulk(users);
  } catch (err) {
    console.error("❌ Error ensuring users exist:", err.message);
    throw err;
  }
};


// Bulk upsert (create/update) multiple users at once
const upsertStreamUsersBulk = async (usersArray) => {
  try {
    if (!Array.isArray(usersArray) || !usersArray.length) throw new Error("No users provided for bulk upsert");
    await streamClient.upsertUsers(usersArray);
    return usersArray;
  } catch (err) {
    console.error("❌ Error in bulk upserting Stream users:", err.message);
    throw err;
  }
};

module.exports = { upsertStreamUser, generateStreamToken, ensureStreamUsersExist, upsertStreamUsersBulk };
