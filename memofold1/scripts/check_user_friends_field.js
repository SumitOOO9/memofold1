require('dotenv').config();
const connectDb = require('../config/db');

async function run() {
  try {
    await connectDb();
    const User = require('../models/user');
    const count = await User.countDocuments({ friends: { $exists: true } });
    console.log('Users with `friends` field present:', count);
    if (count > 0) {
      const samples = await User.find({ friends: { $exists: true } }, { username: 1, friends: 1 }).limit(5).lean();
      console.log('Sample users with `friends` field:');
      console.dir(samples, { depth: 3 });
    }
    process.exit(0);
  } catch (err) {
    console.error('Error checking users:', err);
    process.exit(1);
  }
}

run();
