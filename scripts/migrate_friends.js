require('dotenv').config();
const connectDb = require('../config/db');
const User = require('../models/user');
const FriendList = require('../models/friendList');

async function migrate() {
  try {
    await connectDb();

    console.log('Fetching users...');
    const users = await User.find({}, 'friends username realname profilePic').lean();

    let processed = 0;
    for (const user of users) {
      const userId = user._id;
      const friends = (user.friends || []).map(f => ({
        _id: f._id,
        username: f.username || '',
        realname: f.realname || '',
        profilePic: f.profilePic || '',
        addedAt: f.addedAt ? new Date(f.addedAt) : new Date()
      }));

      // Upsert the FriendList document for the user
      await FriendList.findOneAndUpdate(
        { user: userId },
        { $set: { friends } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      // Also ensure symmetry: add this user into each friend's FriendList if missing
      for (const f of friends) {
        if (!f._id) continue;
        await FriendList.findOneAndUpdate(
          { user: f._id },
          { $addToSet: { friends: { _id: userId, username: user.username || '', realname: user.realname || '', profilePic: user.profilePic || '', addedAt: new Date() } } },
          { upsert: true }
        );
      }

      processed++;
      if (processed % 100 === 0) console.log(`Processed ${processed}/${users.length} users`);
    }

    console.log(`Migration complete. Processed ${processed} users.`);
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

migrate();
