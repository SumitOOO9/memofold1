// scripts/syncAllProfilePicsToStream.js
// Run this script to sync all users' profilePic to Stream

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user');
const { upsertStreamUser } = require('../lib/stream');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/yourdbname';

async function syncAllProfilePics() {
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');

  const users = await User.find({ profilePic: { $exists: true, $ne: '' } });
  console.log(`Found ${users.length} users with profilePic`);

  let success = 0, fail = 0;
  for (const user of users) {
    try {
      await upsertStreamUser({
        id: user._id.toString(),
        name: user.realname || user.username,
        image: user.profilePic || null,
        role: 'user',
      });
      success++;
      console.log(`✅ Synced: ${user.username} (${user._id})`);
    } catch (err) {
      fail++;
      console.error(`❌ Failed: ${user.username} (${user._id}) - ${err.message}`);
    }
  }
  console.log(`Done. Success: ${success}, Failed: ${fail}`);
  await mongoose.disconnect();
}

syncAllProfilePics().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
