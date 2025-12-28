// controllers/streamController.js
// Sync all users' profilePic to Stream

const User = require('../models/user');
const { upsertStreamUsersBulk } = require('../lib/stream');

async function syncAllProfilePics(req, res) {
  try {
    const users = await User.find({ profilePic: { $exists: true, $ne: '' } })
      .select('_id realname username profilePic')
      .lean();
    // Prepare user data for bulk upsert
    const userDataArray = users.map(user => ({
      id: user._id.toString(),
      name: user.realname || user.username,
      image: user.profilePic || null,
      role: 'user',
    }));

    // Respond to UI immediately
    res.json({ success: true, syncing: true, total: userDataArray.length });

    // Sync in background in batches
    const BATCH_SIZE = 1000;
    (async () => {
      for (let i = 0; i < userDataArray.length; i += BATCH_SIZE) {
        const batch = userDataArray.slice(i, i + BATCH_SIZE);
        try {
          await upsertStreamUsersBulk(batch);
        } catch (err) {
          console.error(`❌ Error syncing batch [${i}-${i + batch.length - 1}]:`, err.message);
        }
      }
    })();
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { syncAllProfilePics };